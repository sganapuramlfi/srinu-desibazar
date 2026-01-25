import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import new schemas
import {
  platformUsers,
  businessTenants,
  businessAccess,
  subscriptionPlans,
  businessSubscriptions,
  businessDirectory,
  businessSettings,
  bookableItems,
  bookings,
} from "./schema";

// Import industry schemas
import {
  salonServices,
  salonStaff,
  salonStaffServices,
} from "./salon-schema";

import {
  restaurantMenuCategories,
  restaurantMenuItems,
  restaurantTables,
  restaurantOrders,
} from "./restaurant-schema";

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:9100/desibazaar",
});

const db = drizzle(pool);

export async function populatePlatformData() {
  console.log("🚀 Populating complete platform with business-centric data...");

  try {
    // =============================================================================
    // STEP 1: Create subscription plans
    // =============================================================================
    
    console.log("📋 Creating subscription plans...");
    const plans = await db.insert(subscriptionPlans).values([
      {
        name: "Startup Free",
        description: "Perfect for new businesses getting started",
        priceMonthly: "0.00",
        priceYearly: "0.00",
        maxStaff: 3,
        maxCustomers: 100,
        maxBookingsPerMonth: 50,
        aiCreditsPerMonth: 50,
        enabledModules: ["basic_booking", "basic_profile"],
        enabledFeatures: ["online_booking", "customer_management"],
        isActive: true,
        displayOrder: 1,
      },
      {
        name: "Growth",
        description: "For growing businesses ready to scale",
        priceMonthly: "49.00",
        priceYearly: "490.00",
        maxStaff: 10,
        maxCustomers: 500,
        maxBookingsPerMonth: 200,
        aiCreditsPerMonth: 500,
        enabledModules: ["advanced_booking", "staff_management", "basic_analytics"],
        enabledFeatures: ["online_booking", "staff_scheduling", "email_marketing", "analytics"],
        isPopular: true,
        isActive: true,
        displayOrder: 2,
      },
      {
        name: "Professional",
        description: "Full-featured for established businesses",
        priceMonthly: "149.00",
        priceYearly: "1490.00",
        maxStaff: 25,
        maxCustomers: 2000,
        maxBookingsPerMonth: 1000,
        aiCreditsPerMonth: 2000,
        apiAccess: true,
        enabledModules: ["all_features", "advanced_analytics", "ai_optimization"],
        enabledFeatures: ["everything", "api_access", "priority_support"],
        isActive: true,
        displayOrder: 3,
      },
      {
        name: "Enterprise",
        description: "Custom solutions for large operations",
        priceMonthly: "399.00",
        priceYearly: "3990.00",
        maxStaff: -1, // unlimited
        maxCustomers: -1,
        maxBookingsPerMonth: -1,
        aiCreditsPerMonth: 10000,
        apiAccess: true,
        whiteLabel: true,
        enabledModules: ["everything", "white_label", "custom_integrations"],
        enabledFeatures: ["everything", "white_label", "dedicated_support"],
        isActive: true,
        displayOrder: 4,
      },
    ]).returning();

    console.log(`✅ Created ${plans.length} subscription plans`);

    // =============================================================================
    // STEP 2: Create platform users
    // =============================================================================
    
    console.log("👥 Creating platform users...");
    const users = await db.insert(platformUsers).values([
      {
        email: "admin@desibazaar.com",
        passwordHash: "hashed_admin_password", // Would be properly hashed in real app
        fullName: "Platform Admin",
        phone: "+61400000000",
        isEmailVerified: true,
        isPhoneVerified: true,
      },
      {
        email: "sarah@hairbeauty.com",
        passwordHash: "hashed_password_123",
        fullName: "Sarah Johnson",
        phone: "+61400000001",
        isEmailVerified: true,
      },
      {
        email: "marco@italianflavors.com",
        passwordHash: "hashed_password_456",
        fullName: "Marco Rossi",
        phone: "+61400000002",
        isEmailVerified: true,
      },
      {
        email: "customer1@gmail.com",
        passwordHash: "hashed_password_789",
        fullName: "Emily Chen",
        phone: "+61400000003",
        isEmailVerified: true,
      },
      {
        email: "customer2@gmail.com",
        passwordHash: "hashed_password_101",
        fullName: "David Smith",
        phone: "+61400000004",
        isEmailVerified: true,
      },
    ]).returning();

    console.log(`✅ Created ${users.length} platform users`);

    // =============================================================================
    // STEP 3: Create business tenants
    // =============================================================================
    
    console.log("🏢 Creating business tenants...");
    const businesses = await db.insert(businessTenants).values([
      {
        name: "Hair & Beauty Studio",
        slug: "hair-beauty-studio-melbourne",
        industryType: "salon",
        status: "active",
        description: "Premium hair and beauty services in the heart of Melbourne",
        logoUrl: "/uploads/hair-beauty-logo.jpg",
        contactInfo: {
          phone: "+61387654321",
          email: "hello@hairbeauty.com",
          whatsapp: "+61387654321",
        },
        socialMedia: {
          instagram: "@hairbeautystudio",
          facebook: "hairbeautystudio",
        },
        operatingHours: {
          monday: { open: "09:00", close: "18:00" },
          tuesday: { open: "09:00", close: "18:00" },
          wednesday: { open: "09:00", close: "18:00" },
          thursday: { open: "09:00", close: "20:00" },
          friday: { open: "09:00", close: "20:00" },
          saturday: { open: "08:00", close: "17:00" },
          sunday: { open: "10:00", close: "16:00" },
        },
        amenities: ["parking", "wifi", "wheelchair_access", "air_conditioning"],
        addressLine1: "123 Collins Street",
        city: "Melbourne",
        state: "VIC",
        postalCode: "3000",
        country: "Australia",
        latitude: "-37.8136",
        longitude: "144.9631",
        onboardingCompleted: true,
        isVerified: true,
      },
      {
        name: "Italian Flavors Restaurant",
        slug: "italian-flavors-melbourne",
        industryType: "restaurant",
        status: "active",
        description: "Authentic Italian cuisine with a modern twist",
        logoUrl: "/uploads/italian-flavors-logo.jpg",
        contactInfo: {
          phone: "+61398765432",
          email: "info@italianflavors.com",
        },
        socialMedia: {
          instagram: "@italianflavorsmelb",
          facebook: "italianflavorsrestaurant",
        },
        operatingHours: {
          monday: { open: "17:00", close: "22:00" },
          tuesday: { open: "17:00", close: "22:00" },
          wednesday: { open: "17:00", close: "22:00" },
          thursday: { open: "17:00", close: "23:00" },
          friday: { open: "17:00", close: "23:00" },
          saturday: { open: "12:00", close: "23:00" },
          sunday: { open: "12:00", close: "22:00" },
        },
        amenities: ["parking", "wifi", "outdoor_seating", "private_dining"],
        addressLine1: "456 Lygon Street",
        city: "Melbourne",
        state: "VIC",
        postalCode: "3053",
        country: "Australia",
        latitude: "-37.7886",
        longitude: "144.9631",
        onboardingCompleted: true,
        isVerified: true,
      },
    ]).returning();

    console.log(`✅ Created ${businesses.length} business tenants`);

    // =============================================================================
    // STEP 4: Create business access relationships
    // =============================================================================
    
    console.log("🔐 Creating business access relationships...");
    const access = await db.insert(businessAccess).values([
      {
        businessId: businesses[0].id, // Hair & Beauty Studio
        userId: users[1].id, // Sarah Johnson
        role: "owner",
        permissions: {
          canEditBusiness: true,
          canManageStaff: true,
          canViewAnalytics: true,
          canManageBookings: true,
        },
        isActive: true,
      },
      {
        businessId: businesses[1].id, // Italian Flavors
        userId: users[2].id, // Marco Rossi
        role: "owner",
        permissions: {
          canEditBusiness: true,
          canManageStaff: true,
          canViewAnalytics: true,
          canManageBookings: true,
        },
        isActive: true,
      },
      {
        businessId: businesses[0].id, // Customer access to salon
        userId: users[3].id, // Emily Chen
        role: "customer",
        permissions: {
          canBookServices: true,
          canViewBookings: true,
        },
        isActive: true,
      },
    ]).returning();

    console.log(`✅ Created ${access.length} business access records`);

    // =============================================================================
    // STEP 5: Create business subscriptions
    // =============================================================================
    
    console.log("💳 Creating business subscriptions...");
    const subscriptions = await db.insert(businessSubscriptions).values([
      {
        businessId: businesses[0].id, // Hair & Beauty Studio
        planId: plans[1].id, // Growth plan
        status: "active",
        billingEmail: "sarah@hairbeauty.com",
        billingCycle: "monthly",
        currentUsage: {
          staff: 3,
          customers: 45,
          bookings: 78,
        },
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      {
        businessId: businesses[1].id, // Italian Flavors
        planId: plans[2].id, // Professional plan
        status: "active",
        billingEmail: "marco@italianflavors.com",
        billingCycle: "yearly",
        currentUsage: {
          staff: 8,
          customers: 250,
          bookings: 156,
        },
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    ]).returning();

    console.log(`✅ Created ${subscriptions.length} business subscriptions`);

    // =============================================================================
    // STEP 6: Create business directory entries
    // =============================================================================
    
    console.log("📁 Creating business directory entries...");
    await db.insert(businessDirectory).values([
      {
        businessId: businesses[0].id,
        metaTitle: "Hair & Beauty Studio Melbourne - Premium Salon Services",
        metaDescription: "Professional hair styling, coloring, and beauty treatments in Melbourne CBD",
        keywords: ["hair salon", "beauty", "melbourne", "hair styling", "hair color"],
        averageRating: "4.8",
        totalReviews: 127,
        totalBookings: 1250,
        highlights: ["Award Winning", "Eco Friendly", "Expert Stylists"],
        certifications: ["Organic Products", "Cruelty Free"],
        isFeatured: true,
        isPublished: true,
        publishedAt: new Date(),
      },
      {
        businessId: businesses[1].id,
        metaTitle: "Italian Flavors Restaurant - Authentic Italian Cuisine Melbourne",
        metaDescription: "Experience authentic Italian flavors with modern flair in Carlton",
        keywords: ["italian restaurant", "melbourne", "authentic", "pasta", "pizza"],
        averageRating: "4.6",
        totalReviews: 89,
        totalBookings: 890,
        highlights: ["Family Owned", "Fresh Ingredients", "Wine Selection"],
        certifications: ["Italian Certified Chef"],
        isFeatured: false,
        isPublished: true,
        publishedAt: new Date(),
      },
    ]);

    console.log("✅ Created business directory entries");

    // =============================================================================
    // STEP 7: Create business settings
    // =============================================================================
    
    console.log("⚙️ Creating business settings...");
    await db.insert(businessSettings).values([
      {
        businessId: businesses[0].id,
        salonSettings: {
          bookingAdvanceDays: 30,
          walkInEnabled: true,
          depositRequired: false,
          skillBasedBooking: true,
          emailReminders: true,
          smsReminders: true,
        },
        bookingSettings: {
          allowOnlineBooking: true,
          requireCustomerAccount: false,
          allowSameDayBooking: true,
          cancellationPolicy: "24 hours notice required",
        },
        notificationSettings: {
          emailNotifications: true,
          smsNotifications: true,
          bookingConfirmations: true,
          reminderHours: 24,
        },
      },
      {
        businessId: businesses[1].id,
        restaurantSettings: {
          tableBookingEnabled: true,
          onlineOrderingEnabled: false,
          deliveryEnabled: false,
          maxPartySize: 12,
          bookingAdvanceDays: 14,
        },
        bookingSettings: {
          allowOnlineBooking: true,
          requireCustomerAccount: false,
          allowSameDayBooking: true,
          cancellationPolicy: "2 hours notice required",
        },
        paymentSettings: {
          acceptCash: true,
          acceptCard: true,
          acceptOnline: false,
        },
      },
    ]);

    console.log("✅ Created business settings");

    // =============================================================================
    // STEP 8: Populate salon-specific data
    // =============================================================================
    
    console.log("💇 Creating salon-specific data...");
    
    // Salon services
    const salonServicesData = await db.insert(salonServices).values([
      {
        businessId: businesses[0].id,
        name: "Women's Cut & Style",
        description: "Professional cut with wash, blow-dry and styling",
        category: "hair",
        durationMinutes: 60,
        price: "85.00",
        requiresConsultation: false,
        bufferTimeMinutes: 15,
        isActive: true,
        displayOrder: 1,
      },
      {
        businessId: businesses[0].id,
        name: "Hair Color & Style",
        description: "Full color service with cut and style",
        category: "hair",
        durationMinutes: 180,
        price: "150.00",
        requiresConsultation: true,
        requiresPatchTest: true,
        bufferTimeMinutes: 30,
        isActive: true,
        displayOrder: 2,
      },
      {
        businessId: businesses[0].id,
        name: "Relaxing Facial",
        description: "Deep cleansing facial with relaxation massage",
        category: "facial",
        durationMinutes: 90,
        price: "95.00",
        requiresConsultation: false,
        bufferTimeMinutes: 15,
        isActive: true,
        displayOrder: 3,
      },
    ]).returning();

    // Salon staff
    const salonStaffData = await db.insert(salonStaff).values([
      {
        businessId: businesses[0].id,
        userId: users[1].id, // Sarah Johnson (owner)
        firstName: "Sarah",
        lastName: "Johnson",
        displayName: "Sarah J.",
        email: "sarah@hairbeauty.com",
        phone: "+61400000001",
        title: "Senior Stylist & Owner",
        bio: "15+ years experience in hair styling and color",
        yearsExperience: 15,
        employmentType: "full_time",
        workingHours: {
          monday: { start: "09:00", end: "17:00" },
          tuesday: { start: "09:00", end: "17:00" },
          wednesday: { start: "09:00", end: "17:00" },
          thursday: { start: "09:00", end: "19:00" },
          friday: { start: "09:00", end: "19:00" },
          saturday: { start: "08:00", end: "16:00" },
        },
        isActive: true,
        isBookable: true,
      },
      {
        businessId: businesses[0].id,
        firstName: "Emma",
        lastName: "Thompson",
        displayName: "Emma T.",
        email: "emma@hairbeauty.com",
        phone: "+61400000011",
        title: "Hair Stylist",
        bio: "Specializing in cutting and styling",
        yearsExperience: 5,
        employmentType: "full_time",
        workingHours: {
          tuesday: { start: "10:00", end: "18:00" },
          wednesday: { start: "10:00", end: "18:00" },
          thursday: { start: "10:00", end: "18:00" },
          friday: { start: "10:00", end: "18:00" },
          saturday: { start: "08:00", end: "16:00" },
        },
        isActive: true,
        isBookable: true,
      },
    ]).returning();

    // Staff service specializations
    await db.insert(salonStaffServices).values([
      {
        staffId: salonStaffData[0].id, // Sarah
        serviceId: salonServicesData[0].id, // Women's Cut & Style
        proficiencyLevel: "expert",
      },
      {
        staffId: salonStaffData[0].id, // Sarah
        serviceId: salonServicesData[1].id, // Hair Color & Style
        proficiencyLevel: "expert",
      },
      {
        staffId: salonStaffData[0].id, // Sarah
        serviceId: salonServicesData[2].id, // Relaxing Facial
        proficiencyLevel: "capable",
      },
      {
        staffId: salonStaffData[1].id, // Emma
        serviceId: salonServicesData[0].id, // Women's Cut & Style
        proficiencyLevel: "capable",
      },
    ]);

    console.log("✅ Created salon services, staff, and specializations");

    // =============================================================================
    // STEP 9: Populate restaurant-specific data
    // =============================================================================
    
    console.log("🍝 Creating restaurant-specific data...");
    
    // Menu categories
    const menuCategories = await db.insert(restaurantMenuCategories).values([
      {
        businessId: businesses[1].id,
        name: "Antipasti",
        description: "Traditional Italian starters",
        displayOrder: 1,
        isActive: true,
      },
      {
        businessId: businesses[1].id,
        name: "Pasta",
        description: "House-made pasta dishes",
        displayOrder: 2,
        isActive: true,
      },
      {
        businessId: businesses[1].id,
        name: "Pizza",
        description: "Wood-fired pizzas",
        displayOrder: 3,
        isActive: true,
      },
      {
        businessId: businesses[1].id,
        name: "Dolci",
        description: "Traditional Italian desserts",
        displayOrder: 4,
        isActive: true,
      },
    ]).returning();

    // Menu items
    await db.insert(restaurantMenuItems).values([
      {
        businessId: businesses[1].id,
        categoryId: menuCategories[0].id, // Antipasti
        name: "Bruschetta Classica",
        description: "Toasted bread with fresh tomatoes, garlic, and basil",
        price: "14.50",
        prepTimeMinutes: 10,
        dietaryTags: ["vegetarian"],
        isFeatured: false,
        displayOrder: 1,
      },
      {
        businessId: businesses[1].id,
        categoryId: menuCategories[1].id, // Pasta
        name: "Spaghetti Carbonara",
        description: "Traditional Roman pasta with eggs, pecorino, and guanciale",
        price: "24.00",
        prepTimeMinutes: 15,
        allergens: ["eggs", "dairy"],
        isPopular: true,
        displayOrder: 1,
      },
      {
        businessId: businesses[1].id,
        categoryId: menuCategories[2].id, // Pizza
        name: "Margherita",
        description: "San Marzano tomatoes, mozzarella di bufala, fresh basil",
        price: "22.00",
        prepTimeMinutes: 12,
        dietaryTags: ["vegetarian"],
        allergens: ["dairy", "gluten"],
        isFeatured: true,
        displayOrder: 1,
      },
      {
        businessId: businesses[1].id,
        categoryId: menuCategories[3].id, // Dolci
        name: "Tiramisu",
        description: "Traditional Italian dessert with coffee and mascarpone",
        price: "12.00",
        prepTimeMinutes: 5,
        allergens: ["eggs", "dairy", "gluten"],
        displayOrder: 1,
      },
    ]);

    // Restaurant tables
    await db.insert(restaurantTables).values([
      {
        businessId: businesses[1].id,
        tableNumber: "T1",
        floorArea: "Main",
        minCapacity: 2,
        maxCapacity: 4,
        idealCapacity: 4,
        tableShape: "square",
        isReservable: true,
        isActive: true,
      },
      {
        businessId: businesses[1].id,
        tableNumber: "T2",
        floorArea: "Main",
        minCapacity: 1,
        maxCapacity: 2,
        idealCapacity: 2,
        tableShape: "round",
        hasWindowView: true,
        isReservable: true,
        isActive: true,
      },
      {
        businessId: businesses[1].id,
        tableNumber: "T3",
        floorArea: "Patio",
        minCapacity: 4,
        maxCapacity: 6,
        idealCapacity: 6,
        tableShape: "rectangle",
        isReservable: true,
        isActive: true,
      },
      {
        businessId: businesses[1].id,
        tableNumber: "B1",
        floorArea: "Main",
        minCapacity: 2,
        maxCapacity: 4,
        idealCapacity: 4,
        tableShape: "rectangle",
        isBooth: true,
        isReservable: true,
        isActive: true,
      },
    ]);

    console.log("✅ Created restaurant menu and tables");

    console.log("🎉 Platform data population completed successfully!");
    console.log(`
📊 Summary:
- ${plans.length} subscription plans created
- ${users.length} platform users created  
- ${businesses.length} business tenants created
- ${access.length} business access relationships created
- ${subscriptions.length} active subscriptions
- Salon: ${salonServicesData.length} services, ${salonStaffData.length} staff members
- Restaurant: ${menuCategories.length} menu categories, 4 menu items, 4 tables
    `);

  } catch (error) {
    console.error("❌ Error populating platform data:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly (ES module compatible)
const __filename = fileURLToPath(import.meta.url);

// Check if this is the main module
if (process.argv[1] === __filename) {
  populatePlatformData().catch(console.error);
}