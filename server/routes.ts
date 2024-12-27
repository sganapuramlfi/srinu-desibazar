import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { businesses, services, bookings } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { setupAuth } from "./auth";
import salonRoutes from "./routes/salon";
import rosterRoutes from "./routes/roster";
import slotsRoutes from "./routes/slots";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage and upload settings
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const logosDir = path.join(uploadsDir, 'logos');
const galleryDir = path.join(uploadsDir, 'gallery');

// Create upload directories if they don't exist
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });
if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = file.fieldname === 'logo' ? logosDir : galleryDir;
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only JPEG, PNG and WebP images are allowed'));
      return;
    }
    cb(null, true);
  }
});

export function registerRoutes(app: Express): Server {
  // Create the HTTP server first
  const httpServer = createServer(app);

  // Global middleware for JSON responses
  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');

    // Override send to ensure JSON responses
    const originalSend = res.send;
    res.send = function(body) {
      try {
        // If body is already a string, try to parse it to validate JSON
        if (typeof body === 'string') {
          JSON.parse(body);
        }
        // Call original send
        return originalSend.call(this, body);
      } catch (err) {
        console.error('Invalid JSON response:', err);
        // If not valid JSON, send as proper JSON response
        return originalSend.call(this, JSON.stringify({
          ok: false,
          message: 'Internal Server Error: Invalid response format'
        }));
      }
    };
    next();
  });

  // Setup authentication first
  setupAuth(app);

  // Industry-specific routes
  app.use('/api/businesses/:businessId', async (req, res, next) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

      if (!business) {
        return res.status(404).json({
          ok: false,
          message: 'Business not found'
        });
      }

      // Add business context to request
      req.business = business;
      next();
    } catch (error) {
      next(error);
    }
  });

  // Register industry-specific routes
  app.use('/api', salonRoutes);
  app.use('/api', rosterRoutes);
  app.use('/api', slotsRoutes);

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('API Error:', err);

    // Ensure we send JSON response
    res.status(err.status || 500).json({
      ok: false,
      message: err.message || 'Internal Server Error'
    });
  });

  return httpServer;
}