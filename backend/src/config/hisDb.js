const { readConfig } = require('./dbConfig');

// สร้าง connection เดี่ยว (ไม่ใช้ pool) เหมาะสำหรับ login ที่เรียกไม่บ่อย
async function createHisConnection(overrideConfig = null) {
  const config = overrideConfig || readConfig();
  if (!config) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล');

  const connCfg = {
    host:     config.host,
    port:     parseInt(config.port),
    database: config.database,
    user:     config.user,
    password: config.password || '',
  };

  if (config.type === 'mysql') {
    const mysql = require('mysql2/promise');
    const conn  = await mysql.createConnection(connCfg);
    return { conn, type: 'mysql' };
  } else {
    const { Client } = require('pg');
    const client = new Client(connCfg);
    await client.connect();
    return { conn: client, type: 'postgresql' };
  }
}

// Helper: query แล้ว close อัตโนมัติ
async function withHisConnection(fn, overrideConfig = null) {
  const { conn, type } = await createHisConnection(overrideConfig);
  try {
    return await fn(conn, type);
  } finally {
    try { await conn.end(); } catch {}
  }
}

module.exports = { withHisConnection };
