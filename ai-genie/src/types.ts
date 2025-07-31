// Core AI Module Types
export interface AIConfig {
  enabled: boolean;
  features: {
    smartSearch: boolean;
    bookingAssistant: boolean;
    businessInsights: boolean;
    messageAI: boolean;
  };
  provider: 'openai' | 'claude' | 'gemini' | 'deepseek' | 'local' | 'ollama' | 'mock' | 'disabled';
  // Universal provider configuration
  providerConfig: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    customHeaders?: Record<string, string>;
  };
}

export interface AISearchRequest {
  query: string;
  location?: string;
  userId?: number;
  industry?: string;
}

export interface AISearchResult {
  suggestions: BusinessSuggestion[];
  aiSummary: string;
  confidence: number;
}

export interface BusinessSuggestion {
  id: number;
  name: string;
  matchReason: string;
  confidence: number;
  aiSummary: string;
  relevanceScore: number;
}

export interface AIBookingRequest {
  message: string;
  businessId: number;
  userId: number;
  availableServices: any[];
  userHistory?: any[];
}

export interface AIBookingResponse {
  action: 'book' | 'clarify' | 'suggest' | 'error';
  message: string;
  bookingData?: any;
  suggestions?: string[];
}

export interface AIInsightsRequest {
  businessId: number;
  timeframe: 'week' | 'month' | 'quarter';
}

export interface AIInsightsResponse {
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  bookingTrend: string;
  optimalHours: Array<{
    time: string;
    demand: string;
  }>;
  insights: string[];
}

// Abstract AI Service Interface
export interface IAIService {
  search(request: AISearchRequest): Promise<AISearchResult>;
  booking(request: AIBookingRequest): Promise<AIBookingResponse>;
  insights(request: AIInsightsRequest): Promise<AIInsightsResponse>;
  isEnabled(): boolean;
}