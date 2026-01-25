import { Router } from "express";

const router = Router();

/**
 * FIXED AI ABRAKADABRA ENDPOINTS
 * Uses the surgically fixed AbrakadabraService
 */

// PUBLIC TIER: Search-intensive, read-only AI assistant
router.post("/ai-abrakadabra-fixed/public/query", async (req, res) => {
  try {
    const { query, location = 'Melbourne', context = 'search' } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: "Query is required",
        suggestion: "Please ask a question like 'italian restaurants' or 'spice pavilion'"
      });
    }
    
    console.log(`[Fixed Public Abrakadabra] Query: "${query}"`);
    
    // Import the fixed service
    const { abrakadabra } = await import("../services/abrakadabraService.js");
    
    // Process with public user context (no authentication)
    const result = await abrakadabra.processQuery({
      query: query,
      userLocation: location,
      preferences: {},
      userContext: {} // Empty = public user
    });
    
    // Format response for frontend compatibility
    res.json({
      success: true,
      userType: 'public',
      query: query,
      understanding: result.understanding,
      recommendations: result.recommendations,
      insights: result.insights,
      actions: result.actions,
      metadata: {
        ...result.metadata,
        endpoint: 'fixed_public_abrakadabra'
      }
    });
    
  } catch (error) {
    console.error('[Fixed Public Abrakadabra] Error:', error);
    res.status(500).json({ 
      error: "Search service error",
      message: error.message,
      fallback: "Please try searching for specific businesses or cuisines"
    });
  }
});

// REGISTERED TIER: Action-enabled AI assistant
router.post("/ai-abrakadabra-fixed/registered/query", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        error: "Authentication required",
        message: "Please sign in to access booking and management features"
      });
    }
    
    const { query, location = 'Melbourne', context = 'search', surrogate } = req.body;
    
    console.log(`[Fixed Registered Abrakadabra] User ${req.user.id} query: "${query}"`);
    
    // Import the fixed service
    const { abrakadabra } = await import("../services/abrakadabraService.js");
    
    // Process with authenticated user context
    const result = await abrakadabra.processQuery({
      query: query,
      userLocation: location,
      preferences: {},
      userContext: {
        userId: req.user.id,
        isAuthenticated: true,
        role: req.user.role,
        surrogate: surrogate || { enabled: false }
      }
    });
    
    // Add action capabilities for registered users
    const enhancedActions = result.actions || [];
    if (surrogate?.enabled && surrogate?.allowedActions?.includes('book')) {
      enhancedActions.push({
        type: "book_immediate",
        label: "Book Instantly",
        description: "AI will book for you",
        requiresConfirmation: surrogate.requireConfirmation
      });
    }
    
    res.json({
      success: true,
      userType: 'registered',
      userId: req.user.id,
      query: query,
      understanding: result.understanding,
      recommendations: result.recommendations,
      insights: result.insights,
      actions: enhancedActions,
      surrogateEnabled: surrogate?.enabled || false,
      metadata: {
        ...result.metadata,
        endpoint: 'fixed_registered_abrakadabra',
        userAuthenticated: true
      }
    });
    
  } catch (error) {
    console.error('[Fixed Registered Abrakadabra] Error:', error);
    res.status(500).json({ 
      error: "Search service error",
      message: error.message,
      fallback: "Please try searching for specific businesses"
    });
  }
});

// Status check endpoint
router.get("/ai-abrakadabra-fixed/status", async (req, res) => {
  try {
    const { abrakadabra } = await import("../services/abrakadabraService.js");
    const status = await abrakadabra.getSystemStatus();
    
    res.json({
      success: true,
      service: "AbrakadabraAI Fixed",
      status: status,
      endpoints: {
        public: "/api/ai-abrakadabra-fixed/public/query",
        registered: "/api/ai-abrakadabra-fixed/registered/query"
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Service status check failed",
      message: error.message
    });
  }
});

export default router;