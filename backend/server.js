const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ─── CORS Configuration ─────────────────────────────────────────────────────
const allowedOrigins = [
  "https://campus-event-tracker-frontend.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight for all routes

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── Request Logger ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '********';
    console.log('Body:', JSON.stringify(safeBody));
  }
  next();
});

// ─── Serve Static Upload Files ────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check Endpoints ───────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend API is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ─── Root Endpoint ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Campus Event Tracker API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/health',
      auth: '/api/auth',
      events: '/api/events',
      notifications: '/api/notifications'
    }
  });
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/campuseventtracker';

mongoose.connect(mongoUri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// ─── 404 Handler for Unknown API Routes ──────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.path}` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack || err.message || err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📌 CORS allowed origins: ${allowedOrigins.join(', ')}`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  mongoose.connection.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Dynamic Logging for incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '********';
    console.log('Body:', safeBody);
  }
  next();
});

// ─── Serve Static Files (Uploads) ────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── IMPORTANT: Serve Frontend Static Files ─────────────────────────────────
// This serves your built React/Vue/Angular app
// The frontend is built to 'dist' folder by Render during build
app.use(express.static(path.join(__dirname, 'dist')));
console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);

// ─── Health Check Endpoint ───────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend API is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ─── Root Endpoint ──────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ─── MongoDB Connection ──────────────────────────────────────────────────────
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/campuseventtracker';

mongoose.connect(mongoUri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  // Don't exit in production if possible, but for this app it might be better to exit
});

// ─── API Routes ──────────────────────────────────────────────────────────────
// IMPORTANT: API routes must come BEFORE the SPA fallback route
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// ─── Error Handling Middleware ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error details:', err.stack || err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : { message: err.message }
  });
});

// ─── SPA FALLBACK ROUTE (CRITICAL FOR PAGE RELOAD FIX) ───────────────────────
// This route MUST be LAST - it catches all undefined routes and serves index.html
// This allows the frontend router to handle all routes
app.use((req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API route not found' });
  }

  // Serve index.html for ALL other routes (SPA routes)
  const indexFile = path.join(__dirname, 'dist', 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      console.error(`❌ Failed to serve ${indexFile}: ${err.message}`);
      console.error(`❌ File exists: ${fs.existsSync(indexFile)}`);
      console.error(`❌ dist/ directory exists: ${fs.existsSync(path.join(__dirname, 'dist'))}`);
      res.status(500).json({ 
        message: 'Error loading application',
        debug: process.env.NODE_ENV === 'development' ? {
          distExists: fs.existsSync(path.join(__dirname, 'dist')),
          indexExists: fs.existsSync(indexFile),
          distPath: path.join(__dirname, 'dist')
        } : undefined
      });
    }
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📌 Frontend Allowed: ${corsOptions.origin}`);
  console.log(`✅ SPA routing configured - page reloads will work correctly`);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  mongoose.connection.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
