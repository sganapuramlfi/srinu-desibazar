import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, createProtectedRouter } from "./auth";
import { db } from "@db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  businesses,
  users,
  salonServices,
  salonStaff,
  businessProfileSchema
} from "@db/schema";
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
  // Initialize session and auth setup
  setupAuth(app);
  const protectedRouter = createProtectedRouter();

  // Register public routes first
  app.use("/api", salonRouter);

  // Public Business Profile Route
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

  // Public Services Route
  app.get("/api/businesses/:businessId/services", async (req, res) => {
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

      const services = await db
        .select()
        .from(salonServices)
        .where(eq(salonServices.businessId, businessId));

      console.log('Fetched services for business:', businessId, services);
      res.json(services);
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Public Business Listing
  app.get("/api/businesses", async (req, res) => {
    try {
      const result = await db.select().from(businesses);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  // Protected Routes Below (Auth Required)
  // Staff Routes
  protectedRouter.get("/api/businesses/:businessId/staff", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const staffMembers = await db
        .select()
        .from(salonStaff)
        .where(eq(salonStaff.businessId, businessId));

      res.json(staffMembers);
    } catch (error) {
      console.error('Error fetching staff:', error);
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  // Profile Management Routes
  protectedRouter.put(
    "/api/businesses/:businessId/profile",
    upload.fields([
      { name: 'logo', maxCount: 1 },
      { name: 'gallery', maxCount: 10 }
    ]),
    async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: "Unauthorized" });
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

        if (business.userId !== req.user.id) {
          return res.status(403).json({ error: "Not authorized to update this business" });
        }

        // Parse the form data
        const formData = JSON.parse(req.body.data || '{}');
        console.log('Received form data:', formData);

        const result = businessProfileSchema.safeParse(formData);
        if (!result.success) {
          return res.status(400).json({
            error: "Invalid input",
            details: result.error.issues
          });
        }

        // Handle file uploads
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        console.log('Uploaded files:', files);

        let logoUrl = business.logo_url;
        if (files.logo?.[0]) {
          const logoFilename = files.logo[0].filename;
          logoUrl = `/uploads/logos/${logoFilename}`;
        }

        let gallery = business.gallery || [];
        if (files.gallery) {
          const newGalleryImages = files.gallery.map((file, index) => ({
            url: `/uploads/gallery/${file.filename}`,
            caption: `Image ${index + 1}`,
            sortOrder: gallery.length + index
          }));
          gallery = [...gallery, ...newGalleryImages];
        }

        // Update business profile
        const [updatedBusiness] = await db
          .update(businesses)
          .set({
            name: formData.name,
            description: formData.description,
            logo_url: logoUrl,
            socialMedia: formData.socialMedia,
            contactInfo: formData.contactInfo,
            operatingHours: formData.operatingHours,
            amenities: formData.amenities,
            gallery: gallery,
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
  protectedRouter.delete("/api/businesses/:businessId/gallery/:photoIndex", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
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

      if (business.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to update this business" });
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

  // Register Routes
  app.use(protectedRouter);
  app.use("/api", rosterRouter);
  app.use("/api", slotsRouter);
  app.use("/api", bookingsRouter);

  const httpServer = createServer(app);
  return httpServer;
}