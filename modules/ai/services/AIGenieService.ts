import { AIConfig, AIRequest, AIResponse, SmartBookingSuggestion, CustomerInsight, StaffOptimization } from '../types.js';

export class AIGenieService {
  private config: AIConfig;
  private requestHistory: Map<string, AIRequest> = new Map();
  private responseHistory: Map<string, AIResponse> = new Map();

  constructor(config: AIConfig) {
    this.config = config;
  }

  // Check if AI is enabled and feature is active
  isFeatureEnabled(feature: keyof AIConfig['features']): boolean {
    return this.config.enabled && this.config.features[feature];
  }

  // Process AI request
  async processAIRequest(request: Omit<AIRequest, 'id' | 'createdAt'>): Promise<AIResponse> {
    const aiRequest: AIRequest = {
      ...request,
      id: this.generateRequestId(),
      createdAt: new Date()
    };

    // Store request
    this.requestHistory.set(aiRequest.id, aiRequest);

    // Check if feature is enabled
    if (!this.isFeatureEnabled(aiRequest.feature)) {
      throw new Error(`AI feature '${aiRequest.feature}' is not enabled`);
    }

    // Check rate limits
    if (!this.checkRateLimit(aiRequest.businessId)) {
      throw new Error('Rate limit exceeded');
    }

    try {
      const response = await this.generateAIResponse(aiRequest);
      this.responseHistory.set(response.id, response);
      return response;
    } catch (error) {
      console.error('AI request failed:', error);
      throw error;
    }
  }

  // Generate AI response based on provider
  private async generateAIResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    let response: string;
    let confidence: number;
    let suggestions: AIResponse['suggestions'] = [];

    switch (this.config.provider) {
      case 'mock':
        ({ response, confidence, suggestions } = this.generateMockResponse(request));
        break;
      case 'disabled':
        throw new Error('AI provider is disabled');
      default:
        ({ response, confidence, suggestions } = await this.callExternalProvider(request));
        break;
    }

    const processingTime = Date.now() - startTime;

    return {
      id: this.generateResponseId(),
      requestId: request.id,
      response,
      confidence,
      suggestions,
      metadata: {
        provider: this.config.provider,
        model: this.config.providerConfig.model || 'default',
        tokensUsed: this.estimateTokens(request.prompt + response),
        processingTime
      },
      createdAt: new Date()
    };
  }

  // Generate mock responses for testing
  private generateMockResponse(request: AIRequest): { response: string; confidence: number; suggestions: AIResponse['suggestions'] } {
    const responses: Record<string, any> = {
      smartBooking: {
        response: `Based on your booking patterns, I recommend scheduling appointments during your peak hours (2-4 PM) and suggest offering 15% discount for off-peak times to balance demand.`,
        confidence: 0.85,
        suggestions: [
          {
            title: "Optimize Peak Hours",
            description: "Schedule high-value services during 2-4 PM when demand is highest",
            action: "update_scheduling",
            priority: 1
          },
          {
            title: "Off-Peak Incentives",
            description: "Offer 15% discount for bookings before 11 AM or after 6 PM",
            action: "create_promotion",
            priority: 2
          }
        ]
      },
      customerInsights: {
        response: `Customer analysis shows 73% prefer afternoon appointments, with loyalty program members booking 40% more services. Top preference is relaxation services over styling.`,
        confidence: 0.91,
        suggestions: [
          {
            title: "Afternoon Focus",
            description: "Increase afternoon staff capacity by 20%",
            action: "adjust_staffing",
            priority: 1
          },
          {
            title: "Loyalty Enhancement",
            description: "Create exclusive afternoon slots for loyalty members",
            action: "create_vip_slots",
            priority: 2
          }
        ]
      },
      staffOptimization: {
        response: `Staff analysis indicates 15% efficiency gain possible through better skill matching. Sarah excels at color services, while Mike is best for cuts.`,
        confidence: 0.78,
        suggestions: [
          {
            title: "Skill-Based Scheduling",
            description: "Assign color services to Sarah, cuts to Mike",
            action: "update_staff_assignments",
            priority: 1
          },
          {
            title: "Cross-Training",
            description: "Train junior staff in high-demand services",
            action: "schedule_training",
            priority: 3
          }
        ]
      },
      priceOptimization: {
        response: `Price analysis suggests 8% revenue increase possible with dynamic pricing. Premium services can bear 12% increase during peak hours.`,
        confidence: 0.82,
        suggestions: [
          {
            title: "Dynamic Pricing",
            description: "Implement peak hour pricing (12% increase)",
            action: "update_pricing",
            priority: 1
          },
          {
            title: "Service Bundling",
            description: "Create package deals for complementary services",
            action: "create_packages",
            priority: 2
          }
        ]
      },
      reviewAnalysis: {
        response: `Review sentiment is 87% positive. Common complaints: wait times (23% of negative reviews) and booking difficulty (31%). Praise: staff friendliness (94%).`,
        confidence: 0.89,
        suggestions: [
          {
            title: "Reduce Wait Times",
            description: "Implement buffer time management",
            action: "optimize_scheduling",
            priority: 1
          },
          {
            title: "Booking Improvement",
            description: "Simplify online booking process",
            action: "update_booking_ui",
            priority: 2
          }
        ]
      },
      marketingInsights: {
        response: `Marketing analysis shows social media posts with before/after photos get 340% more engagement. Best posting time: Tuesday 7 PM.`,
        confidence: 0.86,
        suggestions: [
          {
            title: "Visual Content Focus",
            description: "Increase before/after photo posts by 200%",
            action: "update_content_strategy",
            priority: 1
          },
          {
            title: "Optimal Timing",
            description: "Schedule posts for Tuesday evenings",
            action: "update_posting_schedule",
            priority: 2
          }
        ]
      }
    };

    const mockResponse = responses[request.feature] || {
      response: `AI analysis complete for ${request.feature}. Mock response generated based on your request: "${request.prompt}"`,
      confidence: 0.75,
      suggestions: []
    };

    return mockResponse;
  }

  // Call external AI provider (placeholder)
  private async callExternalProvider(request: AIRequest): Promise<{ response: string; confidence: number; suggestions: AIResponse['suggestions'] }> {
    // This would implement actual API calls to OpenAI, Claude, etc.
    // For now, return mock response
    return this.generateMockResponse(request);
  }

  // Generate smart booking suggestions
  async generateSmartBookingSuggestions(businessId: number, context?: any): Promise<SmartBookingSuggestion> {
    const request: Omit<AIRequest, 'id' | 'createdAt'> = {
      businessId,
      feature: 'smartBooking',
      prompt: `Analyze booking patterns and generate optimization suggestions for business ${businessId}`,
      context,
      metadata: { priority: 'medium' }
    };

    const aiResponse = await this.processAIRequest(request);

    return {
      id: this.generateRequestId(),
      businessId,
      suggestions: aiResponse.suggestions?.map(s => ({
        type: this.categorizeRecommendation(s.title),
        title: s.title,
        description: s.description,
        estimatedImpact: "5-15% revenue increase",
        confidence: aiResponse.confidence,
        data: { action: s.action, priority: s.priority }
      })) || [],
      generatedAt: new Date(),
      status: 'pending'
    };
  }

  // Generate customer insights
  async generateCustomerInsights(customerId: number, businessId: number): Promise<CustomerInsight> {
    const request: Omit<AIRequest, 'id' | 'createdAt'> = {
      businessId,
      feature: 'customerInsights',
      prompt: `Analyze customer behavior and preferences for customer ${customerId}`,
      context: { customerId },
      metadata: { priority: 'medium' }
    };

    const aiResponse = await this.processAIRequest(request);

    return {
      customerId,
      businessId,
      insights: {
        preferences: [
          { category: 'Services', preference: 'Relaxation over styling', confidence: 0.87 },
          { category: 'Timing', preference: 'Afternoon appointments', confidence: 0.92 },
          { category: 'Staff', preference: 'Experienced professionals', confidence: 0.78 }
        ],
        patterns: [
          { pattern: 'Books every 6 weeks', frequency: 'Regular', lastObserved: new Date() },
          { pattern: 'Prefers Friday appointments', frequency: 'Often', lastObserved: new Date() }
        ],
        recommendations: aiResponse.suggestions?.map(s => ({
          type: 'service' as const,
          title: s.title,
          description: s.description,
          expectedValue: 50
        })) || [],
        riskFactors: [
          { factor: 'Price sensitivity', risk: 'medium' as const, mitigation: 'Offer loyalty discounts' }
        ]
      },
      lastUpdated: new Date()
    };
  }

  // Generate staff optimization recommendations
  async generateStaffOptimization(businessId: number, date: string): Promise<StaffOptimization> {
    const request: Omit<AIRequest, 'id' | 'createdAt'> = {
      businessId,
      feature: 'staffOptimization',
      prompt: `Analyze staff performance and scheduling for optimization on ${date}`,
      context: { date },
      metadata: { priority: 'high' }
    };

    const aiResponse = await this.processAIRequest(request);

    return {
      businessId,
      date,
      recommendations: aiResponse.suggestions?.map((s, index) => ({
        type: this.categorizeStaffRecommendation(s.title),
        staffId: index + 1,
        staffName: `Staff Member ${index + 1}`,
        recommendation: s.description,
        impact: "Moderate improvement expected",
        priority: s.priority === 1 ? 'high' as const : 'medium' as const
      })) || [],
      metrics: {
        currentUtilization: 0.73,
        optimizedUtilization: 0.85,
        potentialRevenue: 2500,
        customerSatisfaction: 4.6
      },
      generatedAt: new Date()
    };
  }

  // Utility methods
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResponseId(): string {
    return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkRateLimit(businessId: number): boolean {
    // Implement rate limiting logic
    return true;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private categorizeRecommendation(title: string): 'time-optimization' | 'service-recommendation' | 'staff-assignment' | 'pricing-optimization' {
    if (title.toLowerCase().includes('time') || title.toLowerCase().includes('hour')) {
      return 'time-optimization';
    }
    if (title.toLowerCase().includes('price') || title.toLowerCase().includes('pricing')) {
      return 'pricing-optimization';
    }
    if (title.toLowerCase().includes('staff') || title.toLowerCase().includes('assign')) {
      return 'staff-assignment';
    }
    return 'service-recommendation';
  }

  private categorizeStaffRecommendation(title: string): 'scheduling' | 'training' | 'workload' | 'performance' {
    if (title.toLowerCase().includes('schedule')) return 'scheduling';
    if (title.toLowerCase().includes('train')) return 'training';
    if (title.toLowerCase().includes('workload')) return 'workload';
    return 'performance';
  }

  // Get configuration
  getConfig(): AIConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get analytics
  getAnalytics(businessId: number, date: string): any {
    const requests = Array.from(this.requestHistory.values())
      .filter(req => req.businessId === businessId);
    
    const responses = requests.map(req => this.responseHistory.get(req.id))
      .filter(Boolean) as AIResponse[];

    return {
      date,
      businessId,
      totalRequests: requests.length,
      requestsByFeature: this.groupByFeature(requests),
      averageResponseTime: this.calculateAverageResponseTime(responses),
      successRate: responses.length / requests.length,
      tokensUsed: responses.reduce((sum, res) => sum + (res.metadata?.tokensUsed || 0), 0),
      costEstimate: this.estimateCost(responses),
      topInsights: this.extractTopInsights(responses),
      userEngagement: {
        activeUsers: new Set(requests.map(r => r.userId)).size,
        averageSessionLength: 5.2, // minutes
        featureAdoption: this.calculateFeatureAdoption(requests)
      }
    };
  }

  private groupByFeature(requests: AIRequest[]): Record<string, number> {
    return requests.reduce((acc, req) => {
      acc[req.feature] = (acc[req.feature] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageResponseTime(responses: AIResponse[]): number {
    if (responses.length === 0) return 0;
    const totalTime = responses.reduce((sum, res) => sum + (res.metadata?.processingTime || 0), 0);
    return totalTime / responses.length;
  }

  private estimateCost(responses: AIResponse[]): number {
    // Rough cost estimation based on tokens
    const totalTokens = responses.reduce((sum, res) => sum + (res.metadata?.tokensUsed || 0), 0);
    return totalTokens * 0.002; // $0.002 per 1K tokens (rough estimate)
  }

  private extractTopInsights(responses: AIResponse[]): Array<{ insight: string; frequency: number; impact: string }> {
    return [
      { insight: "Peak hour optimization opportunities", frequency: 5, impact: "High" },
      { insight: "Customer preference patterns identified", frequency: 3, impact: "Medium" },
      { insight: "Staff efficiency improvements available", frequency: 4, impact: "High" }
    ];
  }

  private calculateFeatureAdoption(requests: AIRequest[]): Record<string, number> {
    const total = requests.length;
    if (total === 0) return {};
    
    return this.groupByFeature(requests);
  }
}