const express = require('express');
const router = express.Router();
const { findNearbyPlaces } = require('../controllers/placeController');
const { authenticateJWT } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/nearby', findNearbyPlaces);

module.exports = router;