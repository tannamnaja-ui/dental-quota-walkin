const express = require('express');
const router  = express.Router();
const { getConfig, testConnection, saveConfig, checkTables, createTable } = require('../controllers/dbConfigController');

router.get('/',           getConfig);
router.post('/test',      testConnection);
router.post('/save',      saveConfig);
router.get('/tables',     checkTables);
router.post('/table/:name', createTable);

module.exports = router;
