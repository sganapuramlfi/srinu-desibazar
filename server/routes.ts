import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { businesses } from "@db/schema";
import { eq } from "drizzle-orm";
import { setupAuth } from "./auth";
import salonRoutes from "./routes/salon";
import rosterRoutes from "./routes/roster";
import slotsRoutes from "./routes/slots";
import { responseHandler } from "./middleware/responseHandler";
import { hasBusinessAccess, requireBusinessOwner } from "./middleware/businessAccess";

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

  // Error handling middleware - register first to catch all errors
  app.use('/api', (err: any, req: any, res: any, next: any) => {
    console.error('API Error:', err);

    // Handle multer errors
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        ok: false,
        message: err.message
      });
    }

    // Handle JSON parsing errors
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid JSON format'
      });
    }

    // Handle other errors
    return res.status(err.status || 500).json({
      ok: false,
      message: err.message || 'Internal Server Error'
    });
  });

  // Apply response handler middleware for all API routes
  app.use('/api', responseHandler);

  // Setup authentication first
  setupAuth(app);

  // Business profile route (public)
  app.get('/api/businesses/:businessId/profile', hasBusinessAccess, async (req, res) => {
    try {
      return res.json({
        ok: true,
        data: { business: req.business }
      });
    } catch (error) {
      console.error('Error fetching business profile:', error);
      return res.status(500).json({
        ok: false,
        message: 'Failed to fetch business profile'
      });
    }
  });

  // Protected business routes
  app.use('/api/businesses/:businessId/dashboard', hasBusinessAccess, requireBusinessOwner);
  app.use('/api/businesses/:businessId/manage', hasBusinessAccess, requireBusinessOwner);

  // Register industry-specific routes
  app.use('/api', salonRoutes);
  app.use('/api', rosterRoutes);
  app.use('/api', slotsRoutes);

  return httpServer;
}