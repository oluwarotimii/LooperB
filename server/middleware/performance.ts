import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Express, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Compression middleware
export const compressionMiddleware = compression({
  level: 6,
  threshold: 1000,
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
});

// Security middleware
export const securityMiddleware = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "https://api.paystack.co", "ws:", "wss:"],
      frameSrc: ["https://js.paystack.co"]
    }
  } : false, // Disable CSP in development to allow Vite HMR
  crossOriginEmbedderPolicy: false
});

// Rate limiting configurations
const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.securityEvent('Rate limit exceeded', undefined, req.ip, {
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({ error: message });
    }
  });
};

// Different rate limits for different endpoint types
export const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // requests per windowMs
  'Too many requests, please try again later'
);

export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes  
  5, // requests per windowMs
  'Too many authentication attempts, please try again later'
);

export const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  20, // requests per windowMs
  'Too many file uploads, please try again later'
);

export const paymentRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  50, // requests per windowMs
  'Too many payment requests, please try again later'
);

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = (req as any).user?.id;
    
    logger.apiRequest(
      req.method,
      req.path,
      userId,
      duration,
      res.statusCode
    );
  });
  
  next();
};

// Error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).user?.id;
  const requestId = Math.random().toString(36).substring(7);
  
  logger.error('API Error', error, {
    userId,
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Invalid request data',
      details: isDevelopment ? error.message : undefined,
      requestId
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication required',
      requestId
    });
  }
  
  if (error.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Access denied',
      requestId
    });
  }

  // Default to 500 server error
  res.status(500).json({
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'Something went wrong',
    requestId
  });
};

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    if (duration > 1000) { // Log slow requests (>1 second)
      logger.warn('Slow API request', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        userId: (req as any).user?.id
      });
    }
  });
  
  next();
};

// Cache control middleware
export const cacheControl = (maxAge: number = 0) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${maxAge}`);
    } else {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  };
};

// Setup all performance middleware
export const setupPerformanceMiddleware = (app: Express) => {
  app.use(compressionMiddleware);
  app.use(securityMiddleware);
  app.use(requestLogger);
  app.use(performanceMonitor);
  
  // Apply rate limiting to all routes
  app.use('/api/', generalRateLimit);
  app.use('/api/auth/', authRateLimit);
  app.use('/api/upload/', uploadRateLimit);
  app.use('/api/payments/', paymentRateLimit);
  
  logger.info('Performance middleware configured');
};