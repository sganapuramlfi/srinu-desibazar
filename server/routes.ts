import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
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
  // Set up authentication first
  setupAuth(app);

  // Apply global middleware before route registration
  app.use('/api/businesses/:businessId/*', requireAuth, hasBusinessAccess);

  // Register all business-related routes with proper middleware
  app.use("/api", salonRouter);
  app.use("/api", rosterRouter);
  app.use("/api", slotsRouter);
  app.use("/api", bookingsRouter);

  // Public Business Routes
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
        .values({ ...req.body, userId: req.user!.id })
        .returning();

      res.json(business);
    } catch (error) {
      res.status(500).json({ error: "Failed to create business" });
    }
  });

  // Public Business Listing
  app.get("/api/businesses", async (req, res) => {
    try {
      const result = await db
        .select()
        .from(businesses);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

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

  // Messaging System Routes
  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const [conversation] = await db
        .insert(conversations)
        .values({
          type: req.body.type,
          status: "active",
        })
        .returning();

      await db.insert(conversationParticipants).values({
        conversationId: conversation.id,
        userId: req.user!.id,
        role: req.body.role,
      });

      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.post("/api/conversations/:conversationId/messages", requireAuth, async (req, res) => {
    try {
      const [message] = await db
        .insert(messages)
        .values({
          conversationId: parseInt(req.params.conversationId),
          senderId: req.user!.id,
          content: req.body.content,
          type: req.body.type || "text",
          metadata: req.body.metadata,
        })
        .returning();

      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Waitlist Management Routes
  app.post("/api/businesses/:businessId/waitlist", requireAuth, async (req, res) => {
    try {
      const [entry] = await db
        .insert(waitlist)
        .values({
          businessId: parseInt(req.params.businessId),
          customerId: req.user!.id,
          serviceId: req.body.serviceId,
          preferredStaffId: req.body.preferredStaffId,
          preferredTimeSlots: req.body.preferredTimeSlots,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        })
        .returning();

      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to join waitlist" });
    }
  });

  // Ad Space Management Routes
  app.post("/api/businesses/:businessId/ad-campaigns", requireAuth, hasBusinessAccess, async (req, res) => {
    try {
      const [campaign] = await db
        .insert(adCampaigns)
        .values({
          businessId: parseInt(req.params.businessId),
          name: req.body.name,
          budget: req.body.budget,
          startDate: new Date(req.body.startDate),
          endDate: new Date(req.body.endDate),
          targetAudience: req.body.targetAudience,
        })
        .returning();

      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to create ad campaign" });
    }
  });

  app.post("/api/businesses/:businessId/advertisements", requireAuth, hasBusinessAccess, async (req, res) => {
    try {
      const [ad] = await db
        .insert(advertisements)
        .values({
          campaignId: req.body.campaignId,
          spaceId: req.body.spaceId,
          title: req.body.title,
          description: req.body.description,
          imageUrl: req.body.imageUrl,
          targetUrl: req.body.targetUrl,
          startDate: new Date(req.body.startDate),
          endDate: new Date(req.body.endDate),
        })
        .returning();

      res.json(ad);
    } catch (error) {
      res.status(500).json({ error: "Failed to create advertisement" });
    }
  });

  // Booking Rescheduling Routes
  app.post("/api/businesses/:businessId/bookings/:bookingId/reschedule", requireAuth, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const newSlotId = req.body.newSlotId;
      const reason = req.body.reason;

      // Record the rescheduling action
      await db.insert(bookingHistory).values({
        bookingId,
        action: "rescheduled",
        previousSlotId: req.body.previousSlotId,
        newSlotId,
        reason,
        performedBy: req.user!.id,
      });

      // Update the booking with the new slot
      const [updatedBooking] = await db
        .update(bookingHistory)
        .set({
          slotId: newSlotId,
          updatedAt: new Date(),
        })
        .where(eq(bookingHistory.id, bookingId))
        .returning();

      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ error: "Failed to reschedule booking" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}