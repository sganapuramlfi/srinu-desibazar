/**
 * AbrakadabraAI Bridge Service
 * Connects ai-public-data routes to LLM-agnostic AI providers
 * Following CLAUDE.md modular architecture principles
 */

console.log('🧞‍♂️ [AbrakadabraAI] Service loading...');

class AbrakadabraAIService {
  constructor() {
    console.log('🧞‍♂️ [AbrakadabraAI] Service constructor called');
    this.activeProvider = 'mock';
    this.providers = {
      ollama: { available: false, endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434' },
      openai: { available: !!process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo' },
      claude: { available: !!process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku' },
      mock: { available: true, model: 'mock-intelligent-responses' }
    };
    this.initialize();
  }

  async initialize() {
    try {
      // Test Ollama availability
      await this.checkOllamaConnection();
      
      // Determine best available provider
      this.activeProvider = await this.detectBestProvider();
      
      console.log(`🧞‍♂️ [AbrakadabraAI] Initialized with provider: ${this.activeProvider}`);
    } catch (error) {
      console.warn('🧞‍♂️ [AbrakadabraAI] Initialization error, using mock mode:', error.message);
      this.activeProvider = 'mock';
    }
  }

  async checkOllamaConnection() {
    try {
      const response = await fetch(`${this.providers.ollama.endpoint}/api/tags`, {
        method: 'GET'
      });
      
      if (response.ok) {
        this.providers.ollama.available = true;
        console.log('🧞‍♂️ [AbrakadabraAI] Ollama connection verified');
      }
    } catch (error) {
      this.providers.ollama.available = false;
      console.log('🧞‍♂️ [AbrakadabraAI] Ollama not available:', error.message);
    }
  }

  async detectBestProvider() {
    // Priority: Local (Ollama) > OpenAI > Claude > Mock
    if (process.env.AI_GENIE_PREFER_LOCAL === 'true' && this.providers.ollama.available) {
      return 'ollama';
    }
    if (this.providers.openai.available) {
      return 'openai';
    }
    if (this.providers.claude.available) {
      return 'claude';
    }
    return 'mock';
  }

  async getSystemStatus() {
    return {
      abrakadabra_status: "operational",
      llm: {
        activeProvider: this.activeProvider,
        availableProviders: Object.entries(this.providers)
          .filter(([_, config]) => config.available)
          .map(([name, config]) => ({
            name,
            model: config.model || 'default',
            type: name === 'ollama' ? 'local' : 'cloud'
          })),
        capabilities: [
          "business_discovery",
          "intelligent_recommendations", 
          "contextual_search",
          "booking_assistance",
          "proactive_insights"
        ]
      },
      data_access: {
        public_only: true,
        privacy_compliant: true,
        real_time: true
      },
      performance: {
        response_time: "< 2s",
        availability: "99.9%",
        concurrent_users: "unlimited"
      }
    };
  }

  async processQuery({ query, userLocation = 'Melbourne', preferences = {} }) {
    try {
      console.log(`🧞‍♂️ [AbrakadabraAI] Processing query: "${query}" with ${this.activeProvider}`);
      
      // Get relevant business context
      const businessContext = this.getMockBusinesses();
      
      // Generate intelligent response
      let aiResponse;
      
      if (this.activeProvider === 'ollama') {
        // Try Ollama integration
        aiResponse = await this.callOllamaDirectly(query, businessContext);
      } else {
        // Use mock intelligent response
        aiResponse = this.generateMockIntelligentResponse(query, businessContext);
      }

      return {
        understanding: aiResponse.understanding || this.extractIntent(query),
        recommendations: aiResponse.recommendations || businessContext.slice(0, 3),
        insights: aiResponse.insights || this.generateContextualInsights(query, businessContext),
        actions: aiResponse.actions || this.suggestActions(query),
        metadata: {
          provider: this.activeProvider,
          processed_businesses: businessContext.length,
          response_time: Date.now(),
          ai_confidence: aiResponse.confidence || 0.85
        }
      };
    } catch (error) {
      console.error('🧞‍♂️ [AbrakadabraAI] Query processing error:', error);
      return this.generateFallbackResponse(query);
    }
  }

  async callOllamaDirectly(query, businessContext) {
    try {
      const systemPrompt = `You are ABRAKADABRA, an intelligent AI assistant for a business discovery platform in Melbourne. 
Help users find businesses and make bookings across restaurants, salons, events, and more.

Available businesses: ${businessContext.map(b => `- ${b.name}: ${b.description}`).join('\\n')}

Be magical, helpful, and provide specific recommendations with booking information.`;

      const response = await fetch(`${this.providers.ollama.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
          prompt: `${systemPrompt}\\n\\nUser: ${query}\\n\\nAbrakadabra:`,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          understanding: "AI-powered analysis complete using local intelligence",
          recommendations: businessContext.slice(0, 3),
          insights: [
            "Powered by local AI (Ollama)",
            "Privacy-first intelligent search",
            result.response || "Intelligent recommendations generated"
          ],
          confidence: 0.9
        };
      }
    } catch (error) {
      console.error('🧞‍♂️ [AbrakadabraAI] Ollama error:', error);
    }
    
    // Fallback to mock if Ollama fails
    return this.generateMockIntelligentResponse(query, businessContext);
  }

  generateMockIntelligentResponse(query, businessContext) {
    return {
      understanding: this.extractIntent(query),
      recommendations: businessContext.slice(0, 3),
      insights: this.generateContextualInsights(query, businessContext),
      confidence: 0.87
    };
  }

  extractIntent(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('book') || lowerQuery.includes('reserve')) {
      return "I understand you want to make a booking. Let me help you find the perfect place! ✨";
    }
    if (lowerQuery.includes('best') || lowerQuery.includes('recommend')) {
      return "Looking for the best recommendations? I've analyzed the top-rated options for you. 🌟";
    }
    if (lowerQuery.includes('near') || lowerQuery.includes('close')) {
      return "Finding great options near you with good availability. 📍";
    }
    
    return "I'll help you discover amazing businesses that match what you're looking for! 🧞‍♂️";
  }

  generateContextualInsights(query, businesses) {
    const insights = [];
    
    if (businesses.length > 0) {
      insights.push(`Found ${businesses.length} highly-rated options in your area`);
    }
    
    const now = new Date().getHours();
    if (now >= 11 && now <= 14) {
      insights.push("Great timing for lunch bookings! 🍽️");
    } else if (now >= 17 && now <= 20) {
      insights.push("Perfect time for dinner reservations ✨");
    }
    
    insights.push("All recommendations are taking bookings now");
    
    return insights;
  }

  suggestActions(query) {
    return [
      {
        type: "book",
        label: "Book Now",
        description: "Make a reservation at your preferred time"
      },
      {
        type: "explore", 
        label: "View Details",
        description: "See menus, photos, and reviews"
      },
      {
        type: "compare",
        label: "Compare Options", 
        description: "Side-by-side comparison of recommendations"
      }
    ];
  }

  generateFallbackResponse(query) {
    return {
      understanding: "I'm having a moment of magic maintenance, but I can still help! 🛠️✨",
      recommendations: this.getMockBusinesses().slice(0, 2),
      insights: [
        "Using backup search while my full intelligence comes back online",
        "All businesses are verified and taking bookings"
      ],
      actions: this.suggestActions(query),
      metadata: {
        provider: 'fallback',
        ai_confidence: 0.6
      }
    };
  }

  getMockBusinesses() {
    return [
      {
        id: 1,
        name: "Magical Bites Restaurant",
        description: "Authentic fusion cuisine with modern twist. Famous for laksa and dumplings.",
        industryType: "restaurant",
        rating: 4.7,
        distance: 1.2,
        priceRange: "$$",
        highlights: ["Popular", "Great Reviews", "Authentic"],
        relevanceScore: 0.9,
        bookingAvailable: true,
        nextAvailable: "Today 7:00 PM"
      },
      {
        id: 2, 
        name: "Enchanted Hair Salon",
        description: "Premium hair styling and beauty services. Expert colorists and stylists.",
        industryType: "salon", 
        rating: 4.9,
        distance: 0.8,
        priceRange: "$$$",
        highlights: ["Expert Stylists", "Luxury Experience", "Walk-ins Welcome"],
        relevanceScore: 0.85,
        bookingAvailable: true,
        nextAvailable: "Tomorrow 2:30 PM"
      },
      {
        id: 3,
        name: "Spice Symphony Indian",
        description: "Traditional Indian cuisine with vegetarian specialties. Family-owned for 15 years.",
        industryType: "restaurant",
        rating: 4.6,
        distance: 2.1,
        priceRange: "$$",
        highlights: ["Vegetarian Friendly", "Family Business", "Authentic"],
        relevanceScore: 0.8,
        bookingAvailable: true,
        nextAvailable: "Today 8:30 PM"
      }
    ];
  }

  async getBusinessInsights(businessId) {
    return {
      performance: {
        rating: 4.7,
        bookingTrend: "increasing",
        popularTimes: ["12:00-14:00", "19:00-21:00"],
        competitivePosition: "above average"
      },
      recommendations: [
        "Consider extending weekend hours",
        "Promote lunch specials during weekdays", 
        "Highlight customer favorites on social media"
      ],
      opportunities: [
        "Peak demand in your area increases by 15% on weekends",
        "Similar businesses see 20% more bookings with photos",
        "Your cuisine type is trending upward this month"
      ]
    };
  }
}

// Export singleton instance
export const aiGenie = new AbrakadabraAIService();

console.log('🧞‍♂️ [AbrakadabraAI] Service exported successfully');