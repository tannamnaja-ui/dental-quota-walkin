const pool      = require('../config/database');
const { hisQuery } = require('../config/hisPool');

// GET /api/doctors
const getAllDoctors = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT doctor_id, doctor_name, specialty
       FROM dent_doctors WHERE is_active = TRUE ORDER BY doctor_name ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// GET /api/doctors/positions
const getPositions = async (req, res, next) => {
  try {
    const rows = await hisQuery(
      `SELECT id AS position_id, name AS position_name FROM doctor_position ORDER BY name`
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/doctors/his?position_ids=1,2,3
const getHisDoctors = async (req, res, next) => {
  const { position_id, position_ids } = req.query;
  const raw = position_ids || position_id;
  if (!raw) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุ position_id หรือ position_ids' });
  }
  const ids = raw.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
  if (ids.length === 0) {
    return res.status(400).json({ success: false, message: 'position_id ไม่ถูกต้อง' });
  }

  try {
    const rows = await hisQuery(
      `SELECT d.code AS doctor_code, d.name AS doctor_name,
              g.name AS specialty, g.dttm_group_id AS specialty_id
       FROM doctor d
       LEFT JOIN dttm_group g ON d.sub_spclty_id = g.dttm_group_id
       WHERE d.position_id = ANY($1::int[]) AND d.active = 'Y'
       ORDER BY d.name`,
      [ids]
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/doctors/specialties
const getSpecialties = async (req, res, next) => {
  try {
    const rows = await hisQuery(
      `SELECT dttm_group_id, name FROM dttm_group
       WHERE name IS NOT NULL AND name <> '' ORDER BY name`
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

module.exports = { getAllDoctors, getPositions, getHisDoctors, getSpecialties };
