import { Router } from "express";
import { db } from "../../db/index.js";
import { 
  businessTenants,
  restaurantTables,
  bookings,
  platformUsers
} from "../../db/index.js";
import { eq, and, ilike, sql, or } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Validation schemas
const publicQuerySchema = z.object({
  query: z.string().min(1).max(500),
  location: z.string().optional(),
  context: z.enum(['search', 'discovery', 'information']).default('search')
});

const registeredQuerySchema = z.object({
  query: z.string().min(1).max(500),
  location: z.string().optional(),
  context: z.enum(['search', 'discovery', 'booking', 'management']).default('search'),
  surrogate: z.object({
    enabled: z.boolean(),
    allowedActions: z.array(z.enum(['book', 'cancel', 'modify', 'pay'])).optional(),
    requireConfirmation: z.boolean().optional()
  }).optional()
});

// Enhanced business metadata for AI context
interface BusinessMetadata {
  id: number;
  name: string;
  slug: string;
  industryType: string;
  description: string;
  location: {
    address: string;
    suburb: string;
    city: string;
    coordinates?: { lat: number; lng: number; };
  };
  availability: {
    isOpen: boolean;
    nextAvailable?: string;
    popularTimes?: string[];
  };
  ratings: {
    average: number;
    count: number;
  };
  features: string[];
  priceRange: '$' | '$$' | '$$$' | '$$$$';
}

// PUBLIC TIER: Search-intensive, read-only AI assistant
router.post("/ai-abrakadabra/public/query", async (req, res) => {
  try {
    const validationResult = publicQuerySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid query format",
        details: validationResult.error.issues
      });
    }

    const { query, location = 'Melbourne', context } = validationResult.data;
    
    console.log(`[Public Abrakadabra] Processing query: "${query}" in ${location}`);

    // Step 1: Parse query intent and extract entities
    const queryAnalysis = await analyzePublicQuery(query, location);
    
    // Step 2: Get smart business metadata (read-only, public data)
    const businessMatches = await getSmartBusinessMatches(queryAnalysis);
    
    // Step 3: Handle ambiguity and provide clarification
    const response = await generatePublicResponse(queryAnalysis, businessMatches, query);
    
    res.json({
      success: true,
      userType: 'public',
      intent: queryAnalysis.intent,
      response: response.message,
      businesses: response.businesses,
      suggestions: response.suggestions,
      needsClarification: response.needsClarification,
      metadata: {
        queryConfidence: queryAnalysis.confidence,
        businessMatches: businessMatches.length,
        fallbackUsed: response.fallbackUsed
      }
    });

  } catch (error) {
    console.error('[Public Abrakadabra] Error:', error);
    res.status(500).json({ 
      error: "AI service temporarily unavailable",
      fallback: "Please try using the search above or browse our business categories."
    });
  }
});

// REGISTERED TIER: Action-enabled AI assistant with surrogate permissions
router.post("/ai-abrakadabra/registered/query", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required for registered AI features" });
    }

    const validationResult = registeredQuerySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid query format", 
        details: validationResult.error.issues
      });
    }

    const { query, location = 'Melbourne', context, surrogate } = validationResult.data;
    const userId = req.user!.id;
    
    console.log(`[Registered Abrakadabra] User ${userId} query: "${query}"`);

    // Get user profile and preferences
    const userProfile = await getUserProfile(userId);
    
    // Parse query with user context
    const queryAnalysis = await analyzeRegisteredQuery(query, location, userProfile);
    
    // Check if action is requested and surrogate is enabled
    const canExecuteActions = surrogate?.enabled && 
                             queryAnalysis.intent === 'execute_action' &&
                             isActionAllowed(queryAnalysis.action, surrogate.allowedActions);

    let response;
    if (canExecuteActions) {
      // Execute action directly with confirmation if required
      if (surrogate.requireConfirmation) {
        response = await generateActionConfirmation(queryAnalysis, userProfile, surrogate);
      } else {
        response = await executeUserAction(queryAnalysis, userProfile, surrogate);
      }
    } else {
      // Provide search results with action suggestions  
      const businessMatches = await getSmartBusinessMatches(queryAnalysis);
      response = await generateRegisteredResponse(queryAnalysis, businessMatches, userProfile, query);
    }
    
    res.json({
      success: true,
      userType: 'registered',
      userId: userId,
      intent: queryAnalysis.intent,
      response: response.message,
      businesses: response.businesses,
      actions: response.actions,
      surrogateUsed: canExecuteActions,
      executionResult: response.executionResult,
      requiresConfirmation: surrogate?.requireConfirmation && canExecuteActions,
      metadata: {
        queryConfidence: queryAnalysis.confidence,
        userPreferences: response.personalizedContext,
        actionCapability: canExecuteActions,
        surrogateSettings: surrogate
      }
    });

  } catch (error) {
    console.error('[Registered Abrakadabra] Error:', error);
    res.status(500).json({ 
      error: "AI assistant temporarily unavailable",
      fallback: "You can still use manual booking and search features."
    });
  }
});

// HELPER FUNCTIONS

async function analyzePublicQuery(query: string, location: string) {
  // Enhanced query analysis for public users
  const lowercaseQuery = query.toLowerCase();
  
  // Intent classification
  let intent = 'search';
  if (lowercaseQuery.includes('book') || lowercaseQuery.includes('reserve')) {
    intent = 'book_intent';
  } else if (lowercaseQuery.includes('find') || lowercaseQuery.includes('show')) {
    intent = 'discovery';
  } else if (lowercaseQuery.includes('what') || lowercaseQuery.includes('how')) {
    intent = 'information';
  }

  // Business name extraction with disambiguation
  const businessNames = await extractBusinessNames(query);
  
  // Location parsing
  const locationData = parseLocation(query, location);
  
  // Industry/service type detection
  const serviceTypes = extractServiceTypes(query);
  
  return {
    intent,
    businessNames,
    location: locationData,
    serviceTypes,
    originalQuery: query,
    confidence: calculateConfidence(businessNames, locationData, serviceTypes)
  };
}

async function extractBusinessNames(query: string): Promise<Array<{name: string, confidence: number, matches: any[]}>> {
  // Search for potential business name matches in database
  const words = query.toLowerCase().split(/\s+/);
  const businessMatches = [];
  
  // Check for exact business name matches
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j <= words.length; j++) {
      const phrase = words.slice(i, j).join(' ');
      if (phrase.length >= 3) {
        const matches = await db
          .select()
          .from(businessTenants)
          .where(
            or(
              ilike(businessTenants.businessName, `%${phrase}%`),
              ilike(businessTenants.slug, `%${phrase.replace(/\s+/g, '-')}%`)
            )
          )
          .limit(5);
        
        if (matches.length > 0) {
          businessMatches.push({
            name: phrase,
            confidence: matches.length === 1 ? 0.9 : 0.6, // Higher confidence for unique matches
            matches: matches
          });
        }
      }
    }
  }
  
  return businessMatches;
}

function parseLocation(query: string, defaultLocation: string) {
  const locationKeywords = ['cbd', 'city', 'melbourne', 'sydney', 'near me', 'nearby'];
  const found = locationKeywords.find(keyword => 
    query.toLowerCase().includes(keyword)
  );
  
  return {
    detected: found || defaultLocation,
    confidence: found ? 0.8 : 0.5,
    isExplicit: !!found
  };
}

function extractServiceTypes(query: string): string[] {
  const serviceMap = {
    'restaurant': ['restaurant', 'food', 'dining', 'eat', 'meal', 'table'],
    'salon': ['salon', 'hair', 'beauty', 'facial', 'massage'],
    'retail': ['shop', 'store', 'buy', 'purchase'],
    'professional': ['service', 'consultation', 'appointment']
  };
  
  const detected = [];
  for (const [industry, keywords] of Object.entries(serviceMap)) {
    if (keywords.some(keyword => query.toLowerCase().includes(keyword))) {
      detected.push(industry);
    }
  }
  
  return detected;
}

async function getSmartBusinessMatches(queryAnalysis: any): Promise<BusinessMetadata[]> {
  let searchConditions = [];
  
  // Add business name conditions
  if (queryAnalysis.businessNames.length > 0) {
    const nameConditions = queryAnalysis.businessNames.map((bn: any) => 
      ilike(businessTenants.businessName, `%${bn.name}%`)
    );
    searchConditions.push(or(...nameConditions));
  }
  
  // Add industry type conditions
  if (queryAnalysis.serviceTypes.length > 0) {
    const industryConditions = queryAnalysis.serviceTypes.map((type: string) => 
      eq(businessTenants.industryType, type)
    );
    searchConditions.push(or(...industryConditions));
  }
  
  // If no specific conditions, search by general keywords
  if (searchConditions.length === 0) {
    searchConditions.push(
      or(
        ilike(businessTenants.businessName, `%${queryAnalysis.originalQuery}%`),
        ilike(businessTenants.businessDescription, `%${queryAnalysis.originalQuery}%`)
      )
    );
  }
  
  const businesses = await db
    .select()
    .from(businessTenants)
    .where(and(...searchConditions))
    .limit(10);
  
  // Transform to metadata format
  return businesses.map(business => ({
    id: business.id,
    name: business.businessName,
    slug: business.slug,
    industryType: business.industryType,
    description: business.businessDescription || '',
    location: {
      address: 'Melbourne', // This should come from business data
      suburb: 'CBD',
      city: 'Melbourne'
    },
    availability: {
      isOpen: true, // This should come from business hours
      nextAvailable: 'Tonight at 7:00 PM'
    },
    ratings: {
      average: 4.5, // This should come from reviews
      count: 127
    },
    features: [], // This should come from business features
    priceRange: '$$' as const
  }));
}

async function generatePublicResponse(queryAnalysis: any, businesses: BusinessMetadata[], originalQuery: string) {
  if (businesses.length === 0) {
    return {
      message: `I couldn't find any businesses matching "${originalQuery}". Could you try being more specific? For example:\n- Include the type of business (restaurant, salon, etc.)\n- Mention the area (CBD, suburbs)\n- Check the spelling of business names`,
      businesses: [],
      suggestions: [
        "Try searching for a specific type of business",
        "Include location details like 'CBD' or 'near me'",
        "Check for spelling of business names"
      ],
      needsClarification: true,
      fallbackUsed: true
    };
  }
  
  if (businesses.length === 1) {
    const business = businesses[0];
    return {
      message: `I found **${business.name}**! ${business.description}\n\nLocated in ${business.location.address} with ${business.ratings.average}⭐ rating from ${business.ratings.count} reviews.\n\n${business.availability.isOpen ? `Next available: ${business.availability.nextAvailable}` : 'Currently closed'}\n\nTo book a table, you'll need to sign up first!`,
      businesses: [business],
      suggestions: [
        "Sign up to book instantly",
        "View more details about this business",
        "Find similar businesses nearby"
      ],
      needsClarification: false,
      fallbackUsed: false
    };
  }
  
  // Multiple businesses found
  if (queryAnalysis.businessNames.length > 0 && businesses.length > 1) {
    const exactMatches = businesses.filter(b => 
      queryAnalysis.businessNames.some((bn: any) => 
        b.name.toLowerCase().includes(bn.name.toLowerCase())
      )
    );
    
    if (exactMatches.length > 1) {
      return {
        message: `I found ${exactMatches.length} businesses matching your search. Could you help me narrow it down?\n\n${exactMatches.map(b => `• **${b.name}** - ${b.location.address}`).join('\n')}`,
        businesses: exactMatches,
        suggestions: exactMatches.map(b => `Show me ${b.name}`),
        needsClarification: true,
        fallbackUsed: false
      };
    }
  }
  
  return {
    message: `I found ${businesses.length} great options for you:\n\n${businesses.slice(0, 3).map(b => 
      `• **${b.name}** - ${b.ratings.average}⭐ • ${b.location.address}`
    ).join('\n')}\n\nWould you like more details about any of these?`,
    businesses: businesses.slice(0, 3),
    suggestions: businesses.slice(0, 3).map(b => `Tell me about ${b.name}`),
    needsClarification: false,
    fallbackUsed: false
  };
}

function calculateConfidence(businessNames: any[], locationData: any, serviceTypes: string[]): number {
  let confidence = 0.3; // Base confidence
  
  if (businessNames.length > 0) confidence += 0.4;
  if (locationData.isExplicit) confidence += 0.2;
  if (serviceTypes.length > 0) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

// Registered user helper functions
async function getUserProfile(userId: number) {
  const [user] = await db
    .select()
    .from(platformUsers)
    .where(eq(platformUsers.id, userId));
  
  return {
    id: user.id,
    email: user.email,
    preferences: user.preferences || {},
    bookingHistory: [], // This should fetch recent bookings
    favoriteBusinesses: [] // This should fetch favorites
  };
}

async function analyzeRegisteredQuery(query: string, location: string, userProfile: any) {
  const analysis = await analyzePublicQuery(query, location);
  
  // Enhanced with user context
  const actionIntents = ['book', 'cancel', 'modify', 'reorder'];
  const hasActionIntent = actionIntents.some(action => 
    query.toLowerCase().includes(action)
  );
  
  if (hasActionIntent) {
    analysis.intent = 'execute_action';
    analysis.action = actionIntents.find(action => 
      query.toLowerCase().includes(action)
    );
  }
  
  return analysis;
}

function isActionAllowed(action: string, allowedActions?: string[]): boolean {
  if (!allowedActions) return false;
  return allowedActions.includes(action);
}

async function generateActionConfirmation(queryAnalysis: any, userProfile: any, surrogate: any) {
  const action = queryAnalysis.action;
  const businessName = queryAnalysis.businessNames[0]?.name || "the business";
  
  return {
    message: `🤖 **AI Surrogate Confirmation Required**\n\nI'm about to ${action} for you at **${businessName}**.\n\n**Details:**\n• Action: ${action.charAt(0).toUpperCase() + action.slice(1)}\n• Business: ${businessName}\n• User: ${userProfile.email}\n\n🔐 **Security:** This action requires your explicit confirmation for safety.\n\n**Reply with "YES" to proceed or "NO" to cancel.**`,
    businesses: [],
    actions: [
      {
        type: 'confirm_action',
        label: '✅ Confirm Action',
        data: { originalQuery: queryAnalysis.originalQuery, action, businessName }
      },
      {
        type: 'cancel_action', 
        label: '❌ Cancel',
        data: { action }
      }
    ],
    executionResult: { 
      success: false, 
      reason: "Awaiting user confirmation",
      requiresConfirmation: true 
    }
  };
}

async function executeUserAction(queryAnalysis: any, userProfile: any, surrogate: any) {
  const action = queryAnalysis.action;
  const businessName = queryAnalysis.businessNames[0]?.name || "the business";
  
  console.log(`[AI Surrogate] Executing ${action} for user ${userProfile.id} at ${businessName}`);
  
  try {
    switch (action) {
      case 'book':
        return await executeSurrogateBooking(queryAnalysis, userProfile, surrogate);
      case 'cancel':
        return await executeSurrogateCancellation(queryAnalysis, userProfile, surrogate);
      case 'modify':
        return await executeSurrogateModification(queryAnalysis, userProfile, surrogate);
      case 'pay':
        return await executeSurrogatePayment(queryAnalysis, userProfile, surrogate);
      default:
        return {
          message: `❌ Unknown action: ${action}. I can help with booking, cancelling, modifying, or payment.`,
          executionResult: { success: false, reason: "Unknown action type" }
        };
    }
  } catch (error) {
    console.error(`[AI Surrogate] Action execution failed:`, error);
    return {
      message: `❌ Failed to execute ${action}. Please try manual booking or contact support.`,
      executionResult: { 
        success: false, 
        reason: error.message,
        fallbackToManual: true 
      }
    };
  }
}

async function executeSurrogateBooking(queryAnalysis: any, userProfile: any, surrogate: any) {
  // This would integrate with the actual booking system
  const businessName = queryAnalysis.businessNames[0]?.name || "the business";
  
  // Mock implementation - in production this would:
  // 1. Find available slots
  // 2. Create booking with user's preferences  
  // 3. Send confirmation email
  // 4. Update user's booking history
  
  return {
    message: `🎉 **Booking Successful!** \n\nYour AI assistant has successfully booked a table at **${businessName}**.\n\n**Booking Details:**\n• Date: Tonight\n• Time: 7:00 PM\n• Party Size: 2 people\n• Confirmation: #BK${Date.now()}\n\n📧 Confirmation email sent to ${userProfile.email}\n📱 SMS reminder will be sent 2 hours before`,
    businesses: queryAnalysis.businessNames[0]?.matches || [],
    actions: [
      {
        type: 'view_booking',
        label: '📋 View Booking',
        data: { bookingId: `BK${Date.now()}` }
      },
      {
        type: 'modify_booking',
        label: '✏️ Modify Booking', 
        data: { bookingId: `BK${Date.now()}` }
      }
    ],
    executionResult: { 
      success: true, 
      bookingId: `BK${Date.now()}`,
      confirmationSent: true
    }
  };
}

async function executeSurrogateCancellation(queryAnalysis: any, userProfile: any, surrogate: any) {
  // Mock cancellation logic
  return {
    message: `✅ **Cancellation Successful** \n\nYour AI assistant has cancelled your booking.\n\n**Cancelled Booking:**\n• Business: ${queryAnalysis.businessNames[0]?.name || "Restaurant"}\n• Original Time: Tonight 7:00 PM\n• Cancellation Fee: None (cancelled within policy)\n\n📧 Cancellation confirmation sent to ${userProfile.email}`,
    executionResult: { 
      success: true, 
      action: "cancelled",
      refundAmount: 0
    }
  };
}

async function executeSurrogateModification(queryAnalysis: any, userProfile: any, surrogate: any) {
  // Mock modification logic  
  return {
    message: `✏️ **Booking Modified** \n\nYour AI assistant has updated your booking.\n\n**Modified Details:**\n• Business: ${queryAnalysis.businessNames[0]?.name || "Restaurant"}\n• New Time: Tomorrow 7:30 PM\n• Party Size: Updated as requested\n\n📧 Updated confirmation sent to ${userProfile.email}`,
    executionResult: { 
      success: true, 
      action: "modified",
      newBookingId: `BK${Date.now()}`
    }
  };
}

async function executeSurrogatePayment(queryAnalysis: any, userProfile: any, surrogate: any) {
  // Mock payment logic
  return {
    message: `💳 **Payment Processed** \n\nYour AI assistant has processed the payment.\n\n**Payment Details:**\n• Amount: $45.00\n• Method: Default card ending in 1234\n• Transaction: TX${Date.now()}\n\n📧 Receipt sent to ${userProfile.email}`,
    executionResult: { 
      success: true, 
      action: "payment_processed",
      transactionId: `TX${Date.now()}`,
      amount: 45.00
    }
  };
}

async function generateRegisteredResponse(queryAnalysis: any, businesses: BusinessMetadata[], userProfile: any, query: string) {
  const publicResponse = await generatePublicResponse(queryAnalysis, businesses, query);
  
  // Enhanced with user context and action capabilities
  return {
    ...publicResponse,
    actions: businesses.map(b => ({
      type: 'book_table',
      businessId: b.id,
      businessName: b.name,
      enabled: true
    })),
    personalizedContext: {
      hasBookingHistory: userProfile.bookingHistory.length > 0,
      favoriteBusinesses: userProfile.favoriteBusinesses
    }
  };
}

// USER SETTINGS: Manage AI surrogate permissions
router.get("/user/ai-surrogate-settings", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const userId = req.user!.id;
    const userProfile = await getUserProfile(userId);
    
    // Get current surrogate settings (in production this would be stored in database)
    const currentSettings = {
      surrogateEnabled: false,
      allowedActions: [] as string[],
      requireConfirmation: true,
      maxBookingValue: 100.00,
      autoCancel: false,
      preferredPaymentMethod: null,
      bookingPreferences: {
        defaultPartySize: 2,
        preferredTimeSlots: ['evening'],
        dietaryRestrictions: [],
        specialRequests: ''
      }
    };
    
    res.json({
      success: true,
      userId: userId,
      settings: currentSettings,
      availableActions: ['book', 'cancel', 'modify', 'pay'],
      securityLevel: 'standard', // Could be 'basic', 'standard', 'enhanced'
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[AI Settings] Error:', error);
    res.status(500).json({ error: "Failed to retrieve AI settings" });
  }
});

router.post("/user/ai-surrogate-settings", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const updateSchema = z.object({
      surrogateEnabled: z.boolean(),
      allowedActions: z.array(z.enum(['book', 'cancel', 'modify', 'pay'])),
      requireConfirmation: z.boolean(),
      maxBookingValue: z.number().min(0).max(500),
      autoCancel: z.boolean().optional(),
      bookingPreferences: z.object({
        defaultPartySize: z.number().min(1).max(20).optional(),
        preferredTimeSlots: z.array(z.string()).optional(),
        dietaryRestrictions: z.array(z.string()).optional(),
        specialRequests: z.string().max(500).optional()
      }).optional()
    });
    
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid settings format",
        details: validation.error.issues
      });
    }
    
    const userId = req.user!.id;
    const settings = validation.data;
    
    // In production, save to database:
    // await db.update(userAISettings).set(settings).where(eq(userAISettings.userId, userId));
    
    console.log(`[AI Settings] User ${userId} updated surrogate settings:`, settings);
    
    res.json({
      success: true,
      message: "AI surrogate settings updated successfully",
      settings: settings,
      effectiveDate: new Date().toISOString(),
      securityNotice: settings.surrogateEnabled ? 
        "AI can now perform actions on your behalf based on your preferences" :
        "AI surrogate actions are disabled - AI will only provide information"
    });
    
  } catch (error) {
    console.error('[AI Settings] Update error:', error);
    res.status(500).json({ error: "Failed to update AI settings" });
  }
});

// CONFIRMATION ENDPOINT: Handle user confirmations for AI actions
router.post("/ai-abrakadabra/registered/confirm-action", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const confirmSchema = z.object({
      confirmed: z.boolean(),
      originalQuery: z.string(),
      action: z.string(),
      businessName: z.string()
    });
    
    const validation = confirmSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid confirmation format",
        details: validation.error.issues
      });
    }
    
    const { confirmed, originalQuery, action, businessName } = validation.data;
    const userId = req.user!.id;
    
    if (!confirmed) {
      return res.json({
        success: true,
        message: `❌ **Action Cancelled**\n\nThe ${action} action at **${businessName}** has been cancelled by your request.\n\nYou can still book manually or ask me for other assistance.`,
        actionCancelled: true
      });
    }
    
    // Execute the confirmed action
    const userProfile = await getUserProfile(userId);
    const surrogate = { enabled: true, requireConfirmation: false, allowedActions: [action] };
    
    // Re-analyze the original query to get business context
    const queryAnalysis = await analyzeRegisteredQuery(originalQuery, 'Melbourne', userProfile);
    queryAnalysis.action = action; // Ensure the action is set
    
    const result = await executeUserAction(queryAnalysis, userProfile, surrogate);
    
    res.json({
      success: true,
      userType: 'registered',
      actionConfirmed: true,
      ...result
    });
    
  } catch (error) {
    console.error('[AI Confirmation] Error:', error);
    res.status(500).json({ error: "Failed to process confirmation" });
  }
});

export default router;