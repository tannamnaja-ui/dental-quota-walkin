const pool = require('./database');

async function setupDb() {
  try {
    // dent_doctors — sync จาก HIS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dent_doctors (
        doctor_id   VARCHAR(50)  PRIMARY KEY,
        doctor_name VARCHAR(255) NOT NULL,
        specialty   VARCHAR(255),
        is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // dent_daily_quota — โควตารายวันแยกรายแพทย์
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dent_daily_quota (
        quota_id              SERIAL       PRIMARY KEY,
        quota_date            DATE         NOT NULL,
        doctor_id             VARCHAR(50)  NOT NULL REFERENCES dent_doctors(doctor_id),
        max_walkin_quota      INTEGER      NOT NULL DEFAULT 0,
        current_walkin_count  INTEGER      NOT NULL DEFAULT 0,
        updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(quota_date, doctor_id)
      )
    `);

    // dent_walkin_queue — คิว walk-in รายวัน
    await pool.query(`
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
      )
    `);

    console.log('[DB] Tables verified/created in HIS database');
  } catch (err) {
    console.error('[DB] Setup error:', err.message);
  }
}

module.exports = setupDb;
