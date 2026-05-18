const pool = require('../config/database');

// POST /api/walkin/register
// ลงทะเบียนคนไข้ Walk-in พร้อม Transaction เพื่อป้องกัน Race Condition
const registerWalkin = async (req, res, next) => {
  const { hn, doctor_id, chief_complaint } = req.body;

  if (!hn || !doctor_id) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุ HN และ doctor_id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ใช้ WHERE ... AND current_walkin_count < max_walkin_quota เพื่อป้องกัน Race Condition
    // หากมี 2 request พร้อมกัน request ที่สองจะได้ 0 rows และถูกปฏิเสธ
    const updateResult = await client.query(
      `UPDATE dent_daily_quota
       SET current_walkin_count = current_walkin_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE doctor_id = $1
         AND quota_date = CURRENT_DATE
         AND current_walkin_count < max_walkin_quota
       RETURNING quota_id, current_walkin_count, max_walkin_quota`,
      [doctor_id]
    );

    // 0 rows = โควตาเต็มหรือยังไม่ตั้งค่าโควตา
    if (updateResult.rowCount === 0) {
      const checkResult = await client.query(
        `SELECT current_walkin_count, max_walkin_quota
         FROM dent_daily_quota
         WHERE doctor_id = $1 AND quota_date = CURRENT_DATE`,
        [doctor_id]
      );

      await client.query('ROLLBACK');

      if (checkResult.rowCount === 0) {
        return res.status(400).json({
          success: false,
          code: 'NO_QUOTA_CONFIG',
          message: 'ยังไม่มีการตั้งค่าโควตาของแพทย์ท่านนี้สำหรับวันนี้',
        });
      }

      const { current_walkin_count, max_walkin_quota } = checkResult.rows[0];
      return res.status(400).json({
        success: false,
        code: 'QUOTA_FULL',
        message: `โควตา Walk-in เต็มแล้ว (${current_walkin_count}/${max_walkin_quota})`,
      });
    }

    // สร้างหมายเลขคิวของวันนี้ เช่น D001, D002, ...
    const countResult = await client.query(
      `SELECT COUNT(*) AS cnt FROM dent_walkin_queue WHERE queue_date = CURRENT_DATE`
    );
    const queueNumber = `D${String(parseInt(countResult.rows[0].cnt) + 1).padStart(3, '0')}`;

    const insertResult = await client.query(
      `INSERT INTO dent_walkin_queue
         (queue_date, queue_number, hn, doctor_id, chief_complaint, queue_status)
       VALUES (CURRENT_DATE, $1, $2, $3, $4, 'Waiting')
       RETURNING *`,
      [queueNumber, hn.trim(), doctor_id, chief_complaint?.trim() || null]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'ลงทะเบียน Walk-in สำเร็จ',
      data: {
        queue: insertResult.rows[0],
        quota: updateResult.rows[0],
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/walkin/queue
// ดึงรายการคิว Walk-in ของวันนี้ทั้งหมด
const getTodayQueue = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT q.*, d.doctor_name, d.specialty
       FROM dent_walkin_queue q
       LEFT JOIN dent_doctors d ON q.doctor_id = d.doctor_id
       WHERE q.queue_date = CURRENT_DATE
       ORDER BY q.registered_time ASC`
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// PUT /api/walkin/queue/:queueId/status
// เปลี่ยนสถานะคิว — หากเปลี่ยนเป็น Cancelled จะคืนโควตาให้แพทย์โดยอัตโนมัติ
const updateQueueStatus = async (req, res, next) => {
  const { queueId } = req.params;
  const { status } = req.body;
  const VALID_STATUSES = ['Waiting', 'In-Progress', 'Completed', 'Cancelled'];

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `SELECT * FROM dent_walkin_queue WHERE queue_id = $1`,
      [queueId]
    );

    if (currentResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลคิว' });
    }

    const queue = currentResult.rows[0];

    // ไม่อนุญาตให้แก้ไขคิวที่เสร็จสิ้นหรือยกเลิกไปแล้ว
    if (['Completed', 'Cancelled'].includes(queue.queue_status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถเปลี่ยนสถานะคิวที่เสร็จสิ้นหรือยกเลิกแล้วได้',
      });
    }

    await client.query(
      `UPDATE dent_walkin_queue
       SET queue_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE queue_id = $2`,
      [status, queueId]
    );

    // คืนโควตาเฉพาะเมื่อเปลี่ยนสถานะเป็น Cancelled เท่านั้น
    if (status === 'Cancelled') {
      await client.query(
        `UPDATE dent_daily_quota
         SET current_walkin_count = GREATEST(current_walkin_count - 1, 0),
             updated_at = CURRENT_TIMESTAMP
         WHERE doctor_id = $1 AND quota_date = $2`,
        [queue.doctor_id, queue.queue_date]
      );
    }

    await client.query('COMMIT');

    return res.json({ success: true, message: 'อัปเดตสถานะคิวสำเร็จ' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { registerWalkin, getTodayQueue, updateQueueStatus };
