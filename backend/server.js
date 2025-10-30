/**
 * Mental Wellness Mirror - Main Server File
 * UPDATED: Full authentication & security implementation
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

// Import database initialization
const { initializeDatabase } = require('./models/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const moodRoutes = require('./routes/moodRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const placeRoutes = require('./routes/placeRoutes');

// Import middleware
const { errorHandler, notFoundHandler, requestLogger } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// SECURITY MIDDLEWARE (Apply first)
// ============================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://cdn.jsdelivr.net"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: [
        "'self'", 
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false
}));

// ============================================
// CORS CONFIGURATION
// ============================================

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',') 
      : ['http://localhost:3000'];
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining']
};

app.use(cors(corsOptions));

// ============================================
// BODY PARSER MIDDLEWARE
// ============================================

app.use(express.json({ limit: '100kb' })); // Reduced from 10mb for security
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ============================================
// REQUEST LOGGING
// ============================================

if (process.env.NODE_ENV !== 'production') {
  app.use(requestLogger);
} else {
  // Simple logging for production
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ============================================
// API ROUTES
// ============================================

// Health check endpoint (no rate limit, no auth)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mental Wellness Mirror API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Apply general rate limiter to all API routes
app.use('/api', apiLimiter);

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// User management routes (protected)
app.use('/api/user', userRoutes);

// Application routes (protected)
app.use('/api/chat', chatRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/places', placeRoutes);

// ============================================
// FRONTEND SERVING
// ============================================

// Serve temporary audio files
app.use('/api/audio', express.static(path.join(__dirname, 'temp/audio')));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend'), {
  maxAge: '1d',
  etag: true
}));

// SPA catch-all route (only for non-API routes)
app.get('*', (req, res, next) => {
  // Don't serve index.html for API routes that don't exist
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  res.sendFile(path.resolve(__dirname, '../frontend', 'index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler for API routes
app.use('/api/*', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============================================
// DATABASE INITIALIZATION & SERVER START
// ============================================

async function startServer() {
  try {
    // Initialize database
    console.log('📊 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    // Run cleanup tasks
    const tokenService = require('./services/tokenService');
    const sessionModel = require('./models/Session');
    
    // Clean up expired tokens
    const expiredTokens = await tokenService.cleanupExpiredTokens();
    if (expiredTokens > 0) {
      console.log(`🧹 Cleaned up ${expiredTokens} expired tokens`);
    }
    
    // Clean up old sessions
    const oldSessions = await sessionModel.cleanupOldSessions();
    if (oldSessions > 0) {
      console.log(`🧹 Cleaned up ${oldSessions} old sessions`);
    }
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('🧠 ====================================');
      console.log('   MENTAL WELLNESS MIRROR - Server');
      console.log('   ====================================');
      console.log(`   🚀 Server: http://localhost:${PORT}`);
      console.log(`   🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   🔐 Auth: Enabled (JWT)`);
      console.log('   ====================================');
      console.log('');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('✅ HTTP server closed');
        
        try {
          const { closeDatabase } = require('./models/database');
          await closeDatabase();
          console.log('✅ Database connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️ Forcing shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions and rejections
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