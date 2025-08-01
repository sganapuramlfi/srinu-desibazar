import type { Express } from "express";
import { db } from "../db";
import { businesses, adCampaigns, services, users } from "../db/schema";

export function setupSampleData(app: Express) {
  // Seed sample salon data with ads
  app.post("/api/seed-salon-data", async (req, res) => {
    try {
      // Create sample business owners first
      const sampleUsers = [
        {
          email: "owner1@glamourbeauty.com",
          password: "hashedpassword", // In real app this would be properly hashed
          role: "business" as const,
          isEmailVerified: true
        },
        {
          email: "owner2@zenspa.com", 
          password: "hashedpassword",
          role: "business" as const,
          isEmailVerified: true
        },
        {
          email: "owner3@stylestudio.com",
          password: "hashedpassword", 
          role: "business" as const,
          isEmailVerified: true
        }
      ];

      const insertedUsers = await db.insert(users).values(sampleUsers).returning();
      
      // Create sample salon businesses
      const sampleSalons = [
        {
          userId: insertedUsers[0].id,
          name: "Glamour Beauty Salon",
          email: "contact@glamourbeauty.com",
          phone: "555-0101",
          address: "123 Beauty Street, Downtown",
          industryType: "salon",
          description: "Premium beauty services with expert stylists. Hair, nails, spa treatments.",
          coordinates: [40.7128, -74.0060],
          isActive: true,
          status: "active" as const
        },
        {
          userId: insertedUsers[1].id,
          name: "Zen Spa Retreat",
          email: "hello@zenspa.com", 
          phone: "555-0102",
          address: "456 Wellness Ave, Uptown",
          industryType: "salon",
          description: "Relaxing spa treatments, massage therapy, and wellness services.",
          coordinates: [40.7589, -73.9851],
          isActive: true,
          status: "active" as const
        },
        {
          userId: insertedUsers[2].id,
          name: "Style Studio Pro",
          email: "info@stylestudio.com",
          phone: "555-0103", 
          address: "789 Fashion Blvd, Midtown",
          industryType: "salon",
          description: "Modern hair salon specializing in cuts, colors, and styling.",
          coordinates: [40.7505, -73.9934],
          isActive: true,
          status: "active" as const
        }
      ];

      // Insert businesses
      const insertedBusinesses = await db.insert(businesses).values(sampleSalons).returning();
      
      // Create sample services for each salon
      const sampleServices = [
        // Glamour Beauty Salon services
        { businessId: insertedBusinesses[0].id, name: "Hair Cut & Style", price: 45, duration: 60, description: "Professional haircut with styling" },
        { businessId: insertedBusinesses[0].id, name: "Hair Color", price: 85, duration: 120, description: "Full hair coloring service" },
        { businessId: insertedBusinesses[0].id, name: "Manicure & Pedicure", price: 35, duration: 45, description: "Complete nail care" },
        
        // Zen Spa Retreat services  
        { businessId: insertedBusinesses[1].id, name: "Deep Tissue Massage", price: 95, duration: 90, description: "Therapeutic muscle massage" },
        { businessId: insertedBusinesses[1].id, name: "Facial Treatment", price: 65, duration: 60, description: "Rejuvenating facial therapy" },
        { businessId: insertedBusinesses[1].id, name: "Body Wrap", price: 75, duration: 75, description: "Detoxifying body treatment" },
        
        // Style Studio Pro services
        { businessId: insertedBusinesses[2].id, name: "Premium Cut", price: 55, duration: 45, description: "Expert precision cutting" },
        { businessId: insertedBusinesses[2].id, name: "Highlights", price: 120, duration: 150, description: "Professional highlighting" },
        { businessId: insertedBusinesses[2].id, name: "Hair Treatment", price: 40, duration: 30, description: "Conditioning treatment" }
      ];

      await db.insert(services).values(sampleServices);

      // Create sample ad campaigns with abrakadabra animations
      const sampleAds = [
        {
          businessId: insertedBusinesses[0].id,
          title: "✨ 50% Off Hair Color!",
          content: "Transform your look with professional coloring. Book now and save big!",
          imageUrl: null,
          clickUrl: `/business/${insertedBusinesses[0].id}`,
          adType: "sidebar_left" as const,
          size: "medium" as const,
          animationType: "flash" as const,
          priority: 8,
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          budget: 500,
          targetingRules: {
            categories: ["salon", "beauty"],
            industries: ["salon"],
            keywords: ["hair", "color", "beauty", "style"]
          }
        },
        {
          businessId: insertedBusinesses[1].id,
          title: "🧘 Zen Spa Special",
          content: "Relax & rejuvenate with our signature massage therapy. Premium wellness awaits!",
          imageUrl: null,
          clickUrl: `/business/${insertedBusinesses[1].id}`,
          adType: "sidebar_right" as const,
          size: "large" as const,
          animationType: "bounce" as const,
          priority: 9,
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          budget: 750,
          targetingRules: {
            categories: ["spa", "wellness", "massage"],
            industries: ["salon"],
            keywords: ["spa", "massage", "relax", "wellness"]
          }
        },
        {
          businessId: insertedBusinesses[2].id,
          title: "💫 Style Studio Pro",
          content: "Expert cuts & premium styling! Book your transformation today.",
          imageUrl: null,
          clickUrl: `/business/${insertedBusinesses[2].id}`,
          adType: "sidebar_left" as const,
          size: "small" as const,
          animationType: "slide" as const,
          priority: 7,
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          budget: 300,
          targetingRules: {
            categories: ["salon", "hair"],
            industries: ["salon"],
            keywords: ["haircut", "style", "professional"]
          }
        },
        {
          businessId: insertedBusinesses[0].id,
          title: "💅 Mani-Pedi Special",
          content: "Pamper yourself! Complete nail care with premium products.",
          imageUrl: null,
          clickUrl: `/business/${insertedBusinesses[0].id}`,
          adType: "sidebar_right" as const,
          size: "medium" as const,
          animationType: "fade" as const,
          priority: 6,
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          budget: 250,
          targetingRules: {
            categories: ["nails", "beauty"],
            industries: ["salon"],
            keywords: ["manicure", "pedicure", "nails"]
          }
        }
      ];

      await db.insert(adCampaigns).values(sampleAds);

      res.json({ 
        success: true, 
        message: "Sample salon data created successfully!",
        businesses: insertedBusinesses.length,
        services: sampleServices.length,
        ads: sampleAds.length
      });
    } catch (error) {
      console.error("Error seeding salon data:", error);
      res.status(500).json({ error: "Failed to create sample data" });
    }
  });
}