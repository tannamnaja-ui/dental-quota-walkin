const express      = require('express');
const cors         = require('cors');
require('dotenv').config();

const walkinRoutes   = require('./routes/walkin');
const quotaRoutes    = require('./routes/quota');
const doctorRoutes   = require('./routes/doctor');
const authRoutes     = require('./routes/auth');
const dbConfigRoutes = require('./routes/dbConfig');
const errorHandler        = require('./middleware/errorHandler');
const setupDb             = require('./config/setupDb');
const { readConfig }      = require('./config/dbConfig');
const { hisQuery }        = require('./config/hisPool');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth',      authRoutes);
app.use('/api/config/db', dbConfigRoutes);
app.use('/api/walkin',    walkinRoutes);
app.use('/api/quota',     quotaRoutes);
app.use('/api/doctors',   doctorRoutes);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  if (readConfig()) {
    // warm-up pools พร้อมกัน
    await Promise.all([
      setupDb(),
      hisQuery('SELECT 1').then(() => console.log('[HIS Pool] Warmed up')).catch(() => {}),
    ]);
  }
});

module.exports = app;
