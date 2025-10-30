/**
 * Mood Routes
 * UPDATED: Protected with authentication
 */

const express = require('express');
const router = express.Router();

const {
  logMood,
  getMoodHistory,
  getMoodStats,
  getMoodTrends
} = require('../controllers/moodController');

// Middleware
const { authenticateJWT } = require('../middleware/auth');
const { validateMoodEntry } = require('../utils/validators');
const { ValidationError } = require('../utils/errorTypes');

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================

router.use(authenticateJWT);

/**
 * @route   POST /api/moods
 * @desc    Log a mood entry
 * @access  Private
 */
router.post('/', (req, res, next) => {
  try {
    validateMoodEntry(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json(error.toJSON());
    }
    next(error);
  }
}, logMood);

/**
 * @route   GET /api/moods/history
 * @desc    Get mood history
 * @access  Private
 */
router.get('/history', getMoodHistory);

/**
 * @route   GET /api/moods/stats
 * @desc    Get mood statistics
 * @access  Private
 */
router.get('/stats', getMoodStats);

/**
 * @route   GET /api/moods/trends
 * @desc    Get mood trends
 * @access  Private
 */
router.get('/trends', getMoodTrends);

module.exports = router;