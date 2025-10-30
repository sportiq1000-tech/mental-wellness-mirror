/**
 * Mood Routes - API endpoints for mood tracking
 */

const express = require('express');
const router = express.Router();
const { getMoodHistoryData, getRecentMoodData, exportAllData } = require('../controllers/moodController');

// GET /api/moods/history - Get mood history with statistics
router.get('/history', getMoodHistoryData);

// GET /api/moods/recent - Get recent mood data
router.get('/recent', getRecentMoodData);

// GET /api/moods/export - Export all data
router.get('/export', exportAllData);

module.exports = router;