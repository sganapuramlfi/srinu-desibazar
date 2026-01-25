import { db } from "../db/index.js";
import { 
  platformUsers, 
  businessTenants, 
  businessAccess,
  subscriptionPlans,
  businessSubscriptions,
  restaurantMenuCategories,
  restaurantMenuItems,
  restaurantTables
} from "../db/index.js";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function createSampleBusiness() {
  console.log("🚀 Creating sample business with all features...");

  try {
    // 1. Create a business owner user
    const passwordHash = await bcrypt.hash("password123", 12);
    const [businessOwner] = await db
      .insert(platformUsers)
      .values({
        email: "spicepalace@demo.com",
        passwordHash,
        fullName: "Raj Patel",
        phone: "+61 412 345 678",
        isEmailVerified: true,
        isPhoneVerified: true
      })
      .returning();

    console.log("✅ Created business owner:", businessOwner.email);

    // 2. Create a fully-featured restaurant business
    const [business] = await db
      .insert(businessTenants)
      .values({
        name: "The Spice Palace Melbourne",
        slug: "spice-palace-melbourne",
        industryType: "restaurant",
        status: "active",
        description: "Award-winning authentic Indian cuisine in the heart of Melbourne. Experience the rich flavors of India with our traditional recipes passed down through generations. From aromatic biryanis to creamy kormas, every dish is a celebration of spices.",
        
        // Logo and Gallery
        logoUrl: "/uploads/logos/spice-palace-logo.jpg",
        coverImageUrl: "/uploads/gallery/spice-palace-cover.jpg",
        gallery: [
          "/uploads/gallery/dining-area.jpg",
          "/uploads/gallery/chef-special.jpg",
          "/uploads/gallery/outdoor-seating.jpg"
        ],
        
        // Contact Information
        contactInfo: {
          phone: "+61 3 9876 5432",
          email: "hello@spicepalace.com.au",
          whatsapp: "+61 412 345 678",
          address: "123 Collins Street, Melbourne VIC 3000"
        },
        
        // Social Media Links
        socialMedia: {
          website: "https://www.spicepalace.com.au",
          facebook: "https://facebook.com/spicepalacemelb",
          instagram: "https://instagram.com/spicepalacemelbourne",
          twitter: "https://twitter.com/spicepalacemelb"
        },
        
        // Partner Platform Links (TODO: Add to schema)
        // partnerLinks: {
        //   uberEats: "https://www.ubereats.com/au/store/the-spice-palace/abc123",
        //   doorDash: "https://www.doordash.com/store/the-spice-palace-melbourne-123456/",
        //   menulog: "https://www.menulog.com.au/restaurants-the-spice-palace-melbourne"
        // },
        
        // Operating Hours
        operatingHours: {
          monday: { open: "11:30", close: "22:00", isOpen: true },
          tuesday: { open: "11:30", close: "22:00", isOpen: true },
          wednesday: { open: "11:30", close: "22:00", isOpen: true },
          thursday: { open: "11:30", close: "22:30", isOpen: true },
          friday: { open: "11:30", close: "23:00", isOpen: true },
          saturday: { open: "12:00", close: "23:00", isOpen: true },
          sunday: { open: "12:00", close: "21:30", isOpen: true }
        },
        
        // Amenities
        amenities: [
          "wifi",
          "free_parking",
          "card_payment",
          "takeaway",
          "outdoor_seating",
          "family_friendly",
          "wheelchair_accessible",
          "live_music"
        ],
        
        // Holiday Policy (TODO: Add to schema)
        // holidayPolicy: "Open regular hours on most holidays. Closed on Christmas Day and Good Friday. Special holiday menus available.",
        
        // Location
        addressLine1: "123 Collins Street",
        addressLine2: "",
        city: "Melbourne",
        state: "VIC",
        postalCode: "3000",
        country: "Australia",
        latitude: "-37.813628",
        longitude: "144.963058",
        
        // Platform settings
        onboardingCompleted: true,
        isVerified: true
      })
      .returning();

    console.log("✅ Created business:", business.name);

    // 3. Create business access for the owner
    await db
      .insert(businessAccess)
      .values({
        businessId: business.id,
        userId: businessOwner.id,
        role: "owner",
        permissions: JSON.stringify(["full_access"]),
        grantedBy: businessOwner.id
      });

    // 4. Create premium subscription (180-day trial)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 180);

    // First check if we have any subscription plans
    const [premiumPlan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, "Premium"))
      .limit(1);

    if (premiumPlan) {
      await db
        .insert(businessSubscriptions)
        .values({
          businessId: business.id,
          planId: premiumPlan.id,
          status: "trial",
          trialStartDate: new Date(),
          trialEndDate: trialEndDate
        });
    } else {
      console.log("⚠️  No subscription plans found - skipping subscription creation");
    }

    console.log("✅ Created premium subscription");

    // 5. Create menu categories
    const categories = await db
      .insert(restaurantMenuCategories)
      .values([
        {
          businessId: business.id,
          name: "Appetizers",
          description: "Start your meal with our delicious starters",
          displayOrder: 1,
          isActive: true
        },
        {
          businessId: business.id,
          name: "Mains - Vegetarian",
          description: "Flavorful vegetarian curries and dishes",
          displayOrder: 2,
          isActive: true
        },
        {
          businessId: business.id,
          name: "Mains - Non-Vegetarian",
          description: "Premium meat and seafood specialties",
          displayOrder: 3,
          isActive: true
        },
        {
          businessId: business.id,
          name: "Breads & Rice",
          description: "Freshly baked breads and aromatic rice",
          displayOrder: 4,
          isActive: true
        },
        {
          businessId: business.id,
          name: "Desserts",
          description: "Sweet endings to your meal",
          displayOrder: 5,
          isActive: true
        }
      ])
      .returning();

    console.log("✅ Created menu categories");

    // 6. Create menu items
    await db
      .insert(restaurantMenuItems)
      .values([
        // Appetizers
        {
          businessId: business.id,
          categoryId: categories[0].id,
          name: "Samosas (2 pieces)",
          description: "Crispy pastry filled with spiced potatoes and peas, served with mint chutney",
          price: "8.90",
          imageUrl: "/uploads/menu/samosas.jpg",
          preparationTime: 15,
          spiceLevel: 2,
          isVegetarian: true,
          isVegan: true,
          isGlutenFree: false,
          isHalal: true,
          isAvailable: true,
          displayOrder: 1
        },
        {
          businessId: business.id,
          categoryId: categories[0].id,
          name: "Chicken Tikka",
          description: "Tender chicken marinated in yogurt and spices, grilled in tandoor",
          price: "14.90",
          imageUrl: "/uploads/menu/chicken-tikka.jpg",
          preparationTime: 20,
          spiceLevel: 3,
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: true,
          isHalal: true,
          isAvailable: true,
          displayOrder: 2
        },
        // Vegetarian Mains
        {
          businessId: business.id,
          categoryId: categories[1].id,
          name: "Palak Paneer",
          description: "Cottage cheese cubes in creamy spinach gravy with aromatic spices",
          price: "22.90",
          imageUrl: "/uploads/menu/palak-paneer.jpg",
          preparationTime: 25,
          spiceLevel: 2,
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: true,
          isHalal: true,
          isAvailable: true,
          displayOrder: 1
        },
        {
          businessId: business.id,
          categoryId: categories[1].id,
          name: "Dal Makhani",
          description: "Black lentils slow-cooked overnight with butter and cream",
          price: "19.90",
          imageUrl: "/uploads/menu/dal-makhani.jpg",
          preparationTime: 20,
          spiceLevel: 1,
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: true,
          isHalal: true,
          isAvailable: true,
          displayOrder: 2
        },
        // Non-Vegetarian Mains
        {
          businessId: business.id,
          categoryId: categories[2].id,
          name: "Butter Chicken",
          description: "Tender chicken in rich tomato and butter gravy - our signature dish",
          price: "24.90",
          imageUrl: "/uploads/menu/butter-chicken.jpg",
          preparationTime: 25,
          spiceLevel: 1,
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: true,
          isHalal: true,
          isAvailable: true,
          displayOrder: 1
        },
        {
          businessId: business.id,
          categoryId: categories[2].id,
          name: "Lamb Biryani",
          description: "Aromatic basmati rice layered with tender lamb, served with raita",
          price: "28.90",
          imageUrl: "/uploads/menu/lamb-biryani.jpg",
          preparationTime: 35,
          spiceLevel: 3,
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: true,
          isHalal: true,
          isAvailable: true,
          displayOrder: 2
        },
        // Breads
        {
          businessId: business.id,
          categoryId: categories[3].id,
          name: "Garlic Naan",
          description: "Soft bread topped with garlic and coriander, baked in tandoor",
          price: "5.90",
          preparationTime: 10,
          spiceLevel: 0,
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: false,
          isHalal: true,
          isAvailable: true,
          displayOrder: 1
        },
        // Desserts
        {
          businessId: business.id,
          categoryId: categories[4].id,
          name: "Gulab Jamun",
          description: "Soft milk dumplings in rose-scented sugar syrup",
          price: "8.90",
          preparationTime: 5,
          spiceLevel: 0,
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: false,
          isHalal: true,
          isAvailable: true,
          displayOrder: 1
        }
      ]);

    console.log("✅ Created menu items");

    // 7. Create restaurant tables
    await db
      .insert(restaurantTables)
      .values([
        {
          businessId: business.id,
          tableNumber: "T1",
          capacity: 2,
          location: "Window",
          isActive: true
        },
        {
          businessId: business.id,
          tableNumber: "T2",
          capacity: 4,
          location: "Main Hall",
          isActive: true
        },
        {
          businessId: business.id,
          tableNumber: "T3",
          capacity: 6,
          location: "Private Area",
          isActive: true
        },
        {
          businessId: business.id,
          tableNumber: "O1",
          capacity: 4,
          location: "Outdoor",
          isActive: true
        }
      ]);

    console.log("✅ Created restaurant tables");

    // 8. Promotions would go here (table not yet in schema)

    console.log("\n🎉 Sample business created successfully!");
    console.log("\n📌 Access Details:");
    console.log("   Business URL: /storefront/spice-palace-melbourne");
    console.log("   Owner Email: spicepalace@demo.com");
    console.log("   Password: password123");
    console.log("\n✨ Features Included:");
    console.log("   - Logo and 3 gallery images");
    console.log("   - Full operating hours");
    console.log("   - 8 amenities with icons");
    console.log("   - Social media links");
    console.log("   - GPS coordinates for navigation");
    console.log("   - 8 menu items across 5 categories");
    console.log("   - 4 restaurant tables");
    console.log("   - Premium subscription (180-day trial)");
    console.log("\n⚠️  Note: Partner links and holiday policy fields need to be added to schema");

  } catch (error) {
    console.error("❌ Error creating sample business:", error);
  } finally {
    process.exit(0);
  }
}

// Run the script
createSampleBusiness();