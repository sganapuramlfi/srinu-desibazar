import { Router } from "express";

const router = Router();

/**
 * SURGICAL FIX TEST ENDPOINT
 * Direct test of the surgical fix in web server context
 */
router.post("/test-surgical-fix", async (req, res) => {
  try {
    console.log('🧞‍♂️ [Surgical Fix Test] Starting test...');
    
    const { query = "spice pavilion" } = req.body;
    console.log(`🧞‍♂️ [Surgical Fix Test] Testing query: "${query}"`);
    
    // Import the service directly (same as debug endpoint)
    const { abrakadabra } = await import("../services/abrakadabraService.js");
    console.log('🧞‍♂️ [Surgical Fix Test] Service imported successfully');
    
    // Test with public user context (no authentication)
    const userContext = {}; // Empty = public user
    
    // Process the query using the surgical fix
    const result = await abrakadabra.processQuery({
      query: query,
      userLocation: 'Melbourne',
      preferences: {},
      userContext: userContext
    });
    
    console.log('🧞‍♂️ [Surgical Fix Test] Query processed successfully');
    
    // Check if we found Spice Pavilion
    const spicePavilion = result.recommendations?.find(b => 
      b.name.toLowerCase().includes('spice pavilion')
    );
    
    const testResults = {
      testQuery: query,
      testPassed: !!spicePavilion,
      fastPathUsed: result.metadata?.fast_path || false,
      securityBypassed: result.metadata?.security_bypassed || false,
      searchMethod: result.metadata?.match_info?.searchMethod || 'unknown',
      totalMatches: result.metadata?.match_info?.totalMatches || 0,
      spicePavilionFound: !!spicePavilion,
      spicePavilionScore: spicePavilion?._vectorScore || null,
      recommendationsCount: result.recommendations?.length || 0
    };
    
    res.json({
      success: true,
      surgicalFixStatus: testResults.testPassed ? "SUCCESS" : "FAILED",
      testResults: testResults,
      fullResponse: result,
      debug: "Surgical fix test - checks if Spice Pavilion is found with fast path"
    });
    
  } catch (error) {
    console.error('🧞‍♂️ [Surgical Fix Test] ERROR:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 10),
      debug: "Error in surgical fix test"
    });
  }
});

export default router;