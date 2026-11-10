import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

// Debug: Check if Copernicus env vars are loaded (without exposing values)
if (process.env.NODE_ENV === 'development') {
  console.log('🔐 Copernicus CLIENT_ID loaded:', process.env.COPERNICUS_CLIENT_ID ? 'YES' : 'NO');
  console.log('🔐 Copernicus CLIENT_SECRET loaded:', process.env.COPERNICUS_CLIENT_SECRET ? 'YES' : 'NO');
}

// NOW import routes (which import services that need env vars)
import healthRouter from './routes/health';
import locationsRouter from './routes/locations';
import satelliteRouter from './routes/satellite';
import ndviRouter from './routes/ndvi';
import assistantRouter from './routes/assistant';
import landcoverRouter from './routes/landcover';

const app: Application = express();
const PORT = process.env.PORT || 5000;

// CORS: Allow both localhost and 127.0.0.1 for development
// Support both port 3000 and 3001 (Vite may use alternate port)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve overlay files statically (for NDVI change visualizations)
import path from 'path';
const OVERLAY_DIR = path.join(__dirname, '../overlays');
app.use('/overlays', express.static(OVERLAY_DIR));

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/locations', locationsRouter);
app.use('/api/v1/satellite', satelliteRouter);
app.use('/api/v1/ndvi', ndviRouter);
app.use('/api/v1/assistant', assistantRouter);
app.use('/api/v1/landcover', landcoverRouter);

app.get('/api/v1', (req, res) => {
  res.json({
    message: 'EcoSense AI API v1',
    status: 'ready',
    version: '1.0.0-phase3',
    endpoints: {
      health: '/health',
      locations: '/api/v1/locations',
      satellite: '/api/v1/satellite',
      analyses: '/api/v1/analyses (Phase 4+)',
    }
  });
});

// Error handling middleware
interface ErrorWithStatus extends Error {
  status?: number;
}

app.use((err: ErrorWithStatus, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 EcoSense AI Backend running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 CORS enabled for ports: 3000, 3001 (localhost & 127.0.0.1)`);
});

// Graceful shutdown handler
const shutdown = () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
