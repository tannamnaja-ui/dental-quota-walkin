const pool = require('../config/database');

// GET /api/quota?date=YYYY-MM-DD
// ดึงโควตาของแพทย์ทุกคน (LEFT JOIN เพื่อแสดงแพทย์ที่ยังไม่ตั้งค่าด้วย)
// หากไม่ระบุ date จะใช้วันปัจจุบัน
const getQuota = async (req, res, next) => {
  const { date } = req.query;

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)' });
  }

  try {
    const result = await pool.query(
      `SELECT
         d.doctor_id,
         d.doctor_name,
         d.specialty,
         q.quota_id,
         COALESCE(q.max_walkin_quota,     0) AS max_walkin_quota,
         COALESCE(q.current_walkin_count, 0) AS current_walkin_count,
         q.updated_at
       FROM dent_doctors d
       LEFT JOIN dent_daily_quota q
         ON d.doctor_id = q.doctor_id
        AND q.quota_date = $1::DATE
       WHERE d.is_active = TRUE
       ORDER BY d.doctor_name ASC`,
      [date || 'now()']
    );

    return res.json({
      success: true,
      date: date || new Date().toISOString().split('T')[0],
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/quota/setup
// ตั้งค่าหรืออัปเดต Max Quota ของแพทย์ในวันที่กำหนด (UPSERT)
// เจ้าหน้าที่สามารถเรียกซ้ำได้ตลอดเวลาเพื่ออัปเดตโควตาระหว่างวัน
const upsertQuota = async (req, res, next) => {
  const { doctor_id, quota_date, max_walkin_quota } = req.body;

  if (!doctor_id || max_walkin_quota === undefined || max_walkin_quota === null) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุ doctor_id และ max_walkin_quota' });
  }

  const maxVal = parseInt(max_walkin_quota);
  if (isNaN(maxVal) || maxVal < 0) {
    return res.status(400).json({ success: false, message: 'max_walkin_quota ต้องเป็นตัวเลข ≥ 0' });
  }

  if (quota_date && !/^\d{4}-\d{2}-\d{2}$/.test(quota_date)) {
    return res.status(400).json({ success: false, message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)' });
  }

  try {
    const date = quota_date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO dent_daily_quota (quota_date, doctor_id, max_walkin_quota, current_walkin_count)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (quota_date, doctor_id)
       DO UPDATE SET
         max_walkin_quota = EXCLUDED.max_walkin_quota,
         updated_at       = CURRENT_TIMESTAMP
       RETURNING *`,
      [date, doctor_id, maxVal]
    );

    return res.json({
      success: true,
      message: 'ตั้งค่าโควตาสำเร็จ',
      data: result.rows[0],
    });
  } catch (err) {
    // Foreign key violation = doctor_id ไม่มีในระบบ
    if (err.code === '23503') {
      return res.status(400).json({ success: false, message: 'ไม่พบรหัสแพทย์นี้ในระบบ' });
    }
    next(err);
  }
};

// POST /api/quota/setup-bulk
// บันทึกโควตาหลายรายการพร้อมกัน พร้อม UPSERT dent_doctors เพื่อ sync ข้อมูลจาก HIS
const bulkUpsertQuota = async (req, res, next) => {
  const { quota_date, items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุรายการ items' });
  }

  if (quota_date && !/^\d{4}-\d{2}-\d{2}$/.test(quota_date)) {
    return res.status(400).json({ success: false, message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)' });
  }

  const date   = quota_date || new Date().toISOString().split('T')[0];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let saved = 0;
    for (const item of items) {
      const { doctor_id, doctor_name, specialty, max_walkin_quota } = item;
      const maxVal = parseInt(max_walkin_quota);
      if (!doctor_id || isNaN(maxVal) || maxVal < 0) continue;

      // Sync แพทย์เข้า dent_doctors
      await client.query(
        `INSERT INTO dent_doctors (doctor_id, doctor_name, specialty, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (doctor_id)
         DO UPDATE SET
           doctor_name = EXCLUDED.doctor_name,
           specialty   = EXCLUDED.specialty,
           is_active   = TRUE`,
        [doctor_id, doctor_name, specialty || null]
      );

      // Upsert quota
      await client.query(
        `INSERT INTO dent_daily_quota (quota_date, doctor_id, max_walkin_quota, current_walkin_count)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (quota_date, doctor_id)
         DO UPDATE SET
           max_walkin_quota = EXCLUDED.max_walkin_quota,
           updated_at       = CURRENT_TIMESTAMP`,
        [date, doctor_id, maxVal]
      );

      saved++;
    }

    await client.query('COMMIT');
    return res.json({ success: true, message: `บันทึกโควตาสำเร็จ ${saved} รายการ`, saved });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// POST /api/quota/:id/use — ใช้โควตา 1 (race-condition safe)
const useQuota = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE dent_daily_quota
       SET current_walkin_count = current_walkin_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE quota_id = $1
         AND current_walkin_count < max_walkin_quota
       RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, code: 'QUOTA_FULL', message: 'โควตาเต็มแล้ว' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/quota/:id — ลบโควตาตาม quota_id
const deleteQuota = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM dent_daily_quota WHERE quota_id = $1 RETURNING quota_id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการโควตานี้' });
    }
    return res.json({ success: true, message: 'ลบโควตาสำเร็จ' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/quota/:id — แก้ไข max_walkin_quota ของ record นั้น
const updateQuota = async (req, res, next) => {
  const { id } = req.params;
  const { max_walkin_quota } = req.body;
  const maxVal = parseInt(max_walkin_quota);
  if (isNaN(maxVal) || maxVal < 0) {
    return res.status(400).json({ success: false, message: 'max_walkin_quota ต้องเป็นตัวเลข ≥ 0' });
  }
  try {
    const result = await pool.query(
      `UPDATE dent_daily_quota
       SET max_walkin_quota = $1, updated_at = CURRENT_TIMESTAMP
       WHERE quota_id = $2
       RETURNING *`,
      [maxVal, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการโควตานี้' });
    }
    return res.json({ success: true, message: 'อัปเดตโควตาสำเร็จ', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getQuota, upsertQuota, bulkUpsertQuota, useQuota, deleteQuota, updateQuota };
