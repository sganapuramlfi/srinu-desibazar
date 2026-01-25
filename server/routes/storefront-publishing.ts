import { Router } from "express";
import { db } from "../../db/index.js";
import { businessTenants } from "../../db/index.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireBusinessAccess } from "../middleware/businessAccess.js";

const router = Router();

// Validation schemas
const publishingSettingsSchema = z.object({
  publishedSections: z.array(z.enum([
    "menu", "services", "gallery", "reviews", 
    "contact", "social", "bookings", "staff", "tables", "events", "products"
  ])).optional(),
  storefrontSettings: z.object({
    showReviews: z.boolean().optional(),
    showGallery: z.boolean().optional(),
    showContactInfo: z.boolean().optional(),
    showSocialMedia: z.boolean().optional(),
    showOperatingHours: z.boolean().optional(),
    theme: z.enum(["default", "modern", "classic", "minimal"]).optional()
  }).optional()
});

// Get current publishing settings (Dashboard)
router.get("/businesses/:businessId/publishing", 
  requireBusinessAccess(["owner", "manager"]), 
  async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      
      const [business] = await db
        .select({
          id: businessTenants.id,
          name: businessTenants.name,
          industryType: businessTenants.industryType,
          publishedSections: businessTenants.publishedSections,
          storefrontSettings: businessTenants.storefrontSettings
        })
        .from(businessTenants)
        .where(eq(businessTenants.id, businessId))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      res.json(business);
    } catch (error) {
      console.error('Error fetching publishing settings:', error);
      res.status(500).json({ error: "Failed to fetch publishing settings" });
    }
  }
);

// Update publishing settings (Dashboard)
router.put("/businesses/:businessId/publishing", 
  requireBusinessAccess(["owner", "manager"]), 
  async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const result = publishingSettingsSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid input", 
          details: result.error.issues 
        });
      }

      const updateData: any = {};
      if (result.data.publishedSections !== undefined) {
        updateData.publishedSections = result.data.publishedSections;
      }
      if (result.data.storefrontSettings !== undefined) {
        updateData.storefrontSettings = result.data.storefrontSettings;
      }

      const [updated] = await db
        .update(businessTenants)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(businessTenants.id, businessId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Business not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating publishing settings:', error);
      res.status(500).json({ error: "Failed to update publishing settings" });
    }
  }
);

// Get available content for publishing (Dashboard helper)
router.get("/businesses/:businessId/available-content", 
  requireBusinessAccess(["owner", "manager"]), 
  async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      
      // Get business info
      const [business] = await db
        .select({
          industryType: businessTenants.industryType
        })
        .from(businessTenants)
        .where(eq(businessTenants.id, businessId))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Check what content actually exists
      const availableContent = {
        menu: false,
        services: false,
        gallery: false,
        staff: false,
        tables: false,
        // Always available
        contact: true,
        social: true,
        reviews: true
      };

      // Check based on industry type
      if (business.industryType === 'restaurant') {
        // Check if menu items exist
        const menuCount = await db.execute(`
          SELECT COUNT(*) as count FROM restaurant_menu_items 
          WHERE business_id = ${businessId}
        `);
        availableContent.menu = parseInt(menuCount.rows[0].count) > 0;

        // Check if tables exist
        const tablesCount = await db.execute(`
          SELECT COUNT(*) as count FROM restaurant_tables 
          WHERE business_id = ${businessId}
        `);
        availableContent.tables = parseInt(tablesCount.rows[0].count) > 0;
      }

      if (business.industryType === 'salon') {
        // Check if services exist
        const servicesCount = await db.execute(`
          SELECT COUNT(*) as count FROM salon_services 
          WHERE business_id = ${businessId}
        `);
        availableContent.services = parseInt(servicesCount.rows[0].count) > 0;

        // Check if staff exist
        const staffCount = await db.execute(`
          SELECT COUNT(*) as count FROM salon_staff 
          WHERE business_id = ${businessId}
        `);
        availableContent.staff = parseInt(staffCount.rows[0].count) > 0;
      }

      res.json({
        industryType: business.industryType,
        availableContent
      });
    } catch (error) {
      console.error('Error checking available content:', error);
      res.status(500).json({ error: "Failed to check available content" });
    }
  }
);

export default router;