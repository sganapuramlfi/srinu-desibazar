import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, businesses, restaurantMenuCategories, restaurantMenuItems, restaurantTables, restaurantPromotions } from "../db/schema.js";
import { restaurantBusinesses, restaurantStaff } from "../db/restaurant-schema.js";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL || "postgresql://user:password@localhost:9100/desi_bazaar_hub";
const client = postgres(connectionString);
const db = drizzle(client);

async function createTestBusinessWithSlug() {
  try {
    // Create test business user
    const hashedPassword = await bcrypt.hash("testpass123", 10);
    
    const [user] = await db.insert(users).values({
      username: "mumbai-spice-owner",
      email: "owner@mumbaispice.com",
      password: hashedPassword,
      role: "business"
    }).returning();

    console.log("Created user:", user);

    // Create business with slug
    const [business] = await db.insert(businesses).values({
      userId: user.id,
      name: "Mumbai Spice Palace",
      slug: "mumbai-spice-palace",
      description: "Authentic Indian cuisine with modern twist. Experience the flavors of Mumbai in Melbourne CBD.",
      industryType: "restaurant",
      status: "active",
      contactInfo: {
        phone: "+61-3-9000-1234",
        email: "info@mumbaispice.com",
        address: "123 Collins Street, Melbourne VIC 3000"
      },
      operatingHours: {
        monday: { open: "11:00", close: "22:00" },
        tuesday: { open: "11:00", close: "22:00" },
        wednesday: { open: "11:00", close: "22:00" },
        thursday: { open: "11:00", close: "22:00" },
        friday: { open: "11:00", close: "23:00" },
        saturday: { open: "11:00", close: "23:00" },
        sunday: { open: "11:00", close: "21:00" }
      },
      onboardingCompleted: true
    }).returning();

    console.log("Created business:", business);

    // Create menu categories
    const [appetizers] = await db.insert(restaurantMenuCategories).values({
      businessId: business.id,
      name: "Appetizers",
      description: "Start your meal with our delicious appetizers",
      displayOrder: 1,
      isActive: true
    }).returning();

    const [mains] = await db.insert(restaurantMenuCategories).values({
      businessId: business.id,
      name: "Main Courses",
      description: "Our signature main dishes",
      displayOrder: 2,
      isActive: true
    }).returning();

    // Create menu items
    await db.insert(restaurantMenuItems).values([
      {
        businessId: business.id,
        categoryId: appetizers.id,
        name: "Samosa Chaat",
        description: "Crispy samosas topped with chutneys, yogurt, and fresh herbs",
        price: "12.90",
        preparationTime: 15,
        spiceLevel: 2,
        isVegetarian: true,
        isVegan: false,
        isHalal: true,
        isActive: true
      },
      {
        businessId: business.id,
        categoryId: mains.id,
        name: "Butter Chicken",
        description: "Tender chicken in a rich, creamy tomato-based sauce",
        price: "24.90",
        preparationTime: 25,
        spiceLevel: 1,
        isVegetarian: false,
        isVegan: false,
        isHalal: true,
        isActive: true
      },
      {
        businessId: business.id,
        categoryId: mains.id,
        name: "Palak Paneer",
        description: "Fresh cottage cheese in a creamy spinach curry",
        price: "22.90",
        preparationTime: 20,
        spiceLevel: 2,
        isVegetarian: true,
        isVegan: false,
        isHalal: true,
        isActive: true
      }
    ]);

    // Create tables
    await db.insert(restaurantTables).values([
      {
        businessId: business.id,
        tableNumber: "T1",
        seatingCapacity: 2,
        location: "Window seat",
        isActive: true
      },
      {
        businessId: business.id,
        tableNumber: "T2",
        seatingCapacity: 4,
        location: "Main dining",
        isActive: true
      },
      {
        businessId: business.id,
        tableNumber: "T3",
        seatingCapacity: 6,
        location: "Private corner",
        isActive: true
      }
    ]);

    // Create promotions
    await db.insert(restaurantPromotions).values([
      {
        businessId: business.id,
        title: "Happy Hour - 20% Off Drinks",
        description: "Enjoy 20% off all beverages including cocktails, wines, and craft beers",
        type: "happy_hour",
        discountType: "percentage",
        discountValue: 20,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        startTime: "17:00",
        endTime: "19:00",
        isActive: true
      }
    ]);

    console.log("✅ Successfully created Mumbai Spice Palace with slug: mumbai-spice-palace");
    console.log("🔗 Access at: http://localhost:9102/business/mumbai-spice-palace");

  } catch (error) {
    console.error("❌ Error creating test business:", error);
  } finally {
    await client.end();
  }
}

createTestBusinessWithSlug();