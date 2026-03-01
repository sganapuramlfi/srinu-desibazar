import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "../db/index.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { 
  businessTenants, 
  businessAccess, 
  bookableItems, 
  bookings, 
  advertisements, 
  platformUsers,
  businessDirectory,
  salonServices,
  restaurantMenuCategories,
  restaurantMenuItems,
  businessSubscriptions
} from "../db/index.js";
import { eq, and, gte, lte, desc, sql, or, ilike } from "drizzle-orm";
import salonRoutes from "./routes/salon";
import restaurantRoutes from "./routes/restaurant";
import reviewRoutes from "./routes/reviews";
import storefrontPublishingRoutes from "./routes/storefront-publishing";
import publicStorefrontRoutes from "./routes/public-storefront";
import bookingOperationsRoutes from "./routes/booking-operations";
import businessCommunicationsRoutes from "./routes/business-communications";
import businessAlertsRoutes from "./routes/business-alerts";
import aiSubscriptionRoutes from "./routes/ai-subscription";
import billingRoutes from "./routes/billing";
import aiPublicDataRoutes from "./routes/ai-public-data";
import aiAbrakadabraEnhancedRoutes from "./routes/ai-abrakadabra-enhanced";
import vectorSearchTestRoutes from "./routes/vector-search-test";
import debugAbrakadabraRoutes from "./routes/debug-abrakadabra";
import testSurgicalFixRoutes from "./routes/test-surgical-fix";
import aiAbrakadabraFixedRoutes from "./routes/ai-abrakadabra-fixed";
import consumerRoutes from "./routes/consumer";
import consumerOrdersRoutes from "./routes/consumer-orders";
import chatRoutes from "./routes/chat";
import { ModuleLoader } from "./ModuleLoader";
import { adminAuthMiddleware, adminLoginHandler, adminLogoutHandler, adminStatusHandler } from "./middleware/adminAuth";
import modularSystemRoutes from "./routes/modular-system";
// import { setupSampleData } from "./routes/sample-data";
// NOTE: sample-data.ts requires schema updates (businessTenants, platformUsers, businessAccess)
// Not critical - use db/populate-* scripts instead

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

  // Note: setupAuth is called in index.ts before registerRoutes - do not call it again here
  // to avoid creating a second session store that overwrites req.user on every request

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
  
  // NOTE: setupSampleData() disabled - use db/populate-* scripts for sample data
  // The sample-data.ts file needs updating to work with new schema (businessTenants, businessAccess)

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
  app.use('/api', restaurantRoutes);
  app.use('/api', reviewRoutes);
  
  // Register new publishing and public storefront routes
  app.use('/api', storefrontPublishingRoutes);
  app.use('/api', publicStorefrontRoutes);
  
  // Register booking operations routes (Universal Constraint Framework)
  app.use('/api', bookingOperationsRoutes);
  
  // Register business communications routes (Customer-Business Messaging)
  app.use('/api', businessCommunicationsRoutes);
  
  // Register business alerts routes (Business Owner Dashboard)
  app.use('/api', businessAlertsRoutes);
  
  // Register AI subscription routes
  app.use('/api/ai-subscription', aiSubscriptionRoutes);

  // Register billing routes (Stripe subscription and payment management)
  app.use('/api/billing', billingRoutes);

  app.use('/api/ai-genie', aiPublicDataRoutes);
  app.use('/api/ai-public-data', aiPublicDataRoutes); // Alternative route for frontend compatibility
  app.use('/api', aiAbrakadabraEnhancedRoutes); // Enhanced two-tier AI system
  app.use('/api', aiAbrakadabraFixedRoutes); // Fixed two-tier AI system with surgical fixes

  // AI health/status endpoint — check if Ollama is live
  app.get('/api/ai/status', async (req, res) => {
    const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11435';
    try {
      const response = await fetch(`${ollamaEndpoint}/api/tags`, {
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const data = await response.json() as { models?: Array<{ name: string }> };
        return res.json({
          ollama: 'online',
          endpoint: ollamaEndpoint,
          models: (data.models || []).map((m: { name: string }) => m.name),
          provider: process.env.AI_PROVIDER || 'not-set',
          enabled: process.env.AI_ENABLED === 'true'
        });
      }
      throw new Error(`Ollama responded with ${response.status}`);
    } catch (error: any) {
      return res.json({
        ollama: 'offline',
        endpoint: ollamaEndpoint,
        error: error.message,
        provider: process.env.AI_PROVIDER || 'not-set',
        enabled: process.env.AI_ENABLED === 'true',
        fallback: 'mock'
      });
    }
  });
  app.use('/api', vectorSearchTestRoutes); // Vector search testing
  app.use('/api', debugAbrakadabraRoutes); // Debug Abrakadabra service
  app.use('/api', testSurgicalFixRoutes); // Surgical fix test endpoint
  
  // Register consumer routes (customer booking, ordering, messaging)
  app.use('/api', consumerRoutes);
  app.use('/api', consumerOrdersRoutes);
  
  // Register chat routes (real-time messaging between consumers and businesses)
  app.use('/api/chat', chatRoutes);

  // Get business by slug
  app.get("/api/businesses/slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      
      const [business] = await db
        .select()
        .from(businessTenants)
        .where(eq(businessTenants.slug, slug))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      res.json(business);
    } catch (error) {
      console.error("Error fetching business by slug:", error);
      res.status(500).json({ error: "Failed to fetch business" });
    }
  });

  // ==================================================================================
  // DEPRECATED: Legacy Services Routes - COMMENTED OUT
  // ==================================================================================
  // These routes reference a non-existent "services" table and cause 500 errors.
  // The platform uses industry-specific tables instead:
  //   - Salon businesses: use /api/salon/:businessId/services (salonServices table)
  //   - Restaurant businesses: use /api/restaurant/:businessId/menu-items (restaurantMenuItems table)
  //
  // Migration completed: 2026-02-15
  // These routes can be safely removed in next major version.
  // ==================================================================================

  /*
  app.post("/api/businesses/:businessId/services", async (req, res) => {
    // REMOVED - Use industry-specific endpoints instead
  });

  app.get("/api/businesses/:businessId/services", async (req, res) => {
    // REMOVED - Use industry-specific endpoints instead
  });
  */

  // ==================================================================================
  // DEPRECATED: Legacy Booking Routes - COMMENTED OUT
  // ==================================================================================
  // These routes reference the non-existent "services" table and will fail.
  // The platform now uses:
  //   - Universal bookings: /api/bookings/* (server/routes/bookings.ts)
  //   - Business bookings: Use /api/bookings with businessId filter
  //   - Industry-specific bookings handled by salon/restaurant modules
  //
  // Migration completed: 2026-02-15
  // ==================================================================================

  /*
  app.post("/api/services/:serviceId/bookings", async (req, res) => {
    // REMOVED - Use /api/bookings endpoints in server/routes/bookings.ts
  });

  app.get("/api/businesses/:businessId/bookings", async (req, res) => {
    // REMOVED - Use /api/bookings endpoints in server/routes/bookings.ts
  });
  */

  // Business Routes
  app.get("/api/businesses", async (req, res) => {
    try {
      const { industry, limit = "50", page = "1" } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const offset = (pageNum - 1) * limitNum;

      const conditions: any[] = [eq(businessTenants.status, "active")];
      if (industry && typeof industry === 'string') {
        conditions.push(eq(businessTenants.industryType, industry));
      }

      const result = await db
        .select()
        .from(businessTenants)
        .where(and(...conditions))
        .limit(limitNum)
        .offset(offset);

      res.json(result);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  // Featured businesses for landing page (top active with most bookings)
  app.get("/api/businesses/featured", async (req, res) => {
    try {
      const featured = await db
        .select()
        .from(businessTenants)
        .where(eq(businessTenants.status, "active"))
        .limit(6);

      res.json(featured);
    } catch (error) {
      console.error('Error fetching featured businesses:', error);
      res.status(500).json({ error: "Failed to fetch featured businesses" });
    }
  });

  // Business Search endpoint with SQL filtering
  app.get("/api/businesses/search", async (req, res) => {
    try {
      const { q, industry, city, limit = "20", page = "1" } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const offset = (pageNum - 1) * limitNum;

      const conditions: any[] = [eq(businessTenants.status, "active")];

      if (q && typeof q === 'string' && q.trim()) {
        const term = `%${q.trim()}%`;
        conditions.push(
          or(
            ilike(businessTenants.name, term),
            ilike(businessTenants.description, term),
            ilike(businessTenants.industryType, term)
          )
        );
      }

      if (industry && typeof industry === 'string') {
        conditions.push(eq(businessTenants.industryType, industry));
      }

      const results = await db
        .select()
        .from(businessTenants)
        .where(and(...conditions))
        .orderBy(businessTenants.name)
        .limit(limitNum)
        .offset(offset);

      res.json({
        businesses: results,
        total: results.length,
        page: pageNum,
        limit: limitNum,
        query: { q, industry, city }
      });
    } catch (error: any) {
      console.error('Error searching businesses:', error.message);
      res.status(500).json({ error: "Failed to search businesses" });
    }
  });

  // Landing page statistics endpoint
  app.get("/api/statistics", async (req, res) => {
    try {
      // Get business counts by industry
      const allBusinesses = await db
        .select()
        .from(businessTenants)
        .where(eq(businessTenants.status, "active"));

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
        .from(businessTenants)
        .where(eq(businessTenants.id, businessId))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Format the business data for frontend compatibility
      const formattedBusiness = {
        ...business,
        // Ensure gallery is an array of strings
        galleryImages: Array.isArray(business.gallery) ? business.gallery : [],
        // Ensure amenities is an array of strings
        amenities: Array.isArray(business.amenities) ? business.amenities : [],
        // Add location object for coordinates
        location: business.latitude && business.longitude ? {
          latitude: parseFloat(business.latitude),
          longitude: parseFloat(business.longitude)
        } : undefined,
        // TODO: Add these fields to the database schema
        partnerLinks: business.partnerLinks || {},
        holidayPolicy: business.holidayPolicy || null
      };

      res.json(formattedBusiness);
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
      // New auth system: platformUsers have no .role field — just check authenticated
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const businessId = parseInt(req.params.businessId);
      const userId = (req.user as any).id;

      // Verify ownership via businessAccess table (businessTenants has no userId column)
      const [access] = await db
        .select()
        .from(businessAccess)
        .where(
          and(
            eq(businessAccess.businessId, businessId),
            eq(businessAccess.userId, userId),
            eq(businessAccess.isActive, true)
          )
        )
        .limit(1);

      if (!access || !['owner', 'manager'].includes(access.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Parse the form data
      let formData: any;
      try {
        formData = JSON.parse(req.body.data);
      } catch {
        return res.status(400).json({ error: "Invalid form data" });
      }

      // Map only columns that exist in businessTenants
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const updateData: any = { updatedAt: new Date() };

      if (formData.name)          updateData.name          = formData.name;
      if (formData.description)   updateData.description   = formData.description;
      if (formData.contactInfo)   updateData.contactInfo   = formData.contactInfo;
      if (formData.operatingHours) updateData.operatingHours = formData.operatingHours;
      if (formData.amenities)     updateData.amenities     = formData.amenities;
      if (formData.socialMedia)   updateData.socialMedia   = formData.socialMedia;

      // Location coordinates
      if (formData.location?.latitude != null)
        updateData.latitude  = String(formData.location.latitude);
      if (formData.location?.longitude != null)
        updateData.longitude = String(formData.location.longitude);

      // File uploads — use correct DB column names
      if (files.logo?.[0]) {
        updateData.logoUrl = `/uploads/logos/${files.logo[0].filename}`;
      }
      if (files.gallery?.length) {
        updateData.gallery = files.gallery.map(f => `/uploads/gallery/${f.filename}`);
      }

      // Mark onboarding complete when profile is saved
      updateData.onboardingCompleted = true;

      const [updated] = await db
        .update(businessTenants)
        .set(updateData)
        .where(eq(businessTenants.id, businessId))
        .returning();

      res.json({ success: true, data: updated });
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

  // ============================================================================
  // BUSINESS SUBSCRIPTION ENDPOINTS
  // ============================================================================

  // Get business subscription info
  app.get("/api/businesses/:businessId/subscription", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify user has access to this business
      const [access] = await db
        .select()
        .from(businessAccess)
        .where(and(
          eq(businessAccess.businessId, businessId),
          eq(businessAccess.userId, req.user.id),
          eq(businessAccess.isActive, true)
        ))
        .limit(1);

      if (!access) {
        return res.status(403).json({ error: "Access denied to this business" });
      }

      // Get subscription with plan details
      const [subscription] = await db
        .select({
          id: businessSubscriptions.id,
          businessId: businessSubscriptions.businessId,
          planId: businessSubscriptions.planId,
          status: businessSubscriptions.status,
          trialStartDate: businessSubscriptions.trialStartDate,
          trialEndDate: businessSubscriptions.trialEndDate,
          paidStartDate: businessSubscriptions.paidStartDate,
          enabledModules: businessSubscriptions.enabledModules,
          adTargeting: businessSubscriptions.adTargeting,
          adPriority: businessSubscriptions.adPriority,
          maxAdsPerMonth: businessSubscriptions.maxAdsPerMonth,
          features: businessSubscriptions.features,
          tier: businessSubscriptions.tier
        })
        .from(businessSubscriptions)
        .where(eq(businessSubscriptions.businessId, businessId))
        .limit(1);

      if (!subscription) {
        return res.status(404).json({ error: "No subscription found for this business" });
      }

      // Parse JSON fields
      const enabledModules = subscription.enabledModules ? JSON.parse(subscription.enabledModules) : [];
      const features = subscription.features ? JSON.parse(subscription.features) : {};

      res.json({
        ...subscription,
        enabledModules,
        features,
        daysRemaining: subscription.trialEndDate ? 
          Math.ceil((new Date(subscription.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
          null
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Update business subscription modules
  app.post("/api/businesses/:businessId/subscription/modules", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const { enabledModules } = req.body;
      
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify user has access to this business
      const [access] = await db
        .select()
        .from(businessAccess)
        .where(and(
          eq(businessAccess.businessId, businessId),
          eq(businessAccess.userId, req.user.id),
          eq(businessAccess.isActive, true)
        ))
        .limit(1);

      if (!access) {
        return res.status(403).json({ error: "Access denied to this business" });
      }

      // Update enabled modules
      await db
        .update(businessSubscriptions)
        .set({ 
          enabledModules: JSON.stringify(enabledModules),
          updatedAt: new Date()
        })
        .where(eq(businessSubscriptions.businessId, businessId));

      res.json({ success: true, enabledModules });
    } catch (error) {
      console.error('Error updating subscription modules:', error);
      res.status(500).json({ error: "Failed to update subscription modules" });
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

      // Map sidebar_left/sidebar_right positional params to "sidebar" DB type
      const requestedPosition = (adType as string) || "sidebar_left";
      const dbAdType = (requestedPosition === "sidebar_left" || requestedPosition === "sidebar_right")
        ? "sidebar"
        : requestedPosition;

      // Query advertisements table (the actual DB table)
      const rawAds = await db
        .select({
          id: advertisements.id,
          businessId: advertisements.advertiserId,
          title: advertisements.title,
          content: advertisements.description,
          imageUrl: advertisements.imageUrl,
          clickUrl: advertisements.ctaUrl,
          adType: advertisements.adType,
          impressions: advertisements.impressions,
          clicks: advertisements.clicks,
          business: {
            name: businessTenants.name,
            industryType: businessTenants.industryType,
            contactInfo: businessTenants.contactInfo,
          }
        })
        .from(advertisements)
        .innerJoin(businessTenants, eq(businessTenants.id, advertisements.advertiserId))
        .where(and(
          eq(advertisements.status, "active"),
          eq(advertisements.adType, dbAdType),
          or(
            sql`${advertisements.startDate} IS NULL`,
            lte(advertisements.startDate, now)
          ),
          or(
            sql`${advertisements.endDate} IS NULL`,
            gte(advertisements.endDate, now)
          )
        ));

      // Normalise shape: add display defaults missing from advertisements schema
      const ANIMATION_TYPES = ["static", "slide", "fade", "flash", "bounce"] as const;
      let ads = rawAds.map((ad, idx) => ({
        ...ad,
        adType: requestedPosition as "sidebar_left" | "sidebar_right",
        size: "medium" as const,
        animationType: ANIMATION_TYPES[idx % ANIMATION_TYPES.length],
        priority: 5,
      }));

      // Smart targeting logic
      if (category || interests) {
        const interestList = interests ? (interests as string).split(',').filter(Boolean) : [];

        ads = ads
          .map(ad => {
            let relevanceScore = ad.priority * boostMultiplier;

            if (category && ad.business.industryType === category) {
              relevanceScore += 5;
            }

            if (interestList.length > 0) {
              const hasMatchingInterest = interestList.some(interest =>
                ad.business.industryType.includes(interest) ||
                ad.title.toLowerCase().includes(interest.toLowerCase()) ||
                ad.content.toLowerCase().includes(interest.toLowerCase())
              );
              if (hasMatchingInterest) relevanceScore += 2;
            }

            return { ...ad, relevanceScore };
          })
          .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
      } else {
        ads = ads.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
      }

      let maxAds = 10;
      if (category) maxAds = 15;
      if (module === 'business') maxAds = 12;

      res.json(ads.slice(0, maxAds));
    } catch (error) {
      console.error('Error fetching smart targeted ads:', error);
      res.status(500).json({ error: "Failed to fetch smart targeted ads" });
    }
  });

  // Track ad analytics (impressions, clicks)
  app.post("/api/advertising/track", async (req, res) => {
    try {
      const { campaignId, action } = req.body;

      if (!campaignId || !action) {
        return res.json({ success: true }); // Silently ignore malformed requests
      }

      if (action === 'click') {
        await db
          .update(advertisements)
          .set({ clicks: sql`${advertisements.clicks} + 1` })
          .where(eq(advertisements.id, parseInt(campaignId)));
      } else if (action === 'impression') {
        await db
          .update(advertisements)
          .set({ impressions: sql`${advertisements.impressions} + 1` })
          .where(eq(advertisements.id, parseInt(campaignId)));
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking ad analytics:', error);
      res.status(500).json({ error: "Failed to track analytics" });
    }
  });

  // Admin analytics endpoint
  app.get("/api/admin/analytics", adminAuthMiddleware, async (req, res) => {
    try {
      const { level = "platform", dimension, startDate, endDate } = req.query;
      const { getAnalytics } = await import("./jobs/aggregateAnalytics.js");
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const data = await getAnalytics({
        level: level as any,
        dimension: dimension as string | undefined,
        startDate: start,
        endDate: end,
      });
      res.json(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: "Failed to fetch analytics" });
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

  // Admin endpoint to get all campaigns (uses advertisements table)
  app.get("/api/admin/campaigns", adminAuthMiddleware, async (req, res) => {
    try {
      const campaigns = await db
        .select({
          id: advertisements.id,
          businessId: advertisements.advertiserId,
          title: advertisements.title,
          content: advertisements.description,
          adType: advertisements.adType,
          budgetTotal: advertisements.budgetTotal,
          spentAmount: advertisements.spentAmount,
          clicks: advertisements.clicks,
          impressions: advertisements.impressions,
          status: advertisements.status,
          startDate: advertisements.startDate,
          endDate: advertisements.endDate,
          createdAt: advertisements.createdAt,
          business: {
            name: businessTenants.name,
            industryType: businessTenants.industryType,
          }
        })
        .from(advertisements)
        .innerJoin(businessTenants, eq(businessTenants.id, advertisements.advertiserId))
        .orderBy(desc(advertisements.createdAt));

      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Business endpoint to get their own campaigns
  // TODO: Fix route to use businessAccess table instead of userId
  // app.get("/api/business/campaigns", async (req, res) => {
  //   try {
  //     if (!req.isAuthenticated() || !req.user || req.user.role !== "business") {
  //       return res.status(401).json({ error: "Unauthorized" });
  //     }

  //     // Get business campaigns - NEEDS FIX: userId no longer exists
  //     const [business] = await db
  //       .select()
  //       .from(businessTenants)
  //       .where(and(
  //         eq(businessTenants.userId, req.user.id),
  //         eq(businessTenants.status, "active")
  //       ))
  //       .limit(1);

  //     if (!business) {
  //       return res.status(403).json({ error: "No active business found" });
  //     }

  //     const campaigns = await db
  //       .select()
  //       .from(adCampaigns)
  //       .where(eq(adCampaigns.businessId, business.id))
  //       .orderBy(desc(adCampaigns.createdAt));

  //     res.json(campaigns);
  //   } catch (error) {
  //     console.error('Error fetching business campaigns:', error);
  //     res.status(500).json({ error: "Failed to fetch campaigns" });
  //   }
  // });

  // TODO: Fix route to use businessAccess table instead of userId
  // app.post("/api/advertising/campaigns", async (req, res) => {
  //   try {
  //     if (!req.isAuthenticated() || !req.user || req.user.role !== "business") {
  //       return res.status(401).json({ error: "Unauthorized" });
  //     }

  //     // Verify business ownership - NEEDS FIX: userId no longer exists
  //     const [business] = await db
  //       .select()
  //       .from(businessTenants)
  //       .where(and(
  //         eq(businessTenants.userId, req.user.id),
  //         eq(businessTenants.status, "active")
  //       ))
  //       .limit(1);

  //     if (!business) {
  //       return res.status(403).json({ error: "No active business found" });
  //     }

  //     const campaign = await db
  //       .insert(adCampaigns)
  //       .values({
  //         ...req.body,
  //         businessId: business.id,
  //         createdAt: new Date(),
  //         updatedAt: new Date()
  //       })
  //       .returning();

  //     res.json(campaign[0]);
  //   } catch (error) {
  //     console.error('Error creating ad campaign:', error);
  //     res.status(500).json({ error: "Failed to create campaign" });
  //   }
  // });

  return httpServer;
}