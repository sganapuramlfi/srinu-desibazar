import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { businesses, businessProfileSchema, services, bookings, adCampaigns, adminAnnouncements, userInterests, adAnalytics } from "./db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { setupAuth } from "./auth";
import salonRoutes from "./routes/salon";
import aiSubscriptionRoutes from "./routes/ai-subscription";
import { ModuleLoader } from "./ModuleLoader";
import { adminAuthMiddleware, adminLoginHandler, adminLogoutHandler, adminStatusHandler } from "./middleware/adminAuth";
import modularSystemRoutes from "./routes/modular-system";
import { setupSampleData } from "./routes/sample-data";

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
    cb(null, uniqueSuffix + path.extname(file.originalname));
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

  // Initialize and load modular system
  const moduleLoader = new ModuleLoader();
  
  // Load modules on startup
  moduleLoader.loadModules().catch(error => {
    console.error('Failed to load modules:', error);
  });

  // Register module routes
  app.use('/api/modules', moduleLoader.getRouter());

  // Register modular system routes (full stakeholder cascade)
  app.use('/api/modular', modularSystemRoutes);
  
  // Setup sample data routes
  setupSampleData(app);

  // Admin authentication endpoints
  app.post('/api/admin/login', adminLoginHandler);
  app.post('/api/admin/logout', adminLogoutHandler);
  app.get('/api/admin/status', adminStatusHandler);

  // Module management endpoints (protected with admin auth)
  app.get('/api/admin/modules/status', adminAuthMiddleware, (req, res) => {
    res.json(moduleLoader.getModuleStatus());
  });

  app.get('/api/admin/modules/health', adminAuthMiddleware, async (req, res) => {
    try {
      const health = await moduleLoader.healthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  app.post('/api/admin/modules/:moduleId/toggle', adminAuthMiddleware, async (req, res) => {
    try {
      const { moduleId } = req.params;
      const { enabled } = req.body;
      
      await moduleLoader.toggleModule(moduleId, enabled);
      res.json({ success: true, moduleId, enabled });
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to toggle module' 
      });
    }
  });

  // Register legacy routes (will be migrated to modules)
  app.use('/api', salonRoutes);
  
  // Register AI subscription routes
  app.use('/api/ai', aiSubscriptionRoutes);

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

  // Landing page statistics endpoint
  app.get("/api/statistics", async (req, res) => {
    try {
      // Get business counts by industry
      const allBusinesses = await db
        .select()
        .from(businesses)
        .where(eq(businesses.status, "active"));

      const totalBusinesses = allBusinesses.length;
      const totalBookings = await db.select().from(bookings);
      
      // Industry-wise breakdown
      const industryStats = allBusinesses.reduce((acc, business) => {
        const industry = business.industryType;
        if (!acc[industry]) {
          acc[industry] = 0;
        }
        acc[industry]++;
        return acc;
      }, {} as Record<string, number>);

      // Return statistics for landing page
      res.json({
        totalBusinesses,
        totalBookings: totalBookings.length,
        totalCustomers: 500000, // Mock data for now
        averageRating: 4.8,
        industryStats,
        recentActivity: `${Math.floor(Math.random() * 20) + 5} bookings made in last hour`
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({ error: "Failed to fetch statistics" });
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

  // Update business profile
  app.put("/api/businesses/:businessId/profile", upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
  ]), async (req, res) => {
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

      // Parse the form data
      const formData = JSON.parse(req.body.data);

      // Validate the input
      const result = businessProfileSchema.safeParse(formData);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid input",
          details: result.error.issues 
        });
      }

      // Handle file uploads
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const updateData: any = {
        ...result.data,
        updatedAt: new Date()
      };

      if (files.logo?.[0]) {
        updateData.logo = `/uploads/logos/${files.logo[0].filename}`;
      }

      if (files.gallery?.length) {
        updateData.gallery = files.gallery.map(file => `/uploads/gallery/${file.filename}`);
      }

      // Update the business profile
      const [updated] = await db
        .update(businesses)
        .set(updateData)
        .where(eq(businesses.id, businessId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error updating business profile:', error);
      res.status(500).json({ error: "Failed to update business profile" });
    }
  });

  // ====== ADVERTISING SYSTEM API ENDPOINTS ======

  // Get active admin announcements for top banner
  app.get("/api/admin/announcements/active", async (req, res) => {
    try {
      const now = new Date();
      const announcements = await db
        .select()
        .from(adminAnnouncements)
        .where(and(
          eq(adminAnnouncements.isActive, true),
          gte(adminAnnouncements.expiresAt, now)
        ))
        .orderBy(desc(adminAnnouncements.priority), desc(adminAnnouncements.createdAt));

      res.json(announcements);
    } catch (error) {
      console.error('Error fetching admin announcements:', error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  // Get smart targeted ads for sidebar
  app.get("/api/advertising/targeted-ads", async (req, res) => {
    try {
      const { 
        adType, 
        category, 
        module, 
        interests, 
        priorityBoost = "1" 
      } = req.query;
      
      const now = new Date();
      const boostMultiplier = parseFloat(priorityBoost as string) || 1;

      // Build smart targeting query
      let query = db
        .select({
          id: adCampaigns.id,
          businessId: adCampaigns.businessId,
          title: adCampaigns.title,
          content: adCampaigns.content,
          imageUrl: adCampaigns.imageUrl,
          clickUrl: adCampaigns.clickUrl,
          adType: adCampaigns.adType,
          size: adCampaigns.size,
          animationType: adCampaigns.animationType,
          priority: adCampaigns.priority,
          targetingRules: adCampaigns.targetingRules,
          business: {
            name: businesses.name,
            industryType: businesses.industryType,
            contactInfo: businesses.contactInfo,
          }
        })
        .from(adCampaigns)
        .innerJoin(businesses, eq(businesses.id, adCampaigns.businessId))
        .where(and(
          eq(adCampaigns.status, "active"),
          eq(adCampaigns.adType, adType as string),
          lte(adCampaigns.startDate, now),
          gte(adCampaigns.endDate, now)
        ));

      let ads = await query;

      // Smart targeting logic
      if (category || interests) {
        const interestList = interests ? (interests as string).split(',').filter(Boolean) : [];
        
        ads = ads
          .map(ad => {
            let relevanceScore = ad.priority * boostMultiplier;
            
            // Category matching boost
            if (category && ad.business.industryType === category) {
              relevanceScore += 5; // High boost for exact category match
            }
            
            // Interest-based boost
            if (interestList.length > 0) {
              const hasMatchingInterest = interestList.some(interest => 
                ad.business.industryType.includes(interest) || 
                ad.title.toLowerCase().includes(interest.toLowerCase()) ||
                ad.content.toLowerCase().includes(interest.toLowerCase())
              );
              if (hasMatchingInterest) {
                relevanceScore += 2;
              }
            }
            
            // Module-specific boost
            if (module === 'business' && ad.animationType === 'bounce') {
              relevanceScore += 1; // Boost premium animations for business pages
            }
            
            return { ...ad, relevanceScore };
          })
          .sort((a, b) => b.relevanceScore - a.relevanceScore);
      } else {
        // Default sorting
        ads = ads.sort((a, b) => (b.priority * boostMultiplier) - (a.priority * boostMultiplier));
      }

      // Smart ad count based on context
      let maxAds = 10;
      if (category) maxAds = 15; // Show more ads for category browsing
      if (module === 'business') maxAds = 12; // Show more on business pages

      res.json(ads.slice(0, maxAds));
    } catch (error) {
      console.error('Error fetching smart targeted ads:', error);
      res.status(500).json({ error: "Failed to fetch smart targeted ads" });
    }
  });

  // Track ad analytics (impressions, clicks)
  app.post("/api/advertising/track", async (req, res) => {
    try {
      const { campaignId, action, metadata } = req.body;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;
      const referrer = req.get('Referer');

      // Insert analytics record
      await db.insert(adAnalytics).values({
        campaignId,
        userId: req.user?.id || null,
        sessionId: req.session?.id || null,
        action,
        userAgent,
        ipAddress,
        referrer,
        metadata: metadata || {},
        timestamp: new Date()
      });

      // Update campaign counters
      if (action === 'click') {
        await db
          .update(adCampaigns)
          .set({ 
            clicks: sql`clicks + 1`,
            spent: sql`spent + 0.50` // $0.50 per click
          })
          .where(eq(adCampaigns.id, campaignId));
      } else if (action === 'impression') {
        await db
          .update(adCampaigns)
          .set({ 
            impressions: sql`impressions + 1`,
            spent: sql`spent + 0.01` // $0.01 per impression
          })
          .where(eq(adCampaigns.id, campaignId));
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking ad analytics:', error);
      res.status(500).json({ error: "Failed to track analytics" });
    }
  });

  // Admin endpoint to get all announcements
  app.get("/api/admin/announcements", adminAuthMiddleware, async (req, res) => {
    try {
      const announcements = await db
        .select()
        .from(adminAnnouncements)
        .orderBy(desc(adminAnnouncements.priority), desc(adminAnnouncements.createdAt));

      res.json(announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  // Admin endpoint to create announcements
  app.post("/api/admin/announcements", adminAuthMiddleware, async (req, res) => {
    try {
      const { expiresAt, scheduledAt, ...otherFields } = req.body;
      
      const values = {
        ...otherFields,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const announcement = await db
        .insert(adminAnnouncements)
        .values(values)
        .returning();

      res.json(announcement[0]);
    } catch (error) {
      console.error('Error creating announcement:', error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  // Admin endpoint to update announcement
  app.patch("/api/admin/announcements/:id", adminAuthMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const announcement = await db
        .update(adminAnnouncements)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(adminAnnouncements.id, id))
        .returning();

      res.json(announcement[0]);
    } catch (error) {
      console.error('Error updating announcement:', error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  // Admin endpoint to delete announcement
  app.delete("/api/admin/announcements/:id", adminAuthMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(adminAnnouncements).where(eq(adminAnnouncements.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  // Admin endpoint to get all campaigns
  app.get("/api/admin/campaigns", adminAuthMiddleware, async (req, res) => {
    try {
      const campaigns = await db
        .select({
          id: adCampaigns.id,
          businessId: adCampaigns.businessId,
          title: adCampaigns.title,
          content: adCampaigns.content,
          adType: adCampaigns.adType,
          size: adCampaigns.size,
          animationType: adCampaigns.animationType,
          budget: adCampaigns.budget,
          spent: adCampaigns.spent,
          clicks: adCampaigns.clicks,
          impressions: adCampaigns.impressions,
          status: adCampaigns.status,
          priority: adCampaigns.priority,
          startDate: adCampaigns.startDate,
          endDate: adCampaigns.endDate,
          business: {
            name: businesses.name,
            industryType: businesses.industryType,
          }
        })
        .from(adCampaigns)
        .innerJoin(businesses, eq(businesses.id, adCampaigns.businessId))
        .orderBy(desc(adCampaigns.createdAt));

      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Business endpoint to get their own campaigns
  app.get("/api/business/campaigns", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || req.user.role !== "business") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get business campaigns
      const [business] = await db
        .select()
        .from(businesses)
        .where(and(
          eq(businesses.userId, req.user.id),
          eq(businesses.status, "active")
        ))
        .limit(1);

      if (!business) {
        return res.status(403).json({ error: "No active business found" });
      }

      const campaigns = await db
        .select()
        .from(adCampaigns)
        .where(eq(adCampaigns.businessId, business.id))
        .orderBy(desc(adCampaigns.createdAt));

      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching business campaigns:', error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Business endpoint to create ad campaigns
  app.post("/api/advertising/campaigns", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || req.user.role !== "business") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify business ownership
      const [business] = await db
        .select()
        .from(businesses)
        .where(and(
          eq(businesses.userId, req.user.id),
          eq(businesses.status, "active")
        ))
        .limit(1);

      if (!business) {
        return res.status(403).json({ error: "No active business found" });
      }

      const campaign = await db
        .insert(adCampaigns)
        .values({
          ...req.body,
          businessId: business.id,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      res.json(campaign[0]);
    } catch (error) {
      console.error('Error creating ad campaign:', error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  return httpServer;
}