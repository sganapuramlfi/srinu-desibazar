import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "../db/schema.js";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:9100/desibazaar";
const client = postgres(connectionString);
const db = drizzle(client);

/**
 * 10 Diverse Customer Profiles for AI Genie Testing
 * 
 * Variety in:
 * - Food preferences and dietary restrictions
 * - Melbourne suburbs (geographic spread)
 * - Age demographics and lifestyles
 * - Budget preferences
 * - Dining occasions and patterns
 */
const customerProfiles = [
  {
    username: "sarah_cbd_foodie",
    email: "sarah.johnson@email.com",
    profile: {
      name: "Sarah Johnson",
      age: 28,
      suburb: "Melbourne CBD",
      preferences: {
        cuisines: ["Modern Australian", "Japanese", "Mediterranean"],
        dietaryRestrictions: ["Pescatarian"],
        priceRange: "$$$",
        ambiance: ["Fine dining", "Rooftop", "City views"],
        occasions: ["Date night", "Business lunch", "Solo dining"]
      },
      lifestyle: {
        workSchedule: "9-5 office",
        diningFrequency: "4-5 times per week",
        groupSize: "Usually 2 people",
        bookingAdvance: "Same day to 1 week"
      },
      queries: [
        "Best Japanese restaurant for a romantic dinner tonight",
        "Quick business lunch near Collins Street",
        "Pescatarian-friendly fine dining for anniversary"
      ]
    }
  },
  {
    username: "raj_family_man",
    email: "raj.patel.family@email.com", 
    profile: {
      name: "Raj Patel",
      age: 35,
      suburb: "Box Hill",
      preferences: {
        cuisines: ["Indian", "Chinese", "Italian"],
        dietaryRestrictions: ["Vegetarian", "Halal options for guests"],
        priceRange: "$$",
        ambiance: ["Family friendly", "Outdoor seating", "Quiet"],
        occasions: ["Family dinner", "Kids birthday", "Weekend brunch"]
      },
      lifestyle: {
        workSchedule: "Flexible",
        diningFrequency: "2-3 times per week",
        groupSize: "Family of 4 (2 kids)",
        bookingAdvance: "2-3 days ahead"
      },
      queries: [
        "Family-friendly Indian restaurant with kids menu in Box Hill",
        "Vegetarian options for Sunday family brunch",
        "Halal Chinese restaurant for mixed group gathering"
      ]
    }
  },
  {
    username: "emma_uni_student",
    email: "emma.student@gmail.com",
    profile: {
      name: "Emma Wilson", 
      age: 20,
      suburb: "Carlton",
      preferences: {
        cuisines: ["Thai", "Vietnamese", "Mexican", "Fusion"],
        dietaryRestrictions: ["Vegan"],
        priceRange: "$",
        ambiance: ["Casual", "Trendy", "Social"],
        occasions: ["Study group", "Friend hangouts", "Quick meals"]
      },
      lifestyle: {
        workSchedule: "Part-time + study",
        diningFrequency: "2-3 times per week",
        groupSize: "3-6 friends",
        bookingAdvance: "Last minute to same day"
      },
      queries: [
        "Cheap vegan Thai food near Melbourne Uni",
        "Good place for group study session with food",
        "Late night vegan food delivery Carlton"
      ]
    }
  },
  {
    username: "ahmed_halal_seeker",
    email: "ahmed.hassan@email.com",
    profile: {
      name: "Ahmed Hassan",
      age: 42,
      suburb: "Brunswick",
      preferences: {
        cuisines: ["Turkish", "Lebanese", "Pakistani", "Moroccan"],
        dietaryRestrictions: ["Halal certified only"],
        priceRange: "$$",
        ambiance: ["Authentic", "Community", "Traditional"],
        occasions: ["Family gatherings", "Religious celebrations", "Business meetings"]
      },
      lifestyle: {
        workSchedule: "Small business owner",
        diningFrequency: "3-4 times per week",
        groupSize: "Varies 2-10 people",
        bookingAdvance: "1-2 weeks for events"
      },
      queries: [
        "Authentic halal Turkish restaurant for Eid celebration",
        "Best kebab place for late night family dinner",
        "Halal business lunch venue in Brunswick area"
      ]
    }
  },
  {
    username: "lisa_health_conscious",
    email: "lisa.fitness@email.com",
    profile: {
      name: "Lisa Chen",
      age: 31,
      suburb: "South Yarra", 
      preferences: {
        cuisines: ["Healthy Asian", "Salad bars", "Poke bowls"],
        dietaryRestrictions: ["Gluten-free", "Low-carb", "Organic preferred"],
        priceRange: "$$-$$$",
        ambiance: ["Clean", "Modern", "Health-focused"],
        occasions: ["Post-workout", "Work meetings", "Health meetups"]
      },
      lifestyle: {
        workSchedule: "Fitness trainer",
        diningFrequency: "Daily",
        groupSize: "1-2 people",
        bookingAdvance: "Same day"
      },
      queries: [
        "Gluten-free poke bowl near my gym in South Yarra",
        "Healthy Asian restaurant for client meeting",
        "Best organic salad place for post-workout meal"
      ]
    }
  },
  {
    username: "marco_italian_traditionalist",
    email: "marco.rossini@email.com",
    profile: {
      name: "Marco Rossini",
      age: 55,
      suburb: "Carlton",
      preferences: {
        cuisines: ["Italian", "European", "Wine bars"],
        dietaryRestrictions: ["None"],
        priceRange: "$$$-$$$$",
        ambiance: ["Traditional", "Wine focus", "Intimate"],
        occasions: ["Wine tasting", "Anniversary", "Business entertainment"]
      },
      lifestyle: {
        workSchedule: "Wine importer",
        diningFrequency: "2-3 times per week",
        groupSize: "2-4 people",
        bookingAdvance: "1-2 weeks"
      },
      queries: [
        "Authentic Italian restaurant with excellent wine cellar",
        "Traditional trattoria for wine business dinner",
        "Best Italian chef in Melbourne for special occasion"
      ]
    }
  },
  {
    username: "priya_spice_lover",
    email: "priya.spice@email.com",
    profile: {
      name: "Priya Sharma",
      age: 26,
      suburb: "Footscray",
      preferences: {
        cuisines: ["South Indian", "Sri Lankan", "Bengali", "Regional Indian"],
        dietaryRestrictions: ["Vegetarian"],
        priceRange: "$-$$",
        ambiance: ["Authentic", "Spicy food", "Cultural"],
        occasions: ["Cultural celebrations", "Homesick comfort", "Friend gatherings"]
      },
      lifestyle: {
        workSchedule: "IT professional",
        diningFrequency: "3-4 times per week",
        groupSize: "2-6 people",
        bookingAdvance: "Few days ahead"
      },
      queries: [
        "Authentic South Indian dosa place in Footscray area",
        "Spiciest Indian food for homesick cure",
        "Bengali restaurant for Durga Puja celebration"
      ]
    }
  },
  {
    username: "david_meat_lover",
    email: "david.bbq@email.com",
    profile: {
      name: "David Thompson",
      age: 38,
      suburb: "Richmond",
      preferences: {
        cuisines: ["BBQ", "Steakhouse", "American", "Grill"],
        dietaryRestrictions: ["None - loves meat"],
        priceRange: "$$-$$$",
        ambiance: ["Sports bar", "Casual", "Outdoor"],
        occasions: ["Sports watching", "Boys night", "Weekend BBQ"]
      },
      lifestyle: {
        workSchedule: "Tradesman",
        diningFrequency: "2-3 times per week",
        groupSize: "4-8 mates",
        bookingAdvance: "Same day to 2 days"
      },
      queries: [
        "Best steakhouse in Richmond for boys night out",
        "BBQ place to watch the footy with big group",
        "American-style ribs and wings near Swan Street"
      ]
    }
  },
  {
    username: "mei_authentic_asian",
    email: "mei.foodie@email.com",
    profile: {
      name: "Mei Lin",
      age: 33,
      suburb: "Glen Waverley",
      preferences: {
        cuisines: ["Authentic Chinese", "Korean", "Malaysian", "Taiwanese"],
        dietaryRestrictions: ["None"],
        priceRange: "$$",
        ambiance: ["Authentic", "Busy", "Traditional"],
        occasions: ["Family dinners", "Nostalgic food", "Weekend yum cha"]
      },
      lifestyle: {
        workSchedule: "Accountant",
        diningFrequency: "4-5 times per week",
        groupSize: "Family groups 6-10",
        bookingAdvance: "1 week for weekends"
      },
      queries: [
        "Most authentic Cantonese dim sum in Glen Waverley",
        "Traditional Chinese hot pot for family gathering",
        "Best Malaysian restaurant that reminds me of home"
      ]
    }
  },
  {
    username: "alex_flexitarian_explorer",
    email: "alex.explore@email.com",
    profile: {
      name: "Alex Rodriguez",
      age: 29,
      suburb: "St Kilda",
      preferences: {
        cuisines: ["Fusion", "Modern", "International", "Experimental"],
        dietaryRestrictions: ["Flexitarian", "Sustainable focus"],
        priceRange: "$$-$$$",
        ambiance: ["Trendy", "Instagram-worthy", "Innovative"],
        occasions: ["Food exploration", "Social media", "Date nights"]
      },
      lifestyle: {
        workSchedule: "Social media manager",
        diningFrequency: "4-5 times per week",
        groupSize: "2-4 people",
        bookingAdvance: "3-5 days ahead"
      },
      queries: [
        "Most innovative fusion restaurant for Instagram photos",
        "Sustainable farm-to-table dining in St Kilda",
        "Unusual cuisine I haven't tried before"
      ]
    }
  }
];

async function populateCustomerProfiles() {
  try {
    console.log('👥 Creating 10 diverse customer profiles for AI Genie testing...\n');
    const hashedPassword = await bcrypt.hash("demo123", 10);
    
    for (const customer of customerProfiles) {
      // Create customer user
      const [user] = await db.insert(users).values({
        username: customer.username,
        email: customer.email,
        password: hashedPassword,
        role: "customer"
      }).returning();

      console.log(`✅ Created: ${customer.profile.name}`);
      console.log(`   Suburb: ${customer.profile.suburb}`);
      console.log(`   Cuisines: ${customer.profile.preferences.cuisines.join(', ')}`);
      console.log(`   Dietary: ${customer.profile.preferences.dietaryRestrictions.join(', ')}`);
      console.log(`   Price: ${customer.profile.preferences.priceRange}`);
      console.log(`   Test queries: ${customer.profile.queries.length} prepared`);
      console.log();
    }

    console.log('🤖 AI Genie Test Scenarios Ready:');
    console.log('   - 10 customers with diverse food preferences');
    console.log('   - Geographic spread across Melbourne suburbs');
    console.log('   - Varied dietary restrictions and budgets'); 
    console.log('   - 30 total test queries prepared');
    console.log('   - Real-world dining patterns represented');
    
    console.log('\n🧪 Test Strategy:');
    console.log('   1. Each customer has 3 unique query scenarios');
    console.log('   2. AI Genie will adapt responses based on customer context');
    console.log('   3. Testing covers all major cuisines and dietary needs');
    console.log('   4. Geographic location awareness testing');
    console.log('   5. Price sensitivity and occasion matching');

  } catch (error) {
    console.error('❌ Error creating customer profiles:', error);
  } finally {
    await client.end();
  }
}

// Export customer data for AI Genie testing
export const testCustomers = customerProfiles;

populateCustomerProfiles();