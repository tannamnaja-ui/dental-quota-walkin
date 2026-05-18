const { readConfig, writeConfig } = require('../config/dbConfig');
const { withHisConnection }       = require('../config/hisDb');
const pool                        = require('../config/database');
const { resetPool }               = require('../config/database');
const { resetHisPool }            = require('../config/hisPool');
const setupDb                     = require('../config/setupDb');

// GET /api/config/db
// ดึง config ปัจจุบัน (mask password)
const getConfig = (req, res) => {
  const config = readConfig();
  if (!config) return res.json({ success: true, configured: false, data: null });

  return res.json({
    success: true,
    configured: true,
    data: { ...config },
  });
};

// POST /api/config/db/test
// ทดสอบการเชื่อมต่อโดยไม่บันทึก
const testConnection = async (req, res) => {
  const { type, host, port, database, user, password } = req.body;

  if (!type || !host || !port || !database || !user) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
  }

  // ถ้า password เป็น *** ให้ใช้ password ที่บันทึกไว้
  const stored  = readConfig();
  const actualPw = (password && password !== '***') ? password : (stored?.password || '');

  const overrideConfig = { type, host, port, database, user, password: actualPw };

  try {
    await withHisConnection(async (conn, dbType) => {
      if (dbType === 'mysql') {
        await conn.query('SELECT 1');
      } else {
        await conn.query('SELECT 1');
      }
    }, overrideConfig);

    return res.json({ success: true, message: `เชื่อมต่อ ${type === 'mysql' ? 'MySQL' : 'PostgreSQL'} สำเร็จ!` });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: `เชื่อมต่อไม่สำเร็จ: ${err.message}`,
    });
  }
};

// POST /api/config/db/save
// บันทึก config ลงไฟล์
const saveConfig = (req, res) => {
  const { type, host, port, database, user, password } = req.body;

  if (!type || !host || !port || !database || !user) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
  }

  const stored = readConfig() || {};
  // ถ้า password เป็น *** หรือว่าง ให้ใช้ค่าเดิม
  const actualPw = (password && password !== '***') ? password : (stored.password || '');

  writeConfig({
    type,
    host,
    port: parseInt(port),
    database,
    user,
    password: actualPw,
  });

  // reset ทั้งสอง pool และสร้างตาราง
  resetPool();
  resetHisPool();
  setupDb().catch(() => {});

  return res.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ' });
};

// GET /api/config/db/tables — ตรวจสอบว่า dent_* tables มีในฐานข้อมูลหรือยัง
const REQUIRED_TABLES = ['dent_doctors', 'dent_daily_quota', 'dent_walkin_queue'];

const checkTables = async (req, res, next) => {
  try {
    const results = await Promise.all(
      REQUIRED_TABLES.map(async (tbl) => {
        const r = await pool.query(
          `SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = $1`,
          [tbl]
        );
        return { table: tbl, exists: r.rows.length > 0 };
      })
    );
    return res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};

// POST /api/config/db/table/:name — สร้างตารางที่ระบุ
const TABLE_SQL = {
  dent_doctors: `
    CREATE TABLE IF NOT EXISTS dent_doctors (
      doctor_id   VARCHAR(50)  PRIMARY KEY,
      doctor_name VARCHAR(255) NOT NULL,
      specialty   VARCHAR(255),
      is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  dent_daily_quota: `
    CREATE TABLE IF NOT EXISTS dent_daily_quota (
      quota_id              SERIAL       PRIMARY KEY,
      quota_date            DATE         NOT NULL,
      doctor_id             VARCHAR(50)  NOT NULL REFERENCES dent_doctors(doctor_id),
      max_walkin_quota      INTEGER      NOT NULL DEFAULT 0,
      current_walkin_count  INTEGER      NOT NULL DEFAULT 0,
      updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(quota_date, doctor_id)
    )`,
  dent_walkin_queue: `
    CREATE TABLE IF NOT EXISTS dent_walkin_queue (
      queue_id        SERIAL       PRIMARY KEY,
      queue_date      DATE         NOT NULL DEFAULT CURRENT_DATE,
      queue_number    VARCHAR(20)  NOT NULL,
      doctor_id       VARCHAR(50)  NOT NULL REFERENCES dent_doctors(doctor_id),
      hn              VARCHAR(50)  NOT NULL,
      chief_complaint VARCHAR(500),
      queue_status    VARCHAR(20)  NOT NULL DEFAULT 'Waiting',
      registered_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(queue_date, queue_number)
    )`,
};

const createTable = async (req, res, next) => {
  const { name } = req.params;
  const sql = TABLE_SQL[name];
  if (!sql) {
    return res.status(400).json({ success: false, message: `ไม่รู้จักตาราง "${name}"` });
  }
  try {
    await pool.query(sql);
    return res.json({ success: true, message: `สร้างตาราง ${name} สำเร็จ` });
  } catch (err) {
    next(err);
  }
};

module.exports = { getConfig, testConnection, saveConfig, checkTables, createTable };
