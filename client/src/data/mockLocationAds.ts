// Mock location-aware advertising data to demonstrate the system
// This would normally come from the backend API

export interface MockLocationAd {
  id: number;
  businessId: number;
  title: string;
  content: string;
  imageUrl?: string;
  clickUrl?: string;
  adType: "sidebar_left" | "sidebar_right";
  size: "small" | "medium" | "large" | "full";
  animationType: "static" | "slide" | "fade" | "flash" | "bounce";
  priority: number;
  targetingRules: {
    categories?: string[];
    industries?: string[];
    keywords?: string[];
    location?: {
      city?: string;
      suburb?: string;
      state?: string;
      radius?: number; // km radius for targeting
      coordinates?: { lat: number; lng: number };
    };
    targeting: "local" | "global" | "both";
  };
  business: {
    name: string;
    industryType: string;
    subscriptionTier: "free" | "premium" | "enterprise";
    contactInfo: {
      address?: string;
      city?: string;
      suburb?: string;
      state?: string;
      coordinates?: { lat: number; lng: number };
    };
  };
}

// Melbourne CBD coordinates: -37.8136, 144.9631
// Sample locations around Melbourne for demonstration
export const mockLocationAds: MockLocationAd[] = [
  // Premium Local Restaurant - Melbourne CBD
  {
    id: 1,
    businessId: 101,
    title: "🍛 Authentic Indian Cuisine - 50% OFF First Visit!",
    content: "Experience the flavors of India in the heart of Melbourne CBD. Premium spices, traditional recipes, fresh ingredients daily.",
    adType: "sidebar_left",
    size: "medium",
    animationType: "flash",
    priority: 9,
    targetingRules: {
      categories: ["restaurant"],
      industries: ["restaurant"],
      keywords: ["indian", "food", "dinner", "lunch"],
      location: {
        city: "Melbourne",
        suburb: "CBD",
        state: "Victoria",
        radius: 5,
        coordinates: { lat: -37.8136, lng: 144.9631 }
      },
      targeting: "local"
    },
    business: {
      name: "Spice Paradise",
      industryType: "restaurant",
      subscriptionTier: "premium",
      contactInfo: {
        address: "123 Collins Street, Melbourne CBD",
        city: "Melbourne",
        suburb: "CBD", 
        state: "Victoria",
        coordinates: { lat: -37.8140, lng: 144.9635 }
      }
    }
  },

  // Enterprise Hair Salon - South Yarra (close to CBD)
  {
    id: 2,
    businessId: 102,
    title: "✨ Premium Hair & Beauty Salon",
    content: "Celebrity stylists, luxury treatments, organic products. Book your transformation today!",
    adType: "sidebar_right",
    size: "large",
    animationType: "bounce",
    priority: 10,
    targetingRules: {
      categories: ["salon"],
      industries: ["salon"],
      keywords: ["hair", "beauty", "style", "cut"],
      location: {
        city: "Melbourne",
        suburb: "South Yarra",
        state: "Victoria", 
        radius: 10,
        coordinates: { lat: -37.8400, lng: 144.9900 }
      },
      targeting: "local"
    },
    business: {
      name: "Glamour Studio",
      industryType: "salon",
      subscriptionTier: "enterprise",
      contactInfo: {
        address: "456 Toorak Road, South Yarra",
        city: "Melbourne",
        suburb: "South Yarra",
        state: "Victoria",
        coordinates: { lat: -37.8405, lng: 144.9905 }
      }
    }
  },

  // Free Tier Global Business - Shows everywhere
  {
    id: 3,
    businessId: 103,
    title: "📱 Online Digital Services",
    content: "Web design, app development, digital marketing. Serving clients worldwide!",
    adType: "sidebar_left",
    size: "small",
    animationType: "fade",
    priority: 3,
    targetingRules: {
      categories: ["professional"],
      industries: ["professional"],
      keywords: ["web", "digital", "online"],
      targeting: "global"
    },
    business: {
      name: "Digital Solutions Co",
      industryType: "professional",
      subscriptionTier: "free",
      contactInfo: {
        address: "Online Business",
        city: "Global",
        suburb: "",
        state: ""
      }
    }
  },

  // Premium Event Management - Carlton (nearby suburb) 
  {
    id: 4,
    businessId: 104,
    title: "🎉 Wedding & Event Specialists",
    content: "Perfect weddings, corporate events, birthdays. Premium planning services with 10+ years experience.",
    adType: "sidebar_right",
    size: "medium",
    animationType: "slide",
    priority: 8,
    targetingRules: {
      categories: ["event"],
      industries: ["event"],
      keywords: ["wedding", "event", "party", "celebration"],
      location: {
        city: "Melbourne",
        suburb: "Carlton",
        state: "Victoria",
        radius: 8,
        coordinates: { lat: -37.8000, lng: 144.9700 }
      },
      targeting: "both"
    },
    business: {
      name: "Elite Events Melbourne",
      industryType: "event",
      subscriptionTier: "premium",
      contactInfo: {
        address: "789 Lygon Street, Carlton",
        city: "Melbourne",
        suburb: "Carlton",
        state: "Victoria",
        coordinates: { lat: -37.8005, lng: 144.9705 }
      }
    }
  },

  // Premium Real Estate - Richmond (nearby)
  {
    id: 5,
    businessId: 105,
    title: "🏠 Melbourne Property Experts",
    content: "Buy, sell, rent in Melbourne's best suburbs. Local knowledge, premium service, proven results.",
    adType: "sidebar_left",
    size: "large",
    animationType: "flash",
    priority: 7,
    targetingRules: {
      categories: ["realestate"],
      industries: ["realestate"],
      keywords: ["property", "house", "apartment", "real estate"],
      location: {
        city: "Melbourne",
        suburb: "Richmond",
        state: "Victoria",
        radius: 15,
        coordinates: { lat: -37.8300, lng: 145.0000 }
      },
      targeting: "local"
    },
    business: {
      name: "Melbourne Property Partners",
      industryType: "realestate",
      subscriptionTier: "premium",
      contactInfo: {
        address: "321 Swan Street, Richmond",
        city: "Melbourne",
        suburb: "Richmond", 
        state: "Victoria",
        coordinates: { lat: -37.8305, lng: 145.0005 }
      }
    }
  }
];

// Helper function to filter ads based on user location and preferences
export const getLocationAwareAds = (
  userLocation: { latitude: number; longitude: number; city?: string; suburb?: string } | null,
  category?: string,
  adType?: "sidebar_left" | "sidebar_right"
) => {
  let filteredAds = mockLocationAds;

  // Filter by ad type
  if (adType) {
    filteredAds = filteredAds.filter(ad => ad.adType === adType);
  }

  // Filter by category if specified
  if (category) {
    filteredAds = filteredAds.filter(ad => 
      ad.business.industryType === category || 
      ad.targetingRules.categories?.includes(category)
    );
  }

  // Calculate distances and apply location filtering
  if (userLocation) {
    filteredAds = filteredAds.map(ad => {
      if (ad.business.contactInfo.coordinates) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          ad.business.contactInfo.coordinates.lat,
          ad.business.contactInfo.coordinates.lng
        );
        
        return {
          ...ad,
          distance,
          isLocal: distance <= 25 // Consider within 25km as local
        };
      }
      return { ...ad, isLocal: false };
    });

    // Sort by relevance: Local premium businesses first, then by distance and subscription tier
    filteredAds.sort((a, b) => {
      let aScore = a.priority;
      let bScore = b.priority;

      // Major boost for local businesses
      if (a.isLocal) aScore += 15;
      if (b.isLocal) bScore += 15;

      // Subscription tier boost
      if (a.business.subscriptionTier === 'premium') aScore += 8;
      if (b.business.subscriptionTier === 'premium') bScore += 8;
      if (a.business.subscriptionTier === 'enterprise') aScore += 12;
      if (b.business.subscriptionTier === 'enterprise') bScore += 12;

      // Distance boost (closer is better)
      if (a.distance !== undefined) aScore += Math.max(0, 10 - a.distance);
      if (b.distance !== undefined) bScore += Math.max(0, 10 - b.distance);

      return bScore - aScore;
    });
  }

  return filteredAds;
};

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}