const express      = require('express');
const cors         = require('cors');
const path         = require('path');
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

const app    = express();
const isPkg  = Boolean(process.pkg);
const PORT   = process.env.PORT || 3001;

// Static files: next to exe when packaged, backend/public in dev
const publicPath = isPkg
  ? path.join(path.dirname(process.execPath), 'public')
  : path.join(__dirname, '../public');

app.use(cors({
  origin: isPkg ? true : (process.env.FRONTEND_URL || 'http://localhost:5173'),
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

// Graceful shutdown (called by stop.vbs)
app.post('/api/shutdown', (_req, res) => {
  res.json({ message: 'shutting down' });
  setTimeout(() => process.exit(0), 400);
});

// Serve React frontend when packaged
if (isPkg) {
  app.use(express.static(publicPath));
  app.get('*', (_req, res) => res.sendFile(path.join(publicPath, 'index.html')));
}

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  if (readConfig()) {
    await Promise.all([
      setupDb(),
      hisQuery('SELECT 1').then(() => console.log('[HIS Pool] Warmed up')).catch(() => {}),
    ]);
  }
});

module.exports = app;
