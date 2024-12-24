import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, createProtectedRouter } from "./auth";
import { db } from "@db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { businesses } from "@db/schema";
import { eq } from "drizzle-orm";
import salonRouter from "./routes/salon";
import rosterRouter from "./routes/roster";
import slotsRouter from "./routes/slots";
import bookingsRouter from "./routes/bookings";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const logosDir = path.join(uploadsDir, 'logos');
const galleryDir = path.join(uploadsDir, 'gallery');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });
if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = file.fieldname === 'logo' ? logosDir : galleryDir;
    console.log('Upload destination:', dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
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
  // Public Routes First - No auth required
  app.get("/api/businesses/:businessId/profile", async (req, res) => {
    try {
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, parseInt(req.params.businessId)))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      res.json(business);
    } catch (error) {
      console.error('Error fetching business profile:', error);
      res.status(500).json({ error: "Failed to fetch business profile" });
    }
  });

  app.get("/api/businesses", async (req, res) => {
    try {
      const result = await db.select().from(businesses);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  // Register public salon routes first
  app.use("/api", salonRouter);

  // Initialize session and auth setup after public routes
  setupAuth(app);

  // Register protected routes
  const protectedRouter = createProtectedRouter();
  app.use("/api", protectedRouter);
  app.use("/api", rosterRouter);
  app.use("/api", slotsRouter);
  app.use("/api", bookingsRouter);

  const httpServer = createServer(app);
  return httpServer;
}