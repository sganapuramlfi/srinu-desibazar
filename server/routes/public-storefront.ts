import { Router } from "express";
import { db } from "../../db/index.js";
import { 
  businessTenants, 
  restaurantMenuCategories, 
  restaurantMenuItems,
  restaurantTables,
  salonServices,
  salonStaff
} from "../../db/index.js";
import { eq } from "drizzle-orm";

const router = Router();

// Resolve business slug to ID
router.get("/public/businesses/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [business] = await db
      .select({
        id: businessTenants.id,
        slug: businessTenants.slug,
        status: businessTenants.status
      })
      .from(businessTenants)
      .where(eq(businessTenants.slug, slug))
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    if (business.status !== 'active') {
      return res.status(404).json({ error: "Business not available" });
    }

    res.json({ businessId: business.id, slug: business.slug });
  } catch (error) {
    console.error("Error resolving business slug:", error);
    res.status(500).json({ error: "Failed to resolve business slug" });
  }
});

// Get public business profile with published sections only
router.get("/public/businesses/:businessId/profile", async (req, res) => {
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

    // Format the business data for public consumption
    const publicBusiness = {
      id: business.id,
      name: business.name,
      slug: business.slug,
      industryType: business.industryType,
      status: business.status,
      description: business.description,
      logoUrl: business.logoUrl,
      publishedSections: business.publishedSections || [],
      storefrontSettings: business.storefrontSettings || {},
      
      // Conditional fields based on storefront settings
      ...(business.storefrontSettings?.showGallery !== false && {
        galleryImages: Array.isArray(business.gallery) ? business.gallery : []
      }),
      ...(business.storefrontSettings?.showContactInfo !== false && {
        contactInfo: business.contactInfo,
        location: business.latitude && business.longitude ? {
          latitude: parseFloat(business.latitude),
          longitude: parseFloat(business.longitude)
        } : undefined
      }),
      ...(business.storefrontSettings?.showSocialMedia !== false && {
        socialMedia: business.socialMedia
      }),
      ...(business.storefrontSettings?.showOperatingHours !== false && {
        operatingHours: business.operatingHours
      }),
      
      amenities: Array.isArray(business.amenities) ? business.amenities : [],
    };

    res.json(publicBusiness);
  } catch (error) {
    console.error('Error fetching public business profile:', error);
    res.status(500).json({ error: "Failed to fetch business profile" });
  }
});

// Get public business content by section
router.get("/public/businesses/:businessId/content/:section", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const section = req.params.section;
    
    // First check if business exists and has this section published
    const [business] = await db
      .select({
        publishedSections: businessTenants.publishedSections,
        industryType: businessTenants.industryType
      })
      .from(businessTenants)
      .where(eq(businessTenants.id, businessId))
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const publishedSections = business.publishedSections || [];
    if (!publishedSections.includes(section)) {
      return res.status(403).json({ error: "Section not published" });
    }

    let content = null;

    switch (section) {
      case 'menu':
        if (business.industryType === 'restaurant') {
          const items = await db
            .select({
              id: restaurantMenuItems.id,
              name: restaurantMenuItems.name,
              description: restaurantMenuItems.description,
              price: restaurantMenuItems.price,
              imageUrl: restaurantMenuItems.imageUrl,
              prepTimeMinutes: restaurantMenuItems.prepTimeMinutes,
              spiceLevel: restaurantMenuItems.spiceLevel,
              dietaryTags: restaurantMenuItems.dietaryTags,
              inStock: restaurantMenuItems.inStock,
              displayOrder: restaurantMenuItems.displayOrder,
              category: {
                id: restaurantMenuCategories.id,
                name: restaurantMenuCategories.name
              }
            })
            .from(restaurantMenuItems)
            .leftJoin(restaurantMenuCategories, eq(restaurantMenuItems.categoryId, restaurantMenuCategories.id))
            .where(eq(restaurantMenuItems.businessId, businessId))
            .orderBy(restaurantMenuItems.displayOrder, restaurantMenuItems.name);

          // Transform to match frontend expectations
          content = items.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            imageUrl: item.imageUrl,
            preparationTime: item.prepTimeMinutes,
            spiceLevel: item.spiceLevel,
            isVegetarian: item.dietaryTags?.includes('vegetarian') || false,
            isVegan: item.dietaryTags?.includes('vegan') || false,
            isHalal: item.dietaryTags?.includes('halal') || false,
            isGlutenFree: item.dietaryTags?.includes('gluten-free') || false,
            inStock: item.inStock,
            displayOrder: item.displayOrder,
            category: item.category
          }));
        }
        break;

      case 'services':
        if (business.industryType === 'salon') {
          content = await db
            .select()
            .from(salonServices)
            .where(eq(salonServices.businessId, businessId))
            .orderBy(salonServices.displayOrder, salonServices.name);
        }
        break;

      case 'staff':
        if (business.industryType === 'salon') {
          content = await db
            .select({
              id: salonStaff.id,
              name: salonStaff.name,
              specialization: salonStaff.specialization,
              bio: salonStaff.bio,
              imageUrl: salonStaff.imageUrl,
              isActive: salonStaff.isActive
            })
            .from(salonStaff)
            .where(eq(salonStaff.businessId, businessId));
        }
        break;

      case 'tables':
        if (business.industryType === 'restaurant') {
          content = await db
            .select()
            .from(restaurantTables)
            .where(eq(restaurantTables.businessId, businessId))
            .orderBy(restaurantTables.tableNumber);
        }
        break;

      default:
        return res.status(400).json({ error: "Invalid section" });
    }

    res.json({ section, content: content || [] });
  } catch (error) {
    console.error('Error fetching business content:', error);
    res.status(500).json({ error: "Failed to fetch content" });
  }
});

// Get business by slug (public)
router.get("/public/businesses/by-slug/:slug/profile", async (req, res) => {
  try {
    const slug = req.params.slug;
    
    const [business] = await db
      .select()
      .from(businessTenants)
      .where(eq(businessTenants.slug, slug))
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Redirect to ID-based endpoint for consistency
    res.redirect(`/api/public/businesses/${business.id}/profile`);
  } catch (error) {
    console.error('Error fetching business by slug:', error);
    res.status(500).json({ error: "Failed to fetch business" });
  }
});

export default router;