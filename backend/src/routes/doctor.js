const express = require('express');
const router  = express.Router();
const { getAllDoctors, getPositions, getHisDoctors, getSpecialties } = require('../controllers/doctorController');

router.get('/',           getAllDoctors);
router.get('/positions',  getPositions);
router.get('/his',        getHisDoctors);
router.get('/specialties',getSpecialties);

module.exports = router;
