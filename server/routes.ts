import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { businesses, messages, conversations, conversationParticipants, waitlist, adSpaces, adCampaigns, advertisements, bookingHistory } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import salonRouter from "./routes/salon";
import rosterRouter from "./routes/roster";
import slotsRouter from "./routes/slots";
import bookingsRouter from "./routes/bookings";
import { requireAuth, hasBusinessAccess } from "./middleware/businessAccess";
import { setupAuth } from "./auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage and upload settings
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const logosDir = path.join(uploadsDir, 'logos');
const galleryDir = path.join(uploadsDir, 'gallery');

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

  // Setup authentication first
  setupAuth(app);

  // API Routes prefix middleware
  app.use('/api/*', (req, res, next) => {
    res.type('json');
    next();
  });

  // Business access middleware
  app.use('/api/businesses/:businessId/*', requireAuth, hasBusinessAccess);

  // Register all API routes
  app.use("/api", salonRouter);
  app.use("/api", rosterRouter);
  app.use("/api", slotsRouter);
  app.use("/api", bookingsRouter);

  // Business Routes
  app.get("/api/businesses", async (req, res) => {
    try {
      const result = await db
        .select()
        .from(businesses)
        .where(eq(businesses.status, "active"));
      res.json(result);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  app.get("/api/businesses/:businessId/profile", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      res.json(business);
    } catch (error) {
      console.error('Error fetching business profile:', error);
      res.status(500).json({ message: "Failed to fetch business profile" });
    }
  });

  // Protected Business Routes
  app.post("/api/businesses", requireAuth, async (req, res) => {
    try {
      const [business] = await db
        .insert(businesses)
        .values({
          userId: req.user!.id,
          name: req.body.name,
          industryType: req.body.industryType,
          description: req.body.description,
          status: "pending",
          onboardingCompleted: false,
          createdAt: new Date()
        })
        .returning();

      res.json(business);
    } catch (error) {
      console.error('Error creating business:', error);
      res.status(500).json({ error: "Failed to create business" });
    }
  });

  // Protected profile update route
  app.put(
    "/api/businesses/:businessId/profile",
    requireAuth,
    hasBusinessAccess,
    upload.fields([
      { name: 'logo', maxCount: 1 },
      { name: 'gallery', maxCount: 10 }
    ]),
    async (req: any, res) => {
      try {
        if (!req.isBusinessOwner) {
          return res.status(403).json({ error: "Not authorized to update this business" });
        }

        const businessId = parseInt(req.params.businessId);
        const [business] = await db
          .select()
          .from(businesses)
          .where(eq(businesses.id, businessId))
          .limit(1);

        if (!business) {
          return res.status(404).json({ error: "Business not found" });
        }

        // Parse the form data
        const formData = JSON.parse(req.body.data || '{}');
        console.log('Received form data:', formData);

        // Handle file uploads
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        console.log('Uploaded files:', files);

        // Update business profile
        const [updatedBusiness] = await db
          .update(businesses)
          .set({
            name: formData.name,
            description: formData.description,
            updatedAt: new Date()
          })
          .where(eq(businesses.id, businessId))
          .returning();

        console.log('Updated business:', updatedBusiness);
        res.json(updatedBusiness);
      } catch (error: any) {
        console.error('Error updating business profile:', error);
        res.status(500).json({
          error: "Failed to update business profile",
          details: error.message
        });
      }
    }
  );

  // Protected Gallery Management
  app.delete("/api/businesses/:businessId/gallery/:photoIndex", requireAuth, hasBusinessAccess, async (req: any, res) => {
    try {
      if (!req.isBusinessOwner) {
        return res.status(403).json({ error: "Not authorized to update this business" });
      }

      const businessId = parseInt(req.params.businessId);
      const photoIndex = parseInt(req.params.photoIndex);

      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Get current gallery
      const gallery = business.gallery || [];
      if (photoIndex < 0 || photoIndex >= gallery.length) {
        return res.status(400).json({ error: "Invalid photo index" });
      }

      // Get photo to delete
      const photoToDelete = gallery[photoIndex];

      // Delete file from filesystem
      if (photoToDelete?.url) {
        const filePath = path.join(__dirname, '..', 'public', photoToDelete.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Remove photo from gallery array
      gallery.splice(photoIndex, 1);

      // Update business with new gallery
      const [updatedBusiness] = await db
        .update(businesses)
        .set({
          gallery: gallery,
          updatedAt: new Date()
        })
        .where(eq(businesses.id, businessId))
        .returning();

      res.json(updatedBusiness);
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      res.status(500).json({
        error: "Failed to delete photo",
        details: error.message
      });
    }
  });

  // Booking History Update Route
  app.post("/api/businesses/:businessId/bookings/:bookingId/history", requireAuth, async (req, res) => {
    try {
      const [record] = await db
        .insert(bookingHistory)
        .values({
          bookingId: parseInt(req.params.bookingId),
          action: req.body.action,
          previousSlotId: req.body.previousSlotId,
          newSlotId: req.body.newSlotId,
          reason: req.body.reason,
          performedBy: req.user!.id,
          createdAt: new Date()
        })
        .returning();

      res.json(record);
    } catch (error) {
      console.error('Error updating booking history:', error);
      res.status(500).json({ error: "Failed to update booking history" });
    }
  });

  return httpServer;
}