import OpenAI from 'openai';
import { 
  IAIService, 
  AIConfig,
  AISearchRequest, 
  AISearchResult, 
  AIBookingRequest, 
  AIBookingResponse,
  AIInsightsRequest,
  AIInsightsResponse 
} from '../types.js';

export class OpenAIService implements IAIService {
  private client: OpenAI;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    const apiKey = config.providerConfig.apiKey;
    
    if (apiKey) {
      this.client = new OpenAI({ 
        apiKey,
        baseURL: config.providerConfig.baseUrl,
        defaultHeaders: config.providerConfig.customHeaders
      });
    }
  }

  isEnabled(): boolean {
    return this.config.enabled && this.config.provider === 'openai' && !!this.config.providerConfig.apiKey;
  }

  async search(request: AISearchRequest): Promise<AISearchResult> {
    if (!this.isEnabled()) {
      throw new Error('OpenAI service not enabled');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.providerConfig.model || "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are ABRAKADABRA, an AI genie for a multi-industry platform (salons, restaurants, real estate, events, retail). 
          Analyze search queries and return business suggestions with match reasons.
          Respond with valid JSON only.`
        }, {
          role: "user",
          content: `Search query: "${request.query}"
          Location: ${request.location || 'Not specified'}
          Industry: ${request.industry || 'Any'}
          
          Provide search suggestions and analysis.`
        }],
        response_format: { type: "json_object" },
        max_tokens: this.config.providerConfig.maxTokens || 500,
        temperature: this.config.providerConfig.temperature || 0.7
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        suggestions: result.suggestions || [],
        aiSummary: result.summary || 'AI analysis available',
        confidence: result.confidence || 0.8
      };
    } catch (error) {
      console.error('OpenAI Search Error:', error);
      return {
        suggestions: [],
        aiSummary: 'AI temporarily unavailable',
        confidence: 0
      };
    }
  }

  async booking(request: AIBookingRequest): Promise<AIBookingResponse> {
    if (!this.isEnabled()) {
      throw new Error('OpenAI service not enabled');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.providerConfig.model || "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are a booking assistant. Parse booking requests and determine actions.
          Actions: 'book' (if clear), 'clarify' (if unclear), 'suggest' (alternatives).
          Respond with valid JSON only.`
        }, {
          role: "user",
          content: `Booking request: "${request.message}"
          Available services: ${JSON.stringify(request.availableServices)}
          Business ID: ${request.businessId}`
        }],
        response_format: { type: "json_object" },
        max_tokens: this.config.providerConfig.maxTokens || 300,
        temperature: this.config.providerConfig.temperature || 0.5
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI Booking Error:', error);
      return {
        action: 'error',
        message: 'Sorry, I cannot process bookings right now. Please try manual booking.'
      };
    }
  }

  async insights(request: AIInsightsRequest): Promise<AIInsightsResponse> {
    if (!this.isEnabled()) {
      throw new Error('OpenAI service not enabled');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.providerConfig.model || "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are a business insights AI. Analyze business data and provide actionable recommendations.
          Respond with valid JSON only.`
        }, {
          role: "user",
          content: `Business ID: ${request.businessId}
          Timeframe: ${request.timeframe}
          
          Provide insights and recommendations.`
        }],
        response_format: { type: "json_object" },
        max_tokens: this.config.providerConfig.maxTokens || 400,
        temperature: this.config.providerConfig.temperature || 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI Insights Error:', error);
      return {
        recommendation: 'AI insights temporarily unavailable',
        priority: 'low',
        bookingTrend: 'No data',
        optimalHours: [],
        insights: []
      };
    }
  }
}