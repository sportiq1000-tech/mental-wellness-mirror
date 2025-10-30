/**
 * Mental Wellness Mirror - Main Server File
 * Express.js backend for AI-powered emotional reflection
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
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

// Body parser middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve audio files
app.use('/api/audio', express.static(path.join(__dirname, 'temp/audio')));

// Request logging middleware (simple)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// API ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mental Wellness Mirror API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Chat routes (AI reflection)
app.use('/api/chat', chatRoutes);

// Mood tracking routes
app.use('/api/moods', moodRoutes);

// Voice routes (TTS)
app.use('/api/voice', voiceRoutes);

// Places routes (Wellness locations)
app.use('/api/places', placeRoutes);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// 404 handler for API routes (must come before catch-all)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found',
      path: req.path
    }
  });
});

// Catch-all route for frontend (SPA support)
// This MUST be after all API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
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
      console.log(`   🚀 Server running on port ${PORT}`);
      console.log(`   🌐 Local: http://localhost:${PORT}`);
      console.log(`   📊 Health: http://localhost:${PORT}/api/health`);
      console.log(`   🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('   ====================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;