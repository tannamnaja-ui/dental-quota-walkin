-- =============================================================
-- Dental Walk-in Quota Management System - Database Initialization
-- =============================================================

-- ตาราง 1: รายชื่อแพทย์ (เพิ่มใหม่สำหรับระบบนี้ เชื่อมกับ doctor_id ใน HIS เดิม)
CREATE TABLE IF NOT EXISTS dent_doctors (
    doctor_id   VARCHAR(50) PRIMARY KEY,
    doctor_name VARCHAR(100) NOT NULL,
    specialty   VARCHAR(100),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง 2: ตั้งค่าโควตารายวัน
CREATE TABLE IF NOT EXISTS dent_daily_quota (
    quota_id              SERIAL PRIMARY KEY,
    quota_date            DATE NOT NULL DEFAULT CURRENT_DATE,
    doctor_id             VARCHAR(50) NOT NULL,
    max_walkin_quota      INT NOT NULL DEFAULT 0,
    current_walkin_count  INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_doctor_date UNIQUE (quota_date, doctor_id),
    CONSTRAINT fk_quota_doctor FOREIGN KEY (doctor_id) REFERENCES dent_doctors(doctor_id)
);

-- ตาราง 3: คิว Walk-in
CREATE TABLE IF NOT EXISTS dent_walkin_queue (
    queue_id         SERIAL PRIMARY KEY,
    queue_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    queue_number     VARCHAR(10) NOT NULL,
    hn               VARCHAR(50) NOT NULL,
    doctor_id        VARCHAR(50) NOT NULL,
    chief_complaint  TEXT,
    queue_status     VARCHAR(20) NOT NULL DEFAULT 'Waiting',
    registered_time  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_queue_status CHECK (queue_status IN ('Waiting', 'In-Progress', 'Completed', 'Cancelled'))
);

-- Indexes เพื่อประสิทธิภาพในการค้นหาตามวันที่
CREATE INDEX IF NOT EXISTS idx_daily_quota_date     ON dent_daily_quota(quota_date);
CREATE INDEX IF NOT EXISTS idx_daily_quota_doc_date ON dent_daily_quota(doctor_id, quota_date);
CREATE INDEX IF NOT EXISTS idx_queue_date           ON dent_walkin_queue(queue_date);
CREATE INDEX IF NOT EXISTS idx_queue_doctor_date    ON dent_walkin_queue(doctor_id, queue_date);

-- =============================================================
-- ข้อมูลตัวอย่างแพทย์ (แก้ไข doctor_id ให้ตรงกับ HIS จริง)
-- =============================================================
INSERT INTO dent_doctors (doctor_id, doctor_name, specialty) VALUES
('DR001', 'ทพ. สมชาย รักฟัน',       'ทันตกรรมทั่วไป'),
('DR002', 'ทพญ. สุภาพร จัดฟันดี',   'จัดฟัน (Orthodontics)'),
('DR003', 'ทพ. วิชัย รักษาราก',     'รักษารากฟัน (Endodontics)'),
('DR004', 'ทพญ. มาลี สวยงาม',       'ทันตกรรมเด็ก (Pediatric Dentistry)'),
('DR005', 'ทพ. ประสิทธิ์ ผ่าตัดดี', 'ศัลยกรรมช่องปาก (Oral Surgery)')
ON CONFLICT (doctor_id) DO NOTHING;
