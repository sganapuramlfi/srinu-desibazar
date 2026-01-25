import { Router } from "express";

const router = Router();

/**
 * DEBUG ABRAKADABRA - Direct test of the service without middleware
 */

router.post("/debug-abrakadabra", async (req, res) => {
  try {
    console.log('🐛 [Debug] Starting Abrakadabra debug test...');
    
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }
    
    console.log(`🐛 [Debug] Query: "${query}"`);
    
    // Import the service directly
    const { abrakadabra } = await import("../services/abrakadabraService.js");
    console.log('🐛 [Debug] Service imported successfully');
    
    // Test getBusinesses method first
    const businesses = await abrakadabra.getBusinesses();
    console.log('🐛 [Debug] getBusinesses() returned:', businesses.length, 'businesses');
    console.log('🐛 [Debug] Sample business:', businesses[0]);
    
    // Test the simple vector search method directly
    const vectorResult = await abrakadabra.simpleVectorSearch(query);
    console.log('🐛 [Debug] Vector search result:', vectorResult);
    
    res.json({
      success: true,
      query: query,
      businessesFromGetBusinesses: businesses,
      vectorResult: vectorResult,
      debug: "Direct service test - shows getBusinesses vs vector search"
    });
    
  } catch (error) {
    console.error('🐛 [Debug] ERROR:', error);
    console.error('🐛 [Debug] Stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack.split('\n').slice(0, 10),
      debug: "Error caught in debug endpoint"
    });
  }
});

export default router;