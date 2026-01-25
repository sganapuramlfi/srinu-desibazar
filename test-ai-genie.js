/**
 * AI Genie Intelligence Test - Founder Demo
 * 
 * Demonstrates the innovation beyond chatbots:
 * - LLM-agnostic architecture  
 * - Contextual intelligence
 * - Business ecosystem understanding
 * - Proactive recommendations
 */

// Mock LLM Adapter for demo
const mockLLMAdapter = {
  async getBestProvider() {
    return { name: "MockProvider (Demo Mode)" };
  },
  
  async generateResponse(prompt) {
    // Simulate intelligent response based on prompt content
    if (prompt.includes('Indian restaurants')) {
      return "I found several excellent Indian restaurants in Melbourne! Based on the current dinner time and your location preference, I'm prioritizing restaurants with good availability and authentic cuisine.";
    }
    if (prompt.includes('Thai food')) {
      return "Great choice for Thai cuisine! I'm considering the current time, weather conditions, and trending restaurants to give you the best options.";
    }
    return "Based on current market conditions and your preferences, here are my intelligent recommendations.";
  },
  
  async extractJSON(prompt) {
    if (prompt.includes('Indian')) {
      return {
        cuisine_type: "indian",
        location: "melbourne_cbd",
        urgency: "flexible",
        occasion: "casual",
        contextual_factors: ["dinner_time", "weekend", "good_weather"]
      };
    }
    return {
      cuisine_type: null,
      location: "melbourne",
      urgency: "flexible",
      occasion: "casual"
    };
  },
  
  getStatus() {
    return {
      activeProvider: "MockProvider",
      availableProviders: ["MockProvider", "FallbackMode"],
      fallbackEnabled: true
    };
  }
};

// Mock Contextual Intelligence
const mockContextualIntelligence = {
  async processIntelligentQuery(query, userLocation) {
    const recommendations = this.generateMockRecommendations(query);
    const proactiveInsights = this.generateProactiveInsights();
    const businessIntelligence = this.generateBusinessIntelligence();
    
    return {
      understanding: await mockLLMAdapter.generateResponse(`User asked: ${query}`),
      proactiveInsights,
      recommendations,
      businessIntelligence,
      nextActions: ["View restaurant details", "Check availability", "Make reservation"]
    };
  },

  generateMockRecommendations(query) {
    const restaurants = [
      {
        id: 15,
        name: "Mumbai Spice Palace",
        slug: "mumbai-spice-palace-15",
        description: "Authentic Indian cuisine with modern twist",
        suburb: "Melbourne CBD",
        rating: 4.8,
        intelligenceScore: 95,
        scoringFactors: {
          contextualFit: 0.9,
          operationalHealth: 0.85,
          customerSatisfaction: 0.96,
          marketPosition: 0.8,
          accessibilityScore: 0.9
        },
        aiInsights: ["⚡ High demand right now - book ahead", "🚀 Quick service available"],
        contextualReasons: ["Perfect for dinner", "Matches your casual dining needs", "Great rainy day option"],
        suggestedActions: ["View full menu", "Reserve now", "Check promotions"]
      },
      {
        id: 17,
        name: "Curry Leaf",
        slug: "curry-leaf-carlton",
        description: "Modern Indian fusion with molecular gastronomy",
        suburb: "Carlton",
        rating: 4.8,
        intelligenceScore: 88,
        scoringFactors: {
          contextualFit: 0.85,
          operationalHealth: 0.9,
          customerSatisfaction: 0.96,
          marketPosition: 0.9,
          accessibilityScore: 0.7
        },
        aiInsights: ["🍷 Wine pairing available", "👨‍🍳 Chef's table experience"],
        contextualReasons: ["Upscale option for special occasions", "Award-winning chef", "Great for date night"],
        suggestedActions: ["Book degustation", "Check wine list", "Reserve chef's table"]
      }
    ];

    // Filter based on query
    if (query.toLowerCase().includes('casual')) {
      return [restaurants[0]];
    }
    if (query.toLowerCase().includes('fine dining')) {
      return [restaurants[1]];
    }
    
    return restaurants;
  },

  generateProactiveInsights() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    const insights = [];
    
    if (hour >= 18 && hour <= 20) {
      insights.push("🕐 Friday dinner rush expected - consider restaurants with quick service or pre-ordering");
    }
    
    if (day === 5 || day === 6) {
      insights.push("🍾 Weekend demand is high - popular restaurants may be busy");
    }
    
    insights.push("📈 Mumbai Spice Palace is trending today - book soon for better availability");
    insights.push("🌧️ Indoor dining recommended based on weather forecast");
    
    return insights;
  },

  generateBusinessIntelligence() {
    return {
      marketConditions: {
        peakTime: true,
        demandLevel: "high",
        competitivePressure: "medium",
        opportunityAreas: ["vegetarian_specialties", "delivery_optimization"]
      },
      operationalInsights: {
        staffingOptimization: "Consider adding weekend evening staff",
        capacityUtilization: "75% average, 90% peak times",
        promotionEffectiveness: "Happy hour promotions performing well"
      },
      customerBehavior: {
        currentTrends: ["Increased vegetarian demand", "Preference for outdoor seating"],
        locationHotspots: ["CBD", "South Yarra", "Carlton"],
        preferenceShifts: ["Quality over quantity", "Sustainable dining"]
      }
    };
  }
};

// AI Genie Service Demo
class AIGenieDemo {
  async processIntelligentQuery(query, userLocation) {
    console.log(`🤖 [AI-GENIE-DEMO] Processing: "${query}"`);
    console.log(`📍 User Location: ${userLocation || 'Not specified'}`);
    console.log(`⏰ Context: ${new Date().toLocaleString()}\n`);
    
    const result = await mockContextualIntelligence.processIntelligentQuery(query, userLocation);
    
    console.log("🧠 INTELLIGENT UNDERSTANDING:");
    console.log(`"${result.understanding}"\n`);
    
    console.log("🔮 PROACTIVE INSIGHTS:");
    result.proactiveInsights.forEach(insight => console.log(`  ${insight}`));
    console.log();
    
    console.log("🎯 INTELLIGENT RECOMMENDATIONS:");
    result.recommendations.forEach((restaurant, i) => {
      console.log(`  ${i + 1}. ${restaurant.name} (Score: ${restaurant.intelligenceScore})`);
      console.log(`     ${restaurant.description}`);
      console.log(`     Location: ${restaurant.suburb} | Rating: ${restaurant.rating}★`);
      console.log(`     AI Insights: ${restaurant.aiInsights.join(', ')}`);
      console.log(`     Why recommended: ${restaurant.contextualReasons.join(', ')}`);
      console.log();
    });
    
    console.log("📊 BUSINESS INTELLIGENCE:");
    console.log(`  Market Demand: ${result.businessIntelligence.marketConditions.demandLevel}`);
    console.log(`  Peak Time: ${result.businessIntelligence.marketConditions.peakTime ? 'Yes' : 'No'}`);
    console.log(`  Trending: ${result.businessIntelligence.customerBehavior.currentTrends.join(', ')}`);
    console.log();
    
    console.log("🎬 NEXT ACTIONS:");
    result.nextActions.forEach(action => console.log(`  • ${action}`));
    
    return result;
  }

  async demonstrateCapabilities() {
    console.log("🚀 ===== AI GENIE INTELLIGENCE DEMO =====");
    console.log("🎯 FOUNDER VISION: Beyond Chatbots to Ecosystem Intelligence\n");
    
    const queries = [
      {
        query: "Find me good Indian restaurants for dinner",
        location: "Melbourne CBD",
        scenario: "Casual dinner search"
      },
      {
        query: "I want fine dining Indian cuisine for a special occasion",
        location: "Carlton",
        scenario: "Special occasion dining"
      },
      {
        query: "Quick Thai food near my office",
        location: "Richmond",
        scenario: "Business lunch"
      }
    ];
    
    for (const test of queries) {
      console.log(`📝 SCENARIO: ${test.scenario}`);
      console.log(`${'='.repeat(50)}`);
      await this.processIntelligentQuery(test.query, test.location);
      console.log(`${'='.repeat(50)}\n`);
    }
    
    console.log("💡 INNOVATION HIGHLIGHTS:");
    console.log("  ✅ LLM-Agnostic Architecture (works with any AI provider)");
    console.log("  ✅ Contextual Intelligence (time, weather, events aware)");
    console.log("  ✅ Business Intelligence (operational insights)");
    console.log("  ✅ Proactive Recommendations (anticipates needs)");
    console.log("  ✅ Ecosystem Optimization (benefits customers + businesses)");
    console.log("  ✅ Real-time Adaptation (learns and improves)");
    
    console.log("\n🏗️ ARCHITECTURE BENEFITS:");
    console.log("  • No vendor lock-in (OpenAI, Anthropic, Ollama, or custom)");
    console.log("  • Graceful degradation (works even without AI)");
    console.log("  • Cost optimization (local models = free inference)");
    console.log("  • Privacy protection (data stays local when using Ollama)");
    console.log("  • Performance scaling (choose speed vs cost vs privacy)");
  }

  async getSystemStatus() {
    return {
      status: 'demo_mode',
      intelligence: {
        level: 'contextual_ecosystem',
        provider: 'MockProvider (Demo)',
        capabilities: [
          'Natural Language Understanding',
          'Contextual Awareness',
          'Business Intelligence',
          'Proactive Recommendations',
          'Real-time Adaptation'
        ]
      },
      innovation: {
        beyondChatbots: true,
        ecosystemIntelligence: true,
        realTimeAdaptation: true,
        hyperLocalContext: true,
        llmAgnostic: true
      }
    };
  }
}

// Run Demo
async function runDemo() {
  const aiGenie = new AIGenieDemo();
  await aiGenie.demonstrateCapabilities();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIGenieDemo };
} else {
  // Run demo if called directly
  runDemo().catch(console.error);
}