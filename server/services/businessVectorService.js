/**
 * Business Vector Search Service
 * 
 * Lightweight vector database for fast business name/location/type matching
 * Updates in parallel when new businesses are added
 */

console.log('🔍 [Vector Search] Service loading...');

class BusinessVectorService {
  constructor() {
    this.vectorStore = new Map(); // businessId -> vector data
    this.searchIndex = new Map(); // keyword -> [businessIds]
    this.businessCache = new Map(); // businessId -> business data
    this.isInitialized = false;
    this.lastUpdate = null;
    
    // Initialize on startup
    this.initialize();
  }

  /**
   * Initialize vector store with existing businesses
   */
  async initialize() {
    console.log('🔍 [Vector Search] Initializing vector store...');
    
    try {
      // Import database dynamically
      const { db } = await import('../../db/index.ts');
      const { businessTenants } = await import('../../db/index.ts');
      const { eq } = await import('drizzle-orm');
      
      // Fetch all active businesses
      const businesses = await db
        .select({
          id: businessTenants.id,
          name: businessTenants.name,
          businessName: businessTenants.businessName,
          slug: businessTenants.slug,
          industryType: businessTenants.industryType,
          description: businessTenants.description,
          status: businessTenants.status,
          city: businessTenants.city,
          state: businessTenants.state
        })
        .from(businessTenants)
        .where(eq(businessTenants.status, 'active'));
      
      console.log(`🔍 [Vector Search] Processing ${businesses.length} businesses for vector search`);
      
      // Build vector store for each business
      businesses.forEach(business => {
        this.addBusinessToVector(business);
      });
      
      this.isInitialized = true;
      this.lastUpdate = new Date();
      
      console.log(`🔍 [Vector Search] Initialized with ${this.vectorStore.size} businesses, ${this.searchIndex.size} search terms`);
      
    } catch (error) {
      console.error('🔍 [Vector Search] Initialization error:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Add/Update business in vector store
   */
  addBusinessToVector(business) {
    const businessId = business.id;
    const businessName = business.name || business.businessName || '';
    const description = business.description || '';
    const location = `${business.city || ''} ${business.state || ''}`.trim();
    const industryType = business.industryType || '';
    
    // Create searchable text components
    const searchableFields = {
      name: businessName.toLowerCase(),
      description: description.toLowerCase(),
      location: location.toLowerCase(),
      industryType: industryType.toLowerCase(),
      slug: (business.slug || '').toLowerCase()
    };
    
    // Generate keywords for indexing
    const keywords = this.extractKeywords(searchableFields);
    
    // Store vector data
    const vectorData = {
      id: businessId,
      name: businessName,
      searchableFields,
      keywords,
      originalBusiness: business,
      lastUpdated: new Date()
    };
    
    this.vectorStore.set(businessId, vectorData);
    this.businessCache.set(businessId, business);
    
    // Update search index
    this.updateSearchIndex(businessId, keywords);
    
    console.log(`🔍 [Vector Search] Added/Updated business: ${businessName} (${keywords.length} keywords)`);
  }

  /**
   * Remove business from vector store
   */
  removeBusinessFromVector(businessId) {
    const vectorData = this.vectorStore.get(businessId);
    if (vectorData) {
      // Remove from search index
      vectorData.keywords.forEach(keyword => {
        const businessIds = this.searchIndex.get(keyword) || [];
        const filteredIds = businessIds.filter(id => id !== businessId);
        if (filteredIds.length > 0) {
          this.searchIndex.set(keyword, filteredIds);
        } else {
          this.searchIndex.delete(keyword);
        }
      });
      
      // Remove from stores
      this.vectorStore.delete(businessId);
      this.businessCache.delete(businessId);
      
      console.log(`🔍 [Vector Search] Removed business: ${businessId}`);
    }
  }

  /**
   * Extract searchable keywords from business data
   */
  extractKeywords(searchableFields) {
    const keywords = new Set();
    
    // Process each field
    Object.values(searchableFields).forEach(field => {
      if (!field) return;
      
      // Split into words and filter
      const words = field
        .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
        .split(/\s+/)
        .filter(word => word.length >= 2)
        .filter(word => !this.isStopWord(word));
      
      words.forEach(word => keywords.add(word.toLowerCase()));
      
      // Add bi-grams for phrases like "spice pavilion"
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`.toLowerCase();
        keywords.add(bigram);
      }
    });
    
    return Array.from(keywords);
  }

  /**
   * Update search index with keywords for a business
   */
  updateSearchIndex(businessId, keywords) {
    keywords.forEach(keyword => {
      if (!this.searchIndex.has(keyword)) {
        this.searchIndex.set(keyword, []);
      }
      
      const businessIds = this.searchIndex.get(keyword);
      if (!businessIds.includes(businessId)) {
        businessIds.push(businessId);
      }
    });
  }

  /**
   * Vector similarity search for businesses
   */
  async searchBusinesses(query, options = {}) {
    if (!this.isInitialized) {
      console.warn('🔍 [Vector Search] Not initialized, falling back to database search');
      return this.fallbackSearch(query, options);
    }
    
    console.log(`🔍 [Vector Search] Searching for: "${query}"`);
    
    // Normalize query
    const normalizedQuery = query.toLowerCase().trim();
    const queryKeywords = this.extractKeywords({ query: normalizedQuery });
    
    console.log(`🔍 [Vector Search] Query keywords:`, queryKeywords);
    
    const businessMatches = new Map(); // businessId -> score
    
    // Score businesses based on keyword matches
    queryKeywords.forEach(keyword => {
      // Exact keyword matches
      if (this.searchIndex.has(keyword)) {
        const businessIds = this.searchIndex.get(keyword);
        businessIds.forEach(businessId => {
          const currentScore = businessMatches.get(businessId) || 0;
          businessMatches.set(businessId, currentScore + 10); // High score for exact match
        });
      }
      
      // Partial keyword matches
      this.searchIndex.forEach((businessIds, indexKeyword) => {
        if (indexKeyword.includes(keyword) || keyword.includes(indexKeyword)) {
          businessIds.forEach(businessId => {
            const currentScore = businessMatches.get(businessId) || 0;
            businessMatches.set(businessId, currentScore + 5); // Medium score for partial match
          });
        }
      });
    });
    
    // Special handling for business name similarity
    this.vectorStore.forEach((vectorData, businessId) => {
      const businessName = vectorData.searchableFields.name;
      
      // Check for direct name similarity
      if (businessName.includes(normalizedQuery) || normalizedQuery.includes(businessName)) {
        const currentScore = businessMatches.get(businessId) || 0;
        businessMatches.set(businessId, currentScore + 20); // Very high score for name match
      }
      
      // Check for word-level matches in name
      const nameWords = businessName.split(' ').filter(word => word.length > 2);
      const queryWords = normalizedQuery.split(' ').filter(word => word.length > 2);
      
      const wordMatches = nameWords.filter(nameWord => 
        queryWords.some(queryWord => 
          nameWord.includes(queryWord) || queryWord.includes(nameWord)
        )
      );
      
      if (wordMatches.length > 0) {
        const currentScore = businessMatches.get(businessId) || 0;
        const wordScore = (wordMatches.length / Math.max(nameWords.length, queryWords.length)) * 15;
        businessMatches.set(businessId, currentScore + wordScore);
      }
    });
    
    // Sort by score and convert to business objects
    const sortedMatches = Array.from(businessMatches.entries())
      .sort(([,scoreA], [,scoreB]) => scoreB - scoreA)
      .slice(0, options.limit || 10);
    
    console.log(`🔍 [Vector Search] Found ${sortedMatches.length} matches:`, 
      sortedMatches.map(([id, score]) => `${this.vectorStore.get(id)?.name} (${score})`));
    
    const results = sortedMatches.map(([businessId, score]) => {
      const vectorData = this.vectorStore.get(businessId);
      const business = this.businessCache.get(businessId);
      
      return {
        ...business,
        _vectorScore: score,
        _searchMethod: 'vector_similarity'
      };
    });
    
    return {
      businesses: results,
      searchMethod: 'vector_similarity',
      totalMatches: businessMatches.size,
      queryProcessed: normalizedQuery,
      keywordsUsed: queryKeywords
    };
  }

  /**
   * Fallback to simple database search when vector search is not available
   */
  async fallbackSearch(query, options = {}) {
    console.log('🔍 [Vector Search] Using fallback database search');
    
    try {
      const { db } = await import('../../db/index.ts');
      const { businessTenants } = await import('../../db/index.ts');
      const { ilike, or, eq } = await import('drizzle-orm');
      
      const businesses = await db
        .select()
        .from(businessTenants)
        .where(
          or(
            ilike(businessTenants.name, `%${query}%`),
            ilike(businessTenants.businessName, `%${query}%`),
            ilike(businessTenants.description, `%${query}%`),
            eq(businessTenants.status, 'active')
          )
        )
        .limit(options.limit || 10);
      
      return {
        businesses: businesses.map(b => ({ ...b, _searchMethod: 'database_fallback' })),
        searchMethod: 'database_fallback',
        totalMatches: businesses.length,
        queryProcessed: query
      };
      
    } catch (error) {
      console.error('🔍 [Vector Search] Fallback search error:', error);
      return {
        businesses: [],
        searchMethod: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get business suggestions based on partial input
   */
  async getSuggestions(partialQuery, limit = 5) {
    if (!this.isInitialized) return [];
    
    const suggestions = new Set();
    const normalizedQuery = partialQuery.toLowerCase();
    
    // Find matching keywords
    this.searchIndex.forEach((businessIds, keyword) => {
      if (keyword.startsWith(normalizedQuery) || keyword.includes(normalizedQuery)) {
        businessIds.forEach(businessId => {
          const vectorData = this.vectorStore.get(businessId);
          if (vectorData) {
            suggestions.add(vectorData.name);
          }
        });
      }
    });
    
    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Auto-update vector store when businesses change
   */
  async updateBusinessInVector(businessData) {
    if (businessData.status === 'active') {
      this.addBusinessToVector(businessData);
    } else {
      this.removeBusinessFromVector(businessData.id);
    }
    
    this.lastUpdate = new Date();
    console.log(`🔍 [Vector Search] Updated business: ${businessData.name || businessData.businessName}`);
  }

  /**
   * Refresh vector store from database
   */
  async refreshVectorStore() {
    console.log('🔍 [Vector Search] Refreshing vector store...');
    
    // Clear current data
    this.vectorStore.clear();
    this.searchIndex.clear();
    this.businessCache.clear();
    
    // Reinitialize
    await this.initialize();
  }

  /**
   * Get vector store statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      totalBusinesses: this.vectorStore.size,
      totalKeywords: this.searchIndex.size,
      lastUpdate: this.lastUpdate,
      memoryUsage: {
        vectorStore: this.vectorStore.size,
        searchIndex: this.searchIndex.size,
        businessCache: this.businessCache.size
      }
    };
  }

  /**
   * Check if word is a stop word (words to ignore in search)
   */
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'business', 'service', 'services', 'company', 'melbourne', 'australia'
    ]);
    return stopWords.has(word.toLowerCase());
  }
}

// Export singleton instance
export const businessVectorService = new BusinessVectorService();
console.log('🔍 [Vector Search] Service ready!');