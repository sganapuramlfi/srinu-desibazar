import { IAIService, AIConfig, AISearchRequest, AISearchResult, AIBookingRequest, AIBookingResponse, AIInsightsRequest, AIInsightsResponse } from '../types.js';

export class ClaudeService implements IAIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async search(request: AISearchRequest): Promise<AISearchResult> {
    try {
      const response = await this.callClaude({
        messages: [{
          role: 'user',
          content: `Find businesses matching: "${request.query}" ${request.location ? `in ${request.location}` : ''} ${request.industry ? `for ${request.industry}` : ''}. Return JSON with suggestions array containing: id, name, matchReason, confidence (0-1), aiSummary, relevanceScore (0-100).`
        }],
        model: this.config.providerConfig.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.providerConfig.maxTokens || 1000,
        temperature: this.config.providerConfig.temperature || 0.7
      });

      return this.parseSearchResponse(response);
    } catch (error) {
      console.error('Claude search error:', error);
      return {
        suggestions: [],
        aiSummary: 'Search temporarily unavailable',
        confidence: 0
      };
    }
  }

  async booking(request: AIBookingRequest): Promise<AIBookingResponse> {
    try {
      const response = await this.callClaude({
        messages: [{
          role: 'user',
          content: `Help book appointment: "${request.message}". Available services: ${JSON.stringify(request.availableServices)}. User history: ${JSON.stringify(request.userHistory || [])}. Return JSON with action (book/clarify/suggest/error), message, and optionally bookingData or suggestions array.`
        }],
        model: this.config.providerConfig.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.providerConfig.maxTokens || 800,
        temperature: this.config.providerConfig.temperature || 0.5
      });

      return this.parseBookingResponse(response);
    } catch (error) {
      console.error('Claude booking error:', error);
      return {
        action: 'error',
        message: 'Booking assistant temporarily unavailable'
      };
    }
  }

  async insights(request: AIInsightsRequest): Promise<AIInsightsResponse> {
    try {
      const response = await this.callClaude({
        messages: [{
          role: 'user',
          content: `Analyze business insights for business ID ${request.businessId} over ${request.timeframe}. Return JSON with recommendation, priority (high/medium/low), bookingTrend, optimalHours array with time and demand, and insights array.`
        }],
        model: this.config.providerConfig.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.providerConfig.maxTokens || 1000,
        temperature: this.config.providerConfig.temperature || 0.3
      });

      return this.parseInsightsResponse(response);
    } catch (error) {
      console.error('Claude insights error:', error);
      return {
        recommendation: 'Insights temporarily unavailable',
        priority: 'low',
        bookingTrend: 'N/A',
        optimalHours: [],
        insights: []
      };
    }
  }

  isEnabled(): boolean {
    return this.config.enabled && this.config.provider === 'claude';
  }

  private async callClaude(payload: any): Promise<any> {
    const baseUrl = this.config.providerConfig.baseUrl || 'https://api.anthropic.com/v1';
    const apiKey = this.config.providerConfig.apiKey;

    if (!apiKey) {
      throw new Error('Claude API key not configured');
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      ...this.config.providerConfig.customHeaders
    };

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  private parseSearchResponse(response: string): AISearchResult {
    try {
      const parsed = JSON.parse(response);
      return {
        suggestions: parsed.suggestions || [],
        aiSummary: parsed.aiSummary || 'Found relevant businesses',
        confidence: parsed.confidence || 0.8
      };
    } catch {
      return {
        suggestions: [],
        aiSummary: 'Unable to parse search results',
        confidence: 0
      };
    }
  }

  private parseBookingResponse(response: string): AIBookingResponse {
    try {
      const parsed = JSON.parse(response);
      return {
        action: parsed.action || 'clarify',
        message: parsed.message || 'Please provide more details',
        bookingData: parsed.bookingData,
        suggestions: parsed.suggestions
      };
    } catch {
      return {
        action: 'error',
        message: 'Unable to process booking request'
      };
    }
  }

  private parseInsightsResponse(response: string): AIInsightsResponse {
    try {
      const parsed = JSON.parse(response);
      return {
        recommendation: parsed.recommendation || 'No recommendations available',
        priority: parsed.priority || 'low',
        bookingTrend: parsed.bookingTrend || 'Stable',
        optimalHours: parsed.optimalHours || [],
        insights: parsed.insights || []
      };
    } catch {
      return {
        recommendation: 'Unable to generate insights',
        priority: 'low',
        bookingTrend: 'N/A',
        optimalHours: [],
        insights: []
      };
    }
  }
}