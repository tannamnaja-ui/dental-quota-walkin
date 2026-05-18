const express = require('express');
const router  = express.Router();
const { registerWalkin, getTodayQueue, updateQueueStatus } = require('../controllers/walkinController');

router.post('/register',               registerWalkin);
router.get('/queue',                   getTodayQueue);
router.put('/queue/:queueId/status',   updateQueueStatus);

module.exports = router;
