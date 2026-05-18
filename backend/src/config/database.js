const { Pool } = require('pg');
const { readConfig } = require('./dbConfig');

let _pool = null;

function getPool() {
  if (_pool) return _pool;

  const config = readConfig();
  if (!config) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล');
  if (config.type === 'mysql') throw new Error('ระบบนี้รองรับเฉพาะ PostgreSQL');

  _pool = new Pool({
    host:                    config.host,
    port:                    parseInt(config.port),
    database:                config.database,
    user:                    config.user,
    password:                config.password || '',
    max:                     20,
    idleTimeoutMillis:       30000,
    connectionTimeoutMillis: 5000,
  });

  _pool.on('error', (err) => {
    console.error('[DB Pool] Unexpected error:', err.message);
  });

  return _pool;
}

function resetPool() {
  if (_pool) {
    _pool.end().catch(() => {});
    _pool = null;
  }
}

const pool = {
  query:   (...args) => getPool().query(...args),
  connect: ()        => getPool().connect(),
};

module.exports = pool;
module.exports.resetPool = resetPool;
