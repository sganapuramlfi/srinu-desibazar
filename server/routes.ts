import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import multer from "multer";
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

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
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
        const formData = JSON.parse(req.body.data);
        const result = businessProfileSchema.safeParse(formData);

        if (!result.success) {
          return res.status(400).json({
            error: "Invalid input",
            details: result.error.issues
          });
        }

        // Handle file uploads
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        let logoUrl = business.logo;
        if (files.logo?.[0]) {
          // In a real application, you would upload this to a cloud storage
          // For now, we'll just store a placeholder URL
          logoUrl = `/uploads/logos/${files.logo[0].originalname}`;
        }

        let gallery = business.gallery || [];
        if (files.gallery) {
          // In a real application, you would upload these to a cloud storage
          const newGalleryImages = files.gallery.map((file, index) => ({
            url: `/uploads/gallery/${file.originalname}`,
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
            logo: logoUrl,
            socialMedia: formData.socialMedia,
            contactInfo: formData.contactInfo,
            operatingHours: formData.operatingHours,
            amenities: formData.amenities,
            gallery: gallery,
            updatedAt: new Date()
          })
          .where(eq(businesses.id, businessId))
          .returning();

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

  const httpServer = createServer(app);
  return httpServer;
}