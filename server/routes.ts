import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
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

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const logosDir = path.join(uploadsDir, 'logos');
const galleryDir = path.join(uploadsDir, 'gallery');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });
if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });

// Configure multer for file uploads
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
  setupAuth(app);

  // Register salon-specific routes
  app.use("/api", salonRouter);

  // Register roster routes
  app.use("/api", rosterRouter);

  // Register slots management routes
  app.use("/api", slotsRouter);

  // Register booking routes
  app.use("/api", bookingsRouter);

  // Staff Routes
  app.get("/api/businesses/:businessId/staff", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

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

  // Business Profile Routes
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

  app.put(
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
        console.log('Received form data:', formData); // Add logging

        const result = businessProfileSchema.safeParse(formData);
        if (!result.success) {
          return res.status(400).json({
            error: "Invalid input",
            details: result.error.issues
          });
        }

        // Handle file uploads
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        console.log('Uploaded files:', files); // Add logging

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

        console.log('Updated business:', updatedBusiness); // Add logging
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

  // Business Routes
  app.get("/api/businesses/:id", async (req, res) => {
    try {
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, parseInt(req.params.id)))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      res.json(business);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch business" });
    }
  });

  // Industry-specific Routes
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

      let servicesList = await db
        .select()
        .from(salonServices)
        .where(eq(salonServices.businessId, businessId));

      res.json(servicesList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/businesses", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }

      const [business] = await db
        .insert(businesses)
        .values({ ...req.body, userId: req.user.id })
        .returning();

      res.json(business);
    } catch (error) {
      res.status(500).json({ error: "Failed to create business" });
    }
  });

  app.get("/api/businesses", async (req, res) => {
    try {
      const { industryType } = req.query;
      let query = db.select().from(businesses);

      if (industryType) {
        query = query.where(eq(businesses.industryType, industryType as string));
      }

      const result = await query;
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  app.delete("/api/businesses/:businessId/gallery/:photoIndex", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}