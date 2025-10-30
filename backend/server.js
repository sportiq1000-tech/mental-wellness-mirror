/**
 * Mental Wellness Mirror - Main Server File
 * CORRECTED for new UI structure and proper SPA serving
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import database initialization
const { initializeDatabase } = require('./models/database');

// Import routes
const chatRoutes = require('./routes/chatRoutes');
const moodRoutes = require('./routes/moodRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const placeRoutes = require('./routes/placeRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Body parser middleware (using modern Express built-in)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (simple)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});


// ============================================
// API ROUTES (Handled before static files)
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mental Wellness Mirror API is running'
  });
});

// All API routes
app.use('/api/chat', chatRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/places', placeRoutes);


// ============================================
// FRONTEND SERVING (Static files and SPA catch-all)
// ============================================

// Serve temporary audio files from API path
app.use('/api/audio', express.static(path.join(__dirname, 'temp/audio')));

// Serve all static files from the 'frontend' directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch-all route for Single Page Application (SPA) support:
// This sends the main index.html for any request that doesn't match an API route or a static file.
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend', 'index.html'));
});


// ============================================
// ERROR HANDLING MIDDLEWARE (must be the last app.use call)
// ============================================
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: message
    }
  });
});

// ============================================
// DATABASE INITIALIZATION & SERVER START
// ============================================

async function startServer() {
  try {
    // Initialize database
    console.log('📊 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    // Start server
    app.listen(PORT, () => {
      console.log('');
      console.log('🧠 ====================================');
      console.log('   MENTAL WELLNESS MIRROR - Server');
      console.log('   ====================================');
      console.log(`   🚀 Server running on http://localhost:${PORT}`);
      console.log('   ====================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions and rejections (no changes here)
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;