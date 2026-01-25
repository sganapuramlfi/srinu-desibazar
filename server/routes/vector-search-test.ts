import { Router } from "express";
import { db } from "../../db/index.js";
import { businessTenants } from "../../db/index.js";
import { eq, ilike, or } from "drizzle-orm";

const router = Router();

/**
 * VECTOR SEARCH TEST API
 * 
 * Simple in-memory vector search for business matching
 * Tests the concept before full vector service integration
 */

// In-memory search index
const businessSearchIndex = new Map();
let isIndexInitialized = false;

async function initializeSearchIndex() {
  if (isIndexInitialized) return;
  
  console.log('🔍 [Vector Test] Initializing search index...');
  
  try {
    const businesses = await db
      .select({
        id: businessTenants.id,
        name: businessTenants.name,
        businessName: businessTenants.businessName || businessTenants.name,
        slug: businessTenants.slug,
        industryType: businessTenants.industryType,
        description: businessTenants.description,
        status: businessTenants.status
      })
      .from(businessTenants);
    
    console.log(`🔍 [Vector Test] Raw query returned ${businesses.length} businesses`);
    console.log(`🔍 [Vector Test] Sample business:`, businesses[0]);
    
    // Build search index
    businesses.forEach(business => {
      const searchTerms = [];
      const businessName = business.name || business.businessName || '';
      const description = business.description || '';
      
      // Add name words
      businessName.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 2) searchTerms.push(word);
      });
      
      // Add description words
      description.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 2) searchTerms.push(word);
      });
      
      // Add full name
      if (businessName) {
        searchTerms.push(businessName.toLowerCase());
      }
      
      // Store in index
      searchTerms.forEach(term => {
        if (!businessSearchIndex.has(term)) {
          businessSearchIndex.set(term, []);
        }
        businessSearchIndex.get(term).push({
          ...business,
          matchTerm: term,
          fullName: businessName
        });
      });
    });
    
    isIndexInitialized = true;
    console.log(`🔍 [Vector Test] Indexed ${businesses.length} businesses with ${businessSearchIndex.size} search terms`);
    
  } catch (error) {
    console.error('🔍 [Vector Test] Index initialization error:', error);
  }
}

// Vector search endpoint
router.post("/vector-search-test", async (req, res) => {
  try {
    await initializeSearchIndex();
    
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }
    
    console.log(`🔍 [Vector Test] Searching for: "${query}"`);
    
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    const businessMatches = new Map(); // businessId -> score
    
    // Search for exact matches first
    if (businessSearchIndex.has(queryLower)) {
      businessSearchIndex.get(queryLower).forEach(business => {
        const score = businessMatches.get(business.id) || 0;
        businessMatches.set(business.id, score + 20); // High score for exact match
      });
    }
    
    // Search for word matches
    queryWords.forEach(word => {
      if (businessSearchIndex.has(word)) {
        businessSearchIndex.get(word).forEach(business => {
          const score = businessMatches.get(business.id) || 0;
          businessMatches.set(business.id, score + 10); // Medium score for word match
        });
      }
    });
    
    // Search for partial matches
    businessSearchIndex.forEach((businesses, term) => {
      if (term.includes(queryLower) || queryLower.includes(term)) {
        businesses.forEach(business => {
          const score = businessMatches.get(business.id) || 0;
          businessMatches.set(business.id, score + 5); // Lower score for partial match
        });
      }
    });
    
    // Sort by score and get results
    const sortedResults = Array.from(businessMatches.entries())
      .sort(([,scoreA], [,scoreB]) => scoreB - scoreA)
      .slice(0, 10);
    
    const results = [];
    for (const [businessId, score] of sortedResults) {
      // Find the business data
      for (const [term, businesses] of businessSearchIndex.entries()) {
        const business = businesses.find(b => b.id === businessId);
        if (business) {
          results.push({
            ...business,
            vectorScore: score,
            matchedOn: term
          });
          break;
        }
      }
    }
    
    console.log(`🔍 [Vector Test] Found ${results.length} matches for "${query}"`);
    
    res.json({
      success: true,
      query: query,
      totalMatches: businessMatches.size,
      results: results,
      searchMethod: 'vector_test',
      indexStats: {
        totalBusinesses: isIndexInitialized ? businessSearchIndex.size : 0,
        searchTerms: businessSearchIndex.size
      }
    });
    
  } catch (error) {
    console.error('🔍 [Vector Test] Search error:', error);
    res.status(500).json({ 
      error: "Search failed", 
      details: error.message 
    });
  }
});

// Index stats endpoint
router.get("/vector-search-stats", async (req, res) => {
  await initializeSearchIndex();
  
  res.json({
    isInitialized: isIndexInitialized,
    totalSearchTerms: businessSearchIndex.size,
    sampleTerms: Array.from(businessSearchIndex.keys()).slice(0, 20)
  });
});

export default router;