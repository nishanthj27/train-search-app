const express = require('express');
const { searchTrains, getStations } = require('../controllers/trainController');

const router = express.Router();

router.get('/search', searchTrains);
router.get('/stations', getStations);

module.exports = router;
