const crypto    = require('crypto');
const { withHisConnection } = require('../config/hisDb');
const { readConfig }        = require('../config/dbConfig');

const md5 = (str) => crypto.createHash('md5').update(str).digest('hex');

// POST /api/auth/login
// ตรวจสอบ username + password กับตาราง officer ใน HIS database
// password ที่เก็บเป็น MD5 hash → เราจึง hash password ที่รับมาแล้วเปรียบเทียบ
const login = async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอก username และ password' });
  }

  const config = readConfig();
  if (!config) {
    return res.status(503).json({
      success: false,
      code: 'NO_DB_CONFIG',
      message: 'ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล',
    });
  }

  try {
    const hashedPw = md5(password);

    const rows = await withHisConnection(async (conn, type) => {
      if (type === 'mysql') {
        const [result] = await conn.query(
          `SELECT officer_login_name, officer_name
           FROM officer
           WHERE officer_login_name = ? AND LOWER(officer_login_password_md5) = LOWER(?)
           LIMIT 1`,
          [username, hashedPw]
        );
        return result;
      } else {
        const result = await conn.query(
          `SELECT officer_login_name, officer_name
           FROM officer
           WHERE officer_login_name = $1 AND LOWER(officer_login_password_md5) = LOWER($2)
           LIMIT 1`,
          [username, hashedPw]
        );
        return result.rows;
      }
    });

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: 'username หรือ password ไม่ถูกต้อง' });
    }

    const officer = rows[0];
    return res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        username: officer.officer_login_name,
        name:     officer.officer_name || officer.officer_login_name,
      },
    });
  } catch (err) {
    console.error('[Auth]', err.message);
    return res.status(500).json({
      success: false,
      message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`,
    });
  }
};

module.exports = { login };
