const express = require('express');
const router  = express.Router();
const { getQuota, upsertQuota, bulkUpsertQuota, useQuota, deleteQuota, updateQuota } = require('../controllers/quotaController');

router.get('/',            getQuota);
router.post('/setup',      upsertQuota);
router.post('/setup-bulk', bulkUpsertQuota);
router.post('/:id/use',    useQuota);
router.put('/:id',         updateQuota);
router.delete('/:id',      deleteQuota);

module.exports = router;
