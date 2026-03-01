import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import { fileURLToPath } from "url";
import { setupAuth } from "./auth";
import simplifiedAuthRoutes from "./routes/simplified-auth.js";
import adminEmailRoutes from "./routes/admin-email.js";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cron from "node-cron";
import { checkTrialExpirations } from "./jobs/trialManagement.js";
import { aggregateDailyAnalytics } from "./jobs/aggregateAnalytics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Stripe webhook needs raw body - must be BEFORE express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ==================================================================================
// RATE LIMITING CONFIGURATION
// ==================================================================================
// Protects against brute force attacks and API abuse

// Login rate limiter - Strict limits for authentication endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
});

// Admin rate limiter - Very strict for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    error: 'Too many admin login attempts from this IP, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter - Reasonable limits for regular API usage
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't count OPTIONS requests (CORS preflight)
    return req.method === 'OPTIONS';
  },
});

// AI rate limiter - Strict limits for AI/LLM endpoints (expensive operations)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 AI queries per window
  message: {
    error: 'Too many AI requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters
app.use('/api/simple/login', loginLimiter);
app.use('/api/simple/register', loginLimiter);
app.use('/api/admin/login', adminLimiter);
app.use('/api/ai-abrakadabra', aiLimiter);       // Public + registered AI queries
app.use('/api/ai-abrakadabra-fixed', aiLimiter); // Fixed AI endpoints
app.use('/api/ai-genie', aiLimiter);             // ai-genie search/booking/insights
app.use('/api', apiLimiter); // Apply to all API routes

console.log('✅ Rate limiting enabled:');
console.log('   - Login/Register: 5 attempts per 15 minutes');
console.log('   - Admin login: 3 attempts per hour');
console.log('   - AI endpoints: 20 requests per 15 minutes');
console.log('   - API requests: 100 per 15 minutes');

// ==================================================================================
// SECURITY HEADERS (Helmet)
// ==================================================================================
// Protects against common web vulnerabilities (XSS, clickjacking, etc.)

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Tailwind
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for React
      imgSrc: ["'self'", "data:", "https:", "blob:"], // Allow external images
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

console.log('✅ Security headers enabled (Helmet):');
console.log('   - Content Security Policy (CSP)');
console.log('   - X-Frame-Options (clickjacking protection)');
console.log('   - X-Content-Type-Options (MIME sniffing protection)');
console.log('   - Strict-Transport-Security (HSTS)');

// API-specific middleware
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Log request details
  console.log(`[${new Date().toISOString()}] ${req.method} ${path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', req.body);
  }

  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Initialize authentication before routes
setupAuth(app);

// Serve uploaded files from public directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

(async () => {
  // Add simplified auth routes
  app.use('/api/simple', simplifiedAuthRoutes);
  
  // Add admin email configuration routes
  app.use('/api/admin/email', adminEmailRoutes);
  
  // Initialize API routes first
  const server = registerRoutes(app);

  // API error handling middleware
  app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('API Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ error: message });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`serving on port ${PORT}`);
  });

  // Schedule trial management job to run daily at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    console.log("🕐 [Cron] Running daily trial management job...");
    try {
      const result = await checkTrialExpirations();
      console.log("✅ [Cron] Trial management completed:", result);
    } catch (error) {
      console.error("❌ [Cron] Trial management failed:", error);
    }
  });
  console.log("⏰ Trial management cron job scheduled (daily at 2:00 AM)");

  // Schedule analytics aggregation to run daily at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("📊 [Cron] Running daily analytics aggregation...");
    try {
      await aggregateDailyAnalytics();
      console.log("✅ [Cron] Analytics aggregation completed");
    } catch (error) {
      console.error("❌ [Cron] Analytics aggregation failed:", error);
    }
  });
  console.log("📊 Analytics aggregation cron job scheduled (daily at midnight)");
})();