import { db } from '../server/db/index.js';
import { users, businesses, businessSubscriptions, businessLocations, businessAdCampaigns } from '../server/db/schema.js';
import { hash } from '../server/auth.js';

// Melbourne Suburbs Test Data - 10 Realistic Businesses
const melbourneBusinesses = [
  {
    // 1. CBD Restaurant
    business: {
      name: "Spice Paradise Indian Restaurant",
      industryType: "restaurant",
      description: "Authentic North Indian cuisine in the heart of Melbourne CBD",
      contactInfo: {
        phone: "+61 3 9663 4567",
        email: "info@spiceparadise.com.au",
        website: "https://spiceparadise.com.au"
      }
    },
    owner: {
      username: "rajesh_spiceparadise",
      email: "rajesh@spiceparadise.com.au",
      password: "SecurePass123!"
    },
    location: {
      latitude: -37.8136,
      longitude: 144.9631,
      address: "123 Collins Street",
      city: "Melbourne",
      suburb: "CBD",
      state: "Victoria",
      postcode: "3000"
    },
    subscription: {
      tier: "premium",
      enabledModules: ["restaurant", "event"],
      adTargeting: "both"
    },
    campaigns: [
      {
        title: "50% OFF First Visit - Authentic Indian Cuisine",
        content: "Experience the flavors of India! Book now for exclusive discount on your first dining experience.",
        adType: "sidebar_left",
        size: "large",
        animationType: "flash",
        targeting: "local",
        targetRadius: 5,
        budget: 200.00
      },
      {
        title: "Weekend Special - Indian Buffet",
        content: "All-you-can-eat weekend buffet with over 20 dishes. Family-friendly!",
        adType: "banner",
        size: "medium",
        animationType: "fade",
        targeting: "both",
        targetRadius: 15,
        budget: 150.00
      }
    ]
  },
  
  {
    // 2. Richmond Salon
    business: {
      name: "Bella Vista Hair & Beauty",
      industryType: "salon",
      description: "Premium hair and beauty services in trendy Richmond",
      contactInfo: {
        phone: "+61 3 9428 7890",
        email: "bookings@bellavista.com.au",
        website: "https://bellavista.com.au"
      }
    },
    owner: {
      username: "sophia_bellavista",
      email: "sophia@bellavista.com.au",
      password: "SecurePass123!"
    },
    location: {
      latitude: -37.8197,
      longitude: 144.9969,
      address: "456 Swan Street",
      city: "Melbourne",
      suburb: "Richmond",
      state: "Victoria",
      postcode: "3121"
    },
    subscription: {
      tier: "enterprise",
      enabledModules: ["salon", "event", "retail"],
      adTargeting: "both"
    },
    campaigns: [
      {
        title: "New Client Special - 30% OFF",
        content: "Welcome to Bella Vista! First-time clients get 30% off any service. Book online now!",
        adType: "sidebar_right",
        size: "medium",
        animationType: "bounce",
        targeting: "local",
        targetRadius: 8,
        budget: 300.00
      }
    ]
  },

  {
    // 3. South Yarra Event Planning
    business: {
      name: "Elite Events Melbourne",
      industryType: "event",
      description: "Luxury event planning and management services",
      contactInfo: {
        phone: "+61 3 9827 3456",
        email: "events@elitemelbourne.com.au",
        website: "https://eliteeventsmelbourne.com.au"
      }
    },
    owner: {
      username: "alexandra_elite",
      email: "alexandra@elitemelbourne.com.au",
      password: "SecurePass123!"
    },
    location: {
      latitude: -37.8336,
      longitude: 144.9892,
      address: "789 Toorak Road",
      city: "Melbourne",
      suburb: "South Yarra",
      state: "Victoria",
      postcode: "3141"
    },
    subscription: {
      tier: "premium",
      enabledModules: ["event", "professional"],
      adTargeting: "both"
    },
    campaigns: [
      {
        title: "Wedding Season 2025 - Book Early",
        content: "Planning your dream wedding? Elite Events offers comprehensive packages. Free consultation!",
        adType: "featured",
        size: "large",
        animationType: "slide",
        targeting: "both",
        targetRadius: 25,
        budget: 500.00
      }
    ]
  },

  {
    // 4. Fitzroy Real Estate
    business: {
      name: "Fitzroy Property Partners",
      industryType: "realestate",
      description: "Boutique real estate agency specializing in inner Melbourne properties",
      contactInfo: {
        phone: "+61 3 9417 8901",
        email: "sales@fitzroyproperty.com.au",
        website: "https://fitzroyproperty.com.au"
      }
    },
    owner: {
      username: "michael_fitzroy",
      email: "michael@fitzroyproperty.com.au",
      password: "SecurePass123!"
    },
    location: {
      latitude: -37.7982,
      longitude: 144.9784,
      address: "321 Brunswick Street",
      city: "Melbourne",
      suburb: "Fitzroy",
      state: "Victoria",
      postcode: "3065"
    },
    subscription: {
      tier: "enterprise",
      enabledModules: ["realestate", "professional"],
      adTargeting: "local"
    },
    campaigns: [
      {
        title: "Dream Home Awaits - Fitzroy Properties",
        content: "Discover unique properties in Melbourne's most vibrant neighborhoods. Expert local knowledge.",
        adType: "sidebar_left",
        size: "large",
        animationType: "none",
        targeting: "local",
        targetRadius: 12,
        budget: 400.00
      }
    ]
  },

  {
    // 5. St Kilda Professional Services
    business: {
      name: "Coastal Accounting Solutions",
      industryType: "professional",
      description: "Full-service accounting and tax services for individuals and businesses",
      contactInfo: {
        phone: "+61 3 9534 5678",
        email: "info@coastalaccounting.com.au",
        website: "https://coastalaccounting.com.au"
      }
    },
    owner: {
      username: "david_coastal",
      email: "david@coastalaccounting.com.au",
      password: "SecurePass123!"
    },
    location: {
      latitude: -37.8677,
      longitude: 144.9778,
      address: "654 Acland Street",
      city: "Melbourne",
      suburb: "St Kilda",
      state: "Victoria",
      postcode: "3182"
    },
    subscription: {
      tier: "premium",
      enabledModules: ["professional"],
      adTargeting: "both"
    },
    campaigns: [
      {
        title: "Tax Time Made Easy - Free Consultation",
        content: "Stress-free tax returns and business accounting. St Kilda's trusted accountants since 2010.",
        adType: "banner",
        size: "medium",
        animationType: "fade",
        targeting: "both",
        targetRadius: 20,
        budget: 250.00
      }
    ]
  },

  {
    // 6. Prahran Retail Store
    business: {
      name: "Urban Threads Boutique",
      industryType: "retail",
      description: "Contemporary fashion and accessories for the modern Melbourne lifestyle",
      contactInfo: {
        phone: "+61 3 9529 8765",
        email: "hello@urbanthreads.com.au",
        website: "https://urbanthreads.com.au"
      }
    },
    owner: {
      username: "emma_urban",
      email: "emma@urbanthreads.com.au",
      password: "SecurePass123!"
    },
    location: {
      latitude: -37.8509,
      longitude: 144.9901,
      address: "987 Chapel Street",
      city: "Melbourne",
      suburb: "Prahran",
      state: "Victoria",
      postcode: "3181"
    },
    subscription: {
      tier: "free",
      enabledModules: ["retail"],
      adTargeting: "global"
    },
    campaigns: [
      {
        title: "New Collection Launch - Fashion Forward",
        content: "Discover the latest trends at Urban Threads. Sustainable fashion for conscious consumers.",
        adType: "sidebar_right",
        size: "small",
        animationType: "none",
        targeting: "global",
        targetRadius: 0,
        budget: 50.00
      }
    ]
  },

  {
    // 7. Carlton Restaurant
    business: {
      name: "Nonna Maria's Italian Kitchen",
      industryType: "restaurant",
      description: "Traditional Italian family recipes passed down through generations",
      contactInfo: {
        phone: "+61 3 9347 2345",
        email: "ciao@nonnamarias.com.au",
        website: "https://nonnamarias.com.au"
      }
    },
    owner: {
      username: "giuseppe_nonna",
      email: "giuseppe@nonnamarias.com.au", 
      password: "SecurePass123!"
    },
    location: {
      latitude: -37.7963,
      longitude: 144.9669,
      address: "234 Lygon Street",
      city: "Melbourne",
      suburb: "Carlton",
      state: "Victoria",
      postcode: "3053"
    },
    subscription: {
      tier: "premium",
      enabledModules: ["restaurant"],
      adTargeting: "local"
    },
    campaigns: [
      {
        title: "Authentic Italian - Family Recipes",
        content: "Taste Italy in Carlton! Wood-fired pizzas, handmade pasta, and Nonna's secret sauces.",
        adType: "sidebar_left",
        size: "medium",
        animationType: "slide",
        targeting: "local",
        targetRadius: 6,
        budget: 180.00
      }
    ]
  },

  {
    // 8. Collingwood Salon
    business: {
      name: "Ink & Steel Tattoo Studio",
      industryType: "salon",
      description: "Award-winning tattoo artists and body piercing specialists",
      contactInfo: {
        phone: "+61 3 9417 5432",
        email: "bookings@inkandsteel.com.au",
        website: "https://inkandsteel.com.au"
      }
    },
    owner: {
      username: "jake_inksteel",
      email: "jake@inkandsteel.com.au",
      password: "SecurePass123!"
    },
    location: {
      latitude: -37.8048,
      longitude: 144.9882,
      address: "567 Smith Street",
      city: "Melbourne",
      suburb: "Collingwood",
      state: "Victoria",
      postcode: "3066"
    },
    subscription: {
      tier: "premium",
      enabledModules: ["salon", "retail"],
      adTargeting: "both"
    },
    campaigns: [
      {
        title: "Custom Tattoo Designs - Book Consultation",
        content: "Award-winning artists, sterile environment, unique designs. Walk-ins welcome!",
        adType: "featured",
        size: "large",
        animationType: "flash",
        targeting: "both",
        targetRadius: 18,
        budget: 350.00
      }
    ]
  },

  {
    // 9. Hawthorn Professional Services
    business: {
      name: "Eastside Legal Group",
      industryType: "professional",
      description: "Comprehensive legal services for individuals and businesses in Eastern Melbourne",
      contactInfo: {
        phone: "+61 3 9818 7654",
        email: "legal@eastsidelegal.com.au",
        website: "https://eastsidelegal.com.au"
      }
    },
    owner: {
      username: "sarah_eastside",
      email: "sarah@eastsidelegal.com.au",
      password: "SecurePass123!"
    },
    location: {
      latitude: -37.8220,
      longitude: 145.0284,
      address: "432 Burke Road",
      city: "Melbourne",
      suburb: "Hawthorn",
      state: "Victoria",
      postcode: "3122"
    },
    subscription: {
      tier: "enterprise",
      enabledModules: ["professional"],
      adTargeting: "both"
    },
    campaigns: [
      {
        title: "Legal Expertise You Can Trust",
        content: "Family law, property, business legal advice. Free 30-minute consultation for new clients.",
        adType: "banner",
        size: "medium",
        animationType: "fade",
        targeting: "both",
        targetRadius: 15,
        budget: 300.00
      }
    ]
  },

  {
    // 10. Northcote Event Venue
    business: {
      name: "The Rooftop at Northcote",
      industryType: "event",
      description: "Unique rooftop venue for weddings, corporate events, and private functions",
      contactInfo: {
        phone: "+61 3 9482 1234",
        email: "events@rooftopnorthcote.com.au",
        website: "https://rooftopnorthcote.com.au"
      }
    },
    owner: {
      username: "melissa_rooftop",
      email: "melissa@rooftopnorthcote.com.au",
      password: "SecurePass123!"
    },
    location: {
      latitude: -37.7701,
      longitude: 144.9959,
      address: "123 High Street",
      city: "Melbourne",
      suburb: "Northcote",
      state: "Victoria",
      postcode: "3070"
    },
    subscription: {
      tier: "free",
      enabledModules: ["event"],
      adTargeting: "global"
    },
    campaigns: [
      {
        title: "Stunning Rooftop Venue - Book Your Event",
        content: "Panoramic city views, full-service catering, perfect for any occasion. View our gallery!",
        adType: "sidebar_right",
        size: "small",
        animationType: "bounce",
        targeting: "global",
        targetRadius: 0,
        budget: 75.00
      }
    ]
  }
];

// Crypto functions (from auth.ts)
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }
};

export async function populateMelbourneTestData() {
  console.log('🚀 Populating Melbourne Test Data...');
  console.log('===================================');
  
  try {
    let businessCount = 0;
    
    for (const data of melbourneBusinesses) {
      console.log(`\n📍 Creating: ${data.business.name} (${data.location.suburb})`);
      
      // 1. Create user account
      const hashedPassword = await crypto.hash(data.owner.password);
      
      const [user] = await db
        .insert(users)
        .values({
          username: data.owner.username,
          email: data.owner.email,
          password: hashedPassword,
          role: "business",
          createdAt: new Date()
        })
        .returning();
      
      console.log(`   ✅ User created: ${user.username} (ID: ${user.id})`);
      
      // 2. Create business profile
      const [business] = await db
        .insert(businesses)
        .values({
          userId: user.id,
          name: data.business.name,
          description: data.business.description,
          industryType: data.business.industryType,
          contactInfo: data.business.contactInfo,
          status: "active",
          onboardingCompleted: true,
          createdAt: new Date()
        })
        .returning();
      
      console.log(`   ✅ Business created: ${business.name} (ID: ${business.id})`);
      
      // 3. Create subscription with 180-day trial
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 180);
      
      const tierLimits = {
        free: { maxAds: 5, priority: 1 },
        premium: { maxAds: 25, priority: 8 },
        enterprise: { maxAds: 999, priority: 12 }
      };
      
      const limits = tierLimits[data.subscription.tier as keyof typeof tierLimits];
      
      const [subscription] = await db
        .insert(businessSubscriptions)
        .values({
          businessId: business.id,
          tier: data.subscription.tier,
          status: "trial",
          trialEndDate,
          enabledModules: data.subscription.enabledModules,
          adTargeting: data.subscription.adTargeting,
          adPriority: limits.priority,
          maxAdsPerMonth: limits.maxAds,
          features: {},
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      console.log(`   ✅ Subscription: ${subscription.tier} tier (${limits.maxAds} ads/month)`);
      
      // 4. Create business location
      const [location] = await db
        .insert(businessLocations)
        .values({
          businessId: business.id,
          latitude: data.location.latitude.toString(),
          longitude: data.location.longitude.toString(),
          address: data.location.address,
          city: data.location.city,
          suburb: data.location.suburb,
          state: data.location.state,
          postcode: data.location.postcode,
          country: "Australia",
          isVerified: true,
          verificationMethod: "manual",
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      console.log(`   ✅ Location: ${location.suburb}, ${location.postcode}`);
      
      // 5. Create ad campaigns
      let campaignCount = 0;
      for (const campaignData of data.campaigns) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 30); // 30-day campaigns
        
        const [campaign] = await db
          .insert(businessAdCampaigns)
          .values({
            businessId: business.id,
            title: campaignData.title,
            content: campaignData.content,
            adType: campaignData.adType,
            size: campaignData.size,
            animationType: campaignData.animationType,
            targeting: campaignData.targeting,
            targetRadius: campaignData.targetRadius,
            status: "active",
            budget: campaignData.budget,
            priority: limits.priority,
            startDate,
            endDate,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        campaignCount++;
        console.log(`   ✅ Campaign ${campaignCount}: ${campaign.title.substring(0, 40)}...`);
      }
      
      businessCount++;
      console.log(`   🎯 Total campaigns: ${campaignCount}`);
    }
    
    console.log('\n🎉 SUCCESS: Melbourne Test Data Population Complete!');
    console.log('======================================================');
    console.log(`✅ Created ${businessCount} businesses across Melbourne suburbs`);
    console.log('✅ All businesses have subscriptions with 180-day trials');
    console.log('✅ Location data set for distance-based ad targeting');
    console.log('✅ Ad campaigns active with varied targeting strategies');
    console.log('');
    console.log('📍 Suburbs covered:');
    console.log('   - CBD, Richmond, South Yarra, Fitzroy, St Kilda');
    console.log('   - Prahran, Carlton, Collingwood, Hawthorn, Northcote');
    console.log('');
    console.log('🎯 Subscription distribution:');
    console.log('   - Free tier: 2 businesses (global ads only)');
    console.log('   - Premium tier: 6 businesses (local + global ads)');
    console.log('   - Enterprise tier: 2 businesses (unlimited ads)');
    console.log('');
    console.log('🔍 Ready for testing:');
    console.log('   - Location-aware ad targeting');
    console.log('   - Distance calculations');
    console.log('   - Subscription tier differences');
    console.log('   - Business dashboard functionality');
    
  } catch (error) {
    console.error('❌ Error populating test data:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  populateMelbourneTestData()
    .then(() => {
      console.log('\n🚀 Test data population complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Population failed:', error);
      process.exit(1);
    });
}