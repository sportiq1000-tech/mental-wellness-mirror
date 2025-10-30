/**
 * Places Routes - Wellness location endpoints
 */

const express = require('express');
const router = express.Router();
const { getNearbyWellnessPlaces } = require('../controllers/placeController');

// GET /api/places - Get nearby wellness places
router.get('/', getNearbyWellnessPlaces);

module.exports = router;