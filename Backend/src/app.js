import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import { config } from './config/environment.js';
import { rateLimiter } from './middlewares/rateLimiter.middleware.js';
import { languageMiddleware } from './middlewares/language.middleware.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';
import apiRoutes from './routes/index.js';
import { ApiResponse } from './utils/ApiResponse.js';
import { HTTP_STATUS, ENVIRONMENT } from './constants/index.js';

const app = express();

// Trust proxy for Render / Cloudflare reverse proxies
app.set('trust proxy', 1);

// ==========================================
// 1. Security & Core Middlewares
// ==========================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// High-performance response compression (Gzip / Deflate)
app.use(compression());

// Dynamic CORS configuration allowing localhost, Vercel preview/production deployments, and configured origins
const defaultAllowedOrigins = [
  'https://arogyamitra-two.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
];

const envOrigins = Array.isArray(config.corsOrigin)
  ? config.corsOrigin
  : typeof config.corsOrigin === 'string' && config.corsOrigin !== '*'
  ? config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envOrigins])];

const isOriginAllowed = (origin) => {
  // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
  if (!origin) return true;

  // Allow wildcard if configured
  if (config.corsOrigin === '*' || allowedOrigins.includes('*')) return true;

  // Exact match in allowed origins list
  if (allowedOrigins.includes(origin)) return true;

  // Allow any *.vercel.app deployment (e.g. preview and branch deploys)
  if (/^https:\/\/([a-zA-Z0-9_-]+\.)*vercel\.app$/.test(origin)) return true;

  // Allow localhost / 127.0.0.1 on any port
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Accept-Language', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Apply rate limiting in production or if enabled
if (config.env === ENVIRONMENT.PRODUCTION) {
  app.use(rateLimiter);
}

// Request logging
app.use(morgan(config.env === ENVIRONMENT.DEVELOPMENT ? 'dev' : 'combined'));

// Body parsers (allow larger payload for base64 document uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Multilingual Accept-Language context middleware
app.use(languageMiddleware);

// ==========================================
// 2. Base & API Route Mounting
// ==========================================
// Root endpoint
app.get('/', (req, res) => {
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        name: 'WardArogya Backend API',
        version: '1.0.0',
        documentation: '/api/v1/health',
      },
      'Welcome to WardArogya Backend API'
    )
  );
});

// Mount API Routes (/api and legacy /api/v1)
app.use('/api', apiRoutes);
app.use('/api/v1', apiRoutes);

// ==========================================
// 3. Error Handling Middlewares
// ==========================================
// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
