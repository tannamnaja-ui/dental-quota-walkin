const { readConfig } = require('./dbConfig');

let _pool = null;

function getHisPool() {
  if (_pool) return _pool;

  const config = readConfig();
  if (!config) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล');

  if (config.type === 'mysql') {
    const mysql = require('mysql2/promise');
    _pool = mysql.createPool({
      host:            config.host,
      port:            parseInt(config.port),
      database:        config.database,
      user:            config.user,
      password:        config.password || '',
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
    });
    _pool._type = 'mysql';
  } else {
    const { Pool } = require('pg');
    const pg = new Pool({
      host:                    config.host,
      port:                    parseInt(config.port),
      database:                config.database,
      user:                    config.user,
      password:                config.password || '',
      max:                     10,
      idleTimeoutMillis:       60000,
      connectionTimeoutMillis: 5000,
    });
    pg.on('error', err => console.error('[HIS Pool] Error:', err.message));
    pg._type = 'postgresql';
    _pool = pg;
  }

  return _pool;
}

function resetHisPool() {
  if (_pool) {
    try { _pool.end(); } catch {}
    _pool = null;
  }
}

// wrapper ให้ใช้งานคล้าย pool.query เดิม
async function hisQuery(sql, params = []) {
  const pool = getHisPool();
  if (pool._type === 'mysql') {
    const [rows] = await pool.query(sql.replace(/\$(\d+)/g, '?'), params);
    return rows;
  } else {
    const res = await pool.query(sql, params);
    return res.rows;
  }
}

module.exports = { hisQuery, resetHisPool };
