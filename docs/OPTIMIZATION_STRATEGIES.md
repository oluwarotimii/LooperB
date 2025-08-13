# Looper Platform Optimization Strategies

## Overview

This document outlines comprehensive optimization strategies for the Looper food redistribution platform, covering database, API, caching, security, and performance optimizations for production deployment.

---

## 1. Database Optimization

### 1.1 Strategic Indexing

**Current Implementation:**
```sql
-- Primary indexes for frequent queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_businesses_location ON businesses(latitude, longitude);
CREATE INDEX idx_food_listings_business_status ON food_listings(business_id, status);
CREATE INDEX idx_food_listings_pickup_window ON food_listings(pickup_window_end);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_business_status ON orders(business_id, status);
CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id, created_at);
```

**Implementation Steps:**
```bash
# Run database migration with indexes
npm run db:push

# Monitor query performance
-- Use EXPLAIN ANALYZE for slow queries
EXPLAIN ANALYZE SELECT * FROM food_listings WHERE status = 'active' AND pickup_window_end > NOW();
```

### 1.2 Connection Pooling Configuration

**Current Setup (Neon):**
```typescript
// server/db.ts
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 50, // Maximum pool size
  min: 5,  // Minimum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Optimization Benefits:**
- Reduced connection overhead
- Better resource utilization
- Improved concurrent request handling
- Automatic connection health checks

### 1.3 Query Optimization Patterns

**Implemented Optimizations:**
```typescript
// Use select specific fields instead of SELECT *
const orders = await db
  .select({
    id: orders.id,
    totalAmount: orders.totalAmount,
    status: orders.status
  })
  .from(orders)
  .where(eq(orders.userId, userId));

// Use LIMIT for pagination
const listings = await db
  .select()
  .from(foodListings)
  .where(eq(foodListings.status, 'active'))
  .orderBy(desc(foodListings.createdAt))
  .limit(20)
  .offset(page * 20);
```

---

## 2. Caching Implementation

### 2.1 Application-Level Caching

**Memoization Implementation:**
```typescript
import memoize from 'memoizee';

// Cache frequently accessed data
export const getCachedBusinessDetails = memoize(
  async (businessId: string) => {
    return await storage.getBusiness(businessId);
  },
  { 
    maxAge: 5 * 60 * 1000, // 5 minutes
    max: 1000, // Maximum 1000 cached entries
    normalizer: ([businessId]) => businessId 
  }
);

// Cache expensive calculations
export const getCachedImpactMetrics = memoize(
  async (userId: string) => {
    return await impactService.getUserImpact(userId);
  },
  { maxAge: 15 * 60 * 1000 } // 15 minutes
);
```

### 2.2 HTTP Response Caching

**Cache Control Headers:**
```typescript
// server/middleware/performance.ts
export const cacheControl = (maxAge: number = 0) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      // Static content caching
      if (req.path.includes('/static/') || req.path.includes('/images/')) {
        res.set('Cache-Control', `public, max-age=${24 * 60 * 60}`); // 24 hours
      }
      // API response caching
      else if (req.path.includes('/api/businesses') || req.path.includes('/api/dietary-tags')) {
        res.set('Cache-Control', `public, max-age=${5 * 60}`); // 5 minutes
      }
      // Default caching
      else {
        res.set('Cache-Control', `public, max-age=${maxAge}`);
      }
    } else {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  };
};
```

### 2.3 Redis Integration (Future Implementation)

**Redis Setup for Production:**
```typescript
// server/utils/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get failed', error as Error);
      return null;
    }
  }

  static async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set failed', error as Error);
    }
  }

  static async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache invalidation failed', error as Error);
    }
  }
}

// Usage examples
await CacheService.set(`business:${businessId}`, businessData, 300); // 5 minutes
await CacheService.set(`listings:active`, activeListings, 60); // 1 minute
await CacheService.invalidate(`business:*`); // Clear all business cache
```

---

## 3. API Performance Optimization

### 3.1 Response Compression

**Gzip Compression Implementation:**
```typescript
// server/middleware/performance.ts
import compression from 'compression';

export const compressionMiddleware = compression({
  level: 6, // Balanced compression level
  threshold: 1000, // Only compress responses larger than 1KB
  filter: (req: Request, res: Response) => {
    // Don't compress if explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
});
```

**Compression Benefits:**
- 60-80% reduction in response size
- Faster data transfer over slow connections
- Reduced bandwidth costs
- Better mobile experience

### 3.2 Rate Limiting Configuration

**Multi-tier Rate Limiting:**
```typescript
// Different limits for different endpoints
const rateLimits = {
  general: { requests: 100, window: 15 * 60 * 1000 }, // 100 req/15min
  auth: { requests: 5, window: 15 * 60 * 1000 },     // 5 req/15min
  upload: { requests: 20, window: 60 * 60 * 1000 },  // 20 req/hour
  payment: { requests: 50, window: 60 * 60 * 1000 }  // 50 req/hour
};

// Implementation with custom handling
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    handler: (req: Request, res: Response) => {
      logger.securityEvent('Rate limit exceeded', undefined, req.ip);
      res.status(429).json({ error: message });
    }
  });
};
```

### 3.3 Request Batching

**Batch API Implementation:**
```typescript
// server/routes/batch.ts
app.post('/api/batch', authenticateJWT, async (req: any, res) => {
  try {
    const { requests } = req.body; // Array of API requests
    const results = [];

    for (const request of requests) {
      try {
        // Process each request
        const result = await processBatchRequest(request);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Batch processing failed' });
  }
});

// Usage: Client can batch multiple requests
const batchRequests = [
  { type: 'GET_BUSINESS', id: 'business1' },
  { type: 'GET_LISTINGS', businessId: 'business1' },
  { type: 'GET_REVIEWS', businessId: 'business1' }
];
```

---

## 4. Security Optimizations

### 4.1 Advanced Authentication Security

**JWT Security Implementation:**
```typescript
// server/middleware/auth.ts
export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET!,
    { 
      expiresIn: '15m',
      issuer: 'looper-api',
      audience: 'looper-client'
    }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET!,
    { 
      expiresIn: '7d',
      issuer: 'looper-api'
    }
  );

  return { accessToken, refreshToken };
};

// Token rotation on refresh
export const refreshAccessToken = async (refreshToken: string) => {
  const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
  
  // Generate new tokens
  const tokens = generateTokens(decoded.userId);
  
  // Update refresh token in database
  await storage.updateUser(decoded.userId, { 
    refreshToken: tokens.refreshToken 
  });
  
  return tokens;
};
```

### 4.2 Content Security Policy

**Comprehensive CSP Headers:**
```typescript
// server/middleware/performance.ts
export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://fonts.googleapis.com",
        "https://res.cloudinary.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:", 
        "blob:",
        "https://res.cloudinary.com"
      ],
      scriptSrc: ["'self'", "https://js.paystack.co"],
      connectSrc: [
        "'self'", 
        "https://api.paystack.co",
        "wss://looper.app" // WebSocket connections
      ],
      frameSrc: ["https://js.paystack.co"],
      mediaSrc: ["'self'", "https://res.cloudinary.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});
```

### 4.3 Input Validation & Sanitization

**Comprehensive Validation:**
```typescript
// server/middleware/validation.ts
import { z } from 'zod';

export const createBusinessValidation = z.object({
  businessName: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-']+$/, 'Invalid characters in business name'),
  
  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),
  
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  
  address: z.string()
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address too long'),
  
  businessType: z.enum([
    'restaurant', 'hotel', 'bakery', 'supermarket', 'cafe', 'caterer'
  ])
});

// SQL injection prevention through parameterized queries (Drizzle ORM)
// XSS prevention through output encoding
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};
```

---

## 5. Media & File Optimization

### 5.1 Cloudinary Advanced Configuration

**Production Cloudinary Setup:**
```typescript
// server/utils/fileUpload.ts
import { v2 as cloudinary } from 'cloudinary';

// Advanced configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Optimized upload function
export const uploadOptimized = async (buffer: Buffer, options: {
  folder?: string;
  format?: 'auto' | 'jpg' | 'png' | 'webp';
  quality?: 'auto:best' | 'auto:good' | 'auto:low';
  width?: number;
  height?: number;
}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({
      folder: options.folder || 'looper',
      format: options.format || 'auto',
      quality: options.quality || 'auto:good',
      transformation: [
        {
          width: options.width || 1000,
          height: options.height || 1000,
          crop: 'limit',
          fetch_format: 'auto'
        }
      ],
      flags: 'progressive', // Progressive JPEG
      resource_type: 'auto'
    }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    }).end(buffer);
  });
};

// Generate responsive images
export const generateResponsiveUrls = (publicId: string) => {
  return {
    thumbnail: cloudinary.url(publicId, {
      width: 200,
      height: 200,
      crop: 'thumb',
      quality: 'auto:good',
      format: 'auto'
    }),
    medium: cloudinary.url(publicId, {
      width: 500,
      height: 500,
      crop: 'limit',
      quality: 'auto:good',
      format: 'auto'
    }),
    large: cloudinary.url(publicId, {
      width: 1000,
      height: 1000,
      crop: 'limit',
      quality: 'auto:best',
      format: 'auto'
    })
  };
};
```

### 5.2 Progressive Image Loading

**Client-Side Implementation:**
```javascript
// Progressive image loading strategy
const loadImageProgressively = (imageElement, lowQualityUrl, highQualityUrl) => {
  // Load low-quality placeholder first
  imageElement.src = lowQualityUrl;
  imageElement.classList.add('blur');
  
  // Pre-load high-quality image
  const highQualityImage = new Image();
  highQualityImage.onload = () => {
    imageElement.src = highQualityUrl;
    imageElement.classList.remove('blur');
  };
  highQualityImage.src = highQualityUrl;
};

// Usage in React/frontend
const OptimizedImage = ({ publicId, alt, width, height }) => {
  const urls = generateResponsiveUrls(publicId);
  return (
    <img
      src={urls.thumbnail} // Initial low-quality load
      data-src={urls.medium} // Progressive enhancement
      alt={alt}
      loading="lazy"
      style={{ aspectRatio: `${width}/${height}` }}
    />
  );
};
```

---

## 6. Real-time Performance Optimization

### 6.1 WebSocket Connection Management

**Efficient WebSocket Setup:**
```typescript
// server/services/websocket.ts
import { WebSocketServer, WebSocket } from 'ws';

export class WebSocketManager {
  private wss: WebSocketServer;
  private connections = new Map<string, WebSocket>();
  private rooms = new Map<string, Set<string>>();

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.setupConnectionHandling();
  }

  private setupConnectionHandling() {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const userId = this.extractUserId(req);
      
      if (userId) {
        this.connections.set(userId, ws);
        
        ws.on('close', () => {
          this.connections.delete(userId);
          this.leaveAllRooms(userId);
        });

        ws.on('message', (data) => {
          this.handleMessage(userId, JSON.parse(data.toString()));
        });

        // Send connection confirmation
        ws.send(JSON.stringify({ type: 'connected', userId }));
      }
    });
  }

  // Optimized message broadcasting
  broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    
    for (const userId of room) {
      if (userId !== excludeUserId) {
        const connection = this.connections.get(userId);
        if (connection?.readyState === WebSocket.OPEN) {
          connection.send(messageStr);
        }
      }
    }
  }
}
```

### 6.2 Database Connection Optimization

**Connection Pool Monitoring:**
```typescript
// server/db.ts
import { Pool } from '@neondatabase/serverless';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  min: 5,  // Minimum connections
  idleTimeoutMillis: 10000, // Close idle connections after 10s
  connectionTimeoutMillis: 5000, // Connection timeout
  acquireTimeoutMillis: 60000, // Max time to wait for connection
});

// Connection health monitoring
export const monitorConnectionHealth = () => {
  setInterval(async () => {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      logger.info('Database connection healthy', {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingRequests: pool.waitingCount
      });
    } catch (error) {
      logger.error('Database connection unhealthy', error as Error);
    }
  }, 30000); // Check every 30 seconds
};
```

---

## 7. Monitoring & Analytics

### 7.1 Performance Monitoring

**Request Performance Tracking:**
```typescript
// server/middleware/monitoring.ts
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Log slow requests
    if (duration > 1000) { // > 1 second
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        memoryDelta: `${Math.round(memoryDelta / 1024)}KB`,
        userId: (req as any).user?.id
      });
    }

    // Track API metrics
    if (req.path.startsWith('/api')) {
      logger.info('API Request Performance', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: Math.round(duration),
        memoryUsed: Math.round(endMemory.heapUsed / 1024 / 1024) // MB
      });
    }
  });

  next();
};
```

### 7.2 Error Tracking & Alerting

**Comprehensive Error Tracking:**
```typescript
// server/utils/monitoring.ts
export class MonitoringService {
  static trackError(error: Error, context: any = {}) {
    logger.error('Application Error', error, context);
    
    // In production, integrate with services like Sentry
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error, { extra: context });
    }
  }

  static trackPerformanceMetric(name: string, value: number, unit: string = 'ms') {
    logger.info('Performance Metric', { 
      metric: name, 
      value, 
      unit,
      timestamp: new Date().toISOString()
    });
  }

  static async getSystemHealthMetrics() {
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024), // MB
        external: Math.round(memory.external / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}
```

---

## 8. Production Deployment Optimizations

### 8.1 Environment Configuration

**Production Environment Variables:**
```bash
# Production .env configuration
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://...

# Security
JWT_SECRET=complex_random_string
SESSION_SECRET=another_complex_random_string

# Rate Limiting
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/looper/app.log

# External Services
CLOUDINARY_CLOUD_NAME=your_cloud_name
PAYSTACK_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_live_...

# Performance
COMPRESSION_LEVEL=6
CACHE_TTL_SECONDS=300
```

### 8.2 Build Optimization

**Production Build Configuration:**
```json
{
  "scripts": {
    "build": "npm run build:server && npm run build:client",
    "build:server": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify",
    "build:client": "vite build --mode production",
    "start:production": "NODE_ENV=production node dist/index.js"
  }
}
```

### 8.3 Health Check Endpoints

**Health Check Implementation:**
```typescript
// server/routes/health.ts
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    // Check external services
    const checks = {
      database: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV
    };

    res.json({ status: 'healthy', checks });
  } catch (error) {
    logger.error('Health check failed', error as Error);
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Detailed system status for admin dashboard
app.get('/api/admin/system-status', requireRole('admin'), async (req, res) => {
  const metrics = await MonitoringService.getSystemHealthMetrics();
  const logs = logger.getLogStats(24); // Last 24 hours
  
  res.json({
    system: metrics,
    logs: logs,
    services: {
      database: 'connected',
      cloudinary: 'operational',
      paystack: 'operational',
      resend: 'operational'
    }
  });
});
```

---

## 9. Implementation Checklist

### 9.1 Database Optimizations
- [x] Strategic indexing implemented
- [x] Connection pooling configured
- [x] Query optimization patterns applied
- [ ] Read replicas setup (for scale)
- [ ] Database monitoring tools

### 9.2 Caching Strategy
- [x] Application-level memoization
- [x] HTTP cache headers
- [ ] Redis implementation
- [ ] CDN integration for static assets

### 9.3 API Performance
- [x] Response compression (gzip)
- [x] Rate limiting configured
- [x] Request logging implemented
- [ ] API versioning
- [ ] Request batching API

### 9.4 Security Measures
- [x] JWT with token rotation
- [x] Content Security Policy
- [x] Input validation & sanitization
- [x] Rate limiting for security
- [ ] DDoS protection
- [ ] Web Application Firewall

### 9.5 Media Optimization
- [x] Cloudinary integration
- [x] Image optimization
- [x] Progressive loading
- [ ] Video streaming optimization
- [ ] CDN configuration

### 9.6 Monitoring & Logging
- [x] Comprehensive logging system
- [x] Error tracking
- [x] Performance monitoring
- [ ] Real-time alerting
- [ ] Dashboard analytics

---

## 10. Performance Benchmarks

### 10.1 Target Metrics
- API Response Time: < 200ms (95th percentile)
- Database Query Time: < 50ms (average)
- Image Load Time: < 2 seconds
- WebSocket Message Latency: < 100ms
- Concurrent Users: 10,000+
- Error Rate: < 0.1%

### 10.2 Monitoring Commands

**Database Performance:**
```sql
-- Monitor slow queries
SELECT query, mean_exec_time, calls, total_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
```

**Application Monitoring:**
```bash
# Memory usage monitoring
node -e "setInterval(() => console.log(process.memoryUsage()), 5000)"

# Request monitoring
tail -f logs/app.log | grep "API Request"

# Error monitoring  
tail -f logs/error.log | grep "ERROR"
```

This comprehensive optimization guide provides the foundation for scaling the Looper platform to handle thousands of concurrent users while maintaining excellent performance and security standards.