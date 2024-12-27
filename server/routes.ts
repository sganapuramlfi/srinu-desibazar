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

  // Setup authentication first
  setupAuth(app);

  // API Routes prefix middleware
  app.use('/api', (req, res, next) => {
    // Set headers to prevent Vite from intercepting API requests
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Register salon routes
  app.use('/api', salonRoutes);

  // Services Routes
  app.post("/api/businesses/:businessId/services", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || req.user.role !== "business") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const businessId = parseInt(req.params.businessId);
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

      if (!business || business.userId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { name, description, duration, price, maxParticipants } = req.body;
      const [service] = await db
        .insert(services)
        .values({
          businessId,
          name,
          description,
          duration,
          price,
          maxParticipants,
          createdAt: new Date()
        })
        .returning();

      res.json(service);
    } catch (error) {
      console.error('Error creating service:', error);
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  app.get("/api/businesses/:businessId/services", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const result = await db
        .select()
        .from(services)
        .where(and(
          eq(services.businessId, businessId),
          eq(services.isActive, true)
        ));

      res.json(result);
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Bookings Routes
  app.post("/api/services/:serviceId/bookings", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const serviceId = parseInt(req.params.serviceId);
      const { startTime, endTime, notes } = req.body;

      // Verify service exists and is active
      const [service] = await db
        .select()
        .from(services)
        .where(and(
          eq(services.id, serviceId),
          eq(services.isActive, true)
        ))
        .limit(1);

      if (!service) {
        return res.status(404).json({ error: "Service not found or inactive" });
      }

      // Create booking
      const [booking] = await db
        .insert(bookings)
        .values({
          serviceId,
          customerId: req.user.id,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          notes,
          createdAt: new Date()
        })
        .returning();

      res.json(booking);
    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  app.get("/api/businesses/:businessId/bookings", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const businessId = parseInt(req.params.businessId);

      // For business owners - show all bookings for their business
      if (req.user.role === "business") {
        const [business] = await db
          .select()
          .from(businesses)
          .where(eq(businesses.id, businessId))
          .limit(1);

        if (!business || business.userId !== req.user.id) {
          return res.status(403).json({ error: "Forbidden" });
        }

        const businessBookings = await db
          .select({
            booking: bookings,
            service: services
          })
          .from(bookings)
          .innerJoin(services, eq(services.id, bookings.serviceId))
          .where(eq(services.businessId, businessId));

        return res.json(businessBookings);
      }

      // For customers - only show their own bookings
      const customerBookings = await db
        .select({
          booking: bookings,
          service: services
        })
        .from(bookings)
        .innerJoin(services, eq(services.id, bookings.serviceId))
        .where(and(
          eq(services.businessId, businessId),
          eq(bookings.customerId, req.user.id)
        ));

      res.json(customerBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

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

  return httpServer;
}