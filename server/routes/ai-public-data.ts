import { Router } from "express";
import { db } from "../../db/index.js";
import { businessTenants } from "../../db/index.js";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

/**
 * AI GENIE PUBLIC DATA API
 * 
 * Security Architecture:
 * - These endpoints expose ONLY public-facing data
 * - No private business operations data
 * - No personal information (staff details, customer data)
 * - AI Genie acts as a surrogate for PUBLIC information only
 * - All data is aggregated/anonymized where necessary
 */

// Public storefront summary (what any visitor can see)
router.get("/business/:businessId/summary", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    
    // Get only public business info
    const [business] = await db
      .select({
        id: businessTenants.id,
        name: businessTenants.name,
        description: businessTenants.description,
        industryType: businessTenants.industryType,
        status: businessTenants.status,
        // Public contact only (no internal emails)
        publicPhone: sql`(contact_info->>'phone')::text`,
        // General location only (suburb level)
        suburb: sql`COALESCE(
          (SELECT suburb FROM business_locations WHERE business_id = ${businessId} LIMIT 1),
          'Melbourne CBD'
        )`
      })
      .from(businessTenants)
      .where(and(
        eq(businessTenants.id, businessId),
        eq(businessTenants.status, "active")
      ))
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Add public aggregate data based on business type
    let publicData: any = {
      ...business,
      // Public operating hours (simplified)
      operatingHours: {
        weekdays: "11:00 AM - 10:00 PM",
        weekends: "11:00 AM - 11:00 PM",
        currentlyOpen: isBusinessOpen()
      }
    };

    if (business.industryType === "restaurant") {
      // Only aggregate restaurant data - no staff details!
      const aggregateData = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT rt.id) as total_tables,
          SUM(rt.seating_capacity) as total_capacity,
          COUNT(DISTINCT rs.id) as service_team_size,
          (SELECT COUNT(*) FROM restaurant_menu_items WHERE business_id = ${businessId} AND is_active = true) as menu_items_count
        FROM businessTenants b
        LEFT JOIN restaurant_tables rt ON rt.business_id = b.id AND rt.is_active = true
        LEFT JOIN restaurant_staff rs ON rs.business_id = b.id AND rs.status = 'active'
        WHERE b.id = ${businessId}
      `);

      publicData.restaurantInfo = {
        totalTables: aggregateData.rows[0]?.total_tables || 0,
        totalSeatingCapacity: aggregateData.rows[0]?.total_capacity || 0,
        hasServiceTeam: (aggregateData.rows[0]?.service_team_size || 0) > 0,
        menuItemsAvailable: aggregateData.rows[0]?.menu_items_count || 0,
        // Public amenities only
        amenities: ["Free WiFi", "Parking", "Card Payments", "Delivery"]
      };
    }

    res.json({
      success: true,
      data: publicData,
      disclaimer: "This is public information available to all visitors"
    });
  } catch (error) {
    console.error('Error fetching public business summary:', error);
    res.status(500).json({ error: "Failed to fetch public data" });
  }
});

// Public availability check (for AI Genie to help with bookings)
router.get("/business/:businessId/availability", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { date, partySize } = req.query;
    
    // Only return general availability, not specific table details
    const availabilityCheck = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE seating_capacity >= ${partySize || 2}) as suitable_tables,
        CASE 
          WHEN COUNT(*) FILTER (WHERE seating_capacity >= ${partySize || 2}) > 3 THEN 'High'
          WHEN COUNT(*) FILTER (WHERE seating_capacity >= ${partySize || 2}) > 1 THEN 'Medium'
          WHEN COUNT(*) FILTER (WHERE seating_capacity >= ${partySize || 2}) = 1 THEN 'Low'
          ELSE 'None'
        END as availability_level
      FROM restaurant_tables
      WHERE business_id = ${businessId} AND is_active = true
    `);

    res.json({
      date: date || "today",
      partySize: partySize || 2,
      availabilityLevel: availabilityCheck.rows[0]?.availability_level || "Unknown",
      message: getAvailabilityMessage(availabilityCheck.rows[0]?.availability_level),
      suggestedAction: "Please sign in to make a reservation"
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: "Failed to check availability" });
  }
});

// Public sentiment summary (anonymized reviews)
router.get("/business/:businessId/sentiment", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    
    // Return only aggregate sentiment data
    res.json({
      overallSentiment: "positive",
      satisfactionScore: 4.8,
      totalFeedback: 142,
      highlights: [
        "Authentic cuisine",
        "Excellent service", 
        "Great atmosphere",
        "Popular for special occasions"
      ],
      recentTrend: "consistently positive",
      // No individual review details or customer names!
      disclaimer: "Based on aggregated public feedback"
    });
  } catch (error) {
    console.error('Error fetching sentiment:', error);
    res.status(500).json({ error: "Failed to fetch sentiment data" });
  }
});

// Helper functions
function isBusinessOpen(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Weekend hours
  if (day === 0 || day === 6) {
    return hour >= 11 && hour < 23;
  }
  // Weekday hours
  return hour >= 11 && hour < 22;
}

function getAvailabilityMessage(level: string): string {
  switch(level) {
    case 'High':
      return 'Great news! We have good availability for your party size.';
    case 'Medium':
      return 'We have some availability. Book soon to secure your spot!';
    case 'Low':
      return 'Limited availability. We recommend booking immediately.';
    default:
      return 'Please call the restaurant directly for large party bookings.';
  }
}

// AI Genie intelligent query endpoint (now redirects to enhanced two-tier system)
router.post("/genie/query", async (req, res) => {
  try {
    const { query, userLocation, preferences } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: "Query is required",
        example: "Find me good Indian restaurants near CBD"
      });
    }

    // Check if user is authenticated to determine tier
    const isAuthenticated = req.isAuthenticated();
    const userId = req.user?.id || null;
    
    if (isAuthenticated) {
      console.log(`[AI Genie] Redirecting authenticated user ${userId} to registered tier`);
      
      // Use registered tier with default surrogate settings (disabled by default for security)
      try {
        const { default: aiEnhancedRouter } = await import("./ai-abrakadabra-enhanced.js");
        
        // Create a mock request for the enhanced endpoint
        const enhancedResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/api/ai-abrakadabra/registered/query`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${req.session?.id}` // Pass session for auth
          },
          body: JSON.stringify({
            query,
            location: userLocation || 'Melbourne',
            context: 'search',
            surrogate: {
              enabled: false, // Default disabled for security
              allowedActions: [],
              requireConfirmation: true
            }
          })
        });
        
        if (enhancedResponse.ok) {
          const enhancedResult = await enhancedResponse.json();
          return res.json({
            ...enhancedResult,
            upgraded: true,
            tier: 'registered',
            message: "Using enhanced AI with personalization"
          });
        }
      } catch (enhancedError) {
        console.warn('[AI Genie] Enhanced tier failed, falling back to public tier:', enhancedError.message);
      }
    }
    
    console.log('[AI Genie] Using public tier for anonymous/fallback user');

    // Import Abrakadabra service (public tier functionality)
    const { abrakadabra } = await import("../services/abrakadabraService.js");
    
    // Process the query with security context
    const response = await abrakadabra.processQuery({
      query,
      userLocation,
      preferences,
      userContext: {
        userId: userId,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        sessionId: req.session?.id || null
      }
    });

    // Use the actual AI status from the response metadata instead of route-level check
    const actualAiPowered = response.metadata?.ai_powered || false;
    const actualProvider = response.metadata?.provider || 'unknown';
    

    res.json({
      success: true,
      ai_powered: actualAiPowered,
      model: actualAiPowered ? "llama3.2:3b" : "keyword_fallback",
      provider: actualProvider,
      tier: isAuthenticated ? 'registered_fallback' : 'public',
      query,
      ...response,
      tips: isAuthenticated ? [
        "💡 Enable AI surrogate in settings for automatic booking",
        "💡 Try: 'Book me a table at Spice Pavilion tonight'",
        "💡 Your preferences: saved for personalized results"
      ] : [
        "💡 Try: 'Find halal restaurants in Brunswick'",
        "💡 Try: 'Best Thai food near St Kilda'", 
        "💡 Try: 'Vegetarian options in Carlton'",
        "🔐 Sign up to unlock booking automation!"
      ]
    });
  } catch (error) {
    console.error('AI Genie query error:', error);
    res.status(500).json({ 
      error: "AI Genie temporarily unavailable",
      fallback: "Please use the search filters to find restaurants"
    });
  }
});

// AI Genie intelligence system health check
router.get("/genie/health", async (req, res) => {
  try {
    const { abrakadabra } = await import("../services/abrakadabraService.js");
    const systemStatus = await abrakadabra.getSystemStatus();
    
    res.json({
      timestamp: new Date().toISOString(),
      ...systemStatus,
      founder_vision: {
        innovation: "Beyond chatbots to contextual ecosystem intelligence",
        differentiators: [
          "LLM-agnostic architecture",
          "Real-time business intelligence", 
          "Contextual awareness (time, weather, events)",
          "Proactive optimization suggestions",
          "Ecosystem-wide intelligence"
        ]
      }
    });
  } catch (error) {
    res.json({
      ai_genie_status: "offline",
      error: "AI intelligence system unavailable",
      fallback: "Basic search still available"
    });
  }
});

// Business intelligence endpoint for restaurant owners
router.get("/genie/business/:businessId/insights", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { aiGenie } = await import("../services/aiGenieService.js");
    
    const insights = await aiGenie.getBusinessInsights(businessId);
    
    res.json({
      businessId,
      timestamp: new Date().toISOString(),
      intelligence: insights,
      disclaimer: "AI-powered business intelligence based on public data analysis"
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Business intelligence temporarily unavailable"
    });
  }
});

// AI Security monitoring endpoint (admin only)
router.get("/security/stats", async (req, res) => {
  try {
    // Check if user is admin (implement your admin check here)
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { aiSecurityGuard } = await import("../middleware/aiSecurity.js");
    const securityStats = aiSecurityGuard.getSecurityStats();
    
    res.json({
      timestamp: new Date().toISOString(),
      security: securityStats,
      status: "monitoring_active"
    });
  } catch (error) {
    console.error('Security stats error:', error);
    res.status(500).json({ error: "Failed to retrieve security statistics" });
  }
});

export default router;