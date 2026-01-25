import { z } from "zod";
import { BaseService } from '../core/types.js';

// AI Service types
export interface AIService extends BaseService {
  category: 'recommendation' | 'search' | 'analysis' | 'automation' | 'insights';
  aiFeatures: string[]; // ['smart-booking', 'customer-insights', 'staff-optimization', 'price-optimization']
  provider: 'openai' | 'claude' | 'gemini' | 'deepseek' | 'local' | 'ollama' | 'mock' | 'disabled';
  requiresApiKey: boolean;
  dataProcessing: 'real-time' | 'batch' | 'scheduled';
}

// AI Configuration
export interface AIConfig {
  enabled: boolean;
  provider: 'openai' | 'claude' | 'gemini' | 'deepseek' | 'local' | 'ollama' | 'mock' | 'disabled';
  providerConfig: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    customHeaders?: Record<string, string>;
  };
  features: {
    smartBooking: boolean;
    customerInsights: boolean;
    staffOptimization: boolean;
    priceOptimization: boolean;
    reviewAnalysis: boolean;
    marketingInsights: boolean;
    predictiveAnalytics: boolean;
    chatbot: boolean;
  };
  dataRetention: {
    days: number;
    anonymize: boolean;
    excludePersonalData: boolean;
  };
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

// AI Request/Response types
export interface AIRequest {
  id: string;
  businessId: number;
  feature: keyof AIConfig['features'];
  prompt: string;
  context?: Record<string, any>;
  userId?: number;
  metadata?: {
    industry?: string;
    service?: string;
    priority?: 'low' | 'medium' | 'high';
  };
  createdAt: Date;
}

export interface AIResponse {
  id: string;
  requestId: string;
  response: string;
  confidence: number;
  suggestions?: Array<{
    title: string;
    description: string;
    action?: string;
    priority: number;
  }>;
  metadata?: {
    provider: string;
    model: string;
    tokensUsed: number;
    processingTime: number;
  };
  createdAt: Date;
}

// Smart booking suggestions
export interface SmartBookingSuggestion {
  id: string;
  businessId: number;
  customerId?: number;
  suggestions: Array<{
    type: 'time-optimization' | 'service-recommendation' | 'staff-assignment' | 'pricing-optimization';
    title: string;
    description: string;
    estimatedImpact: string;
    confidence: number;
    data: Record<string, any>;
  }>;
  generatedAt: Date;
  appliedAt?: Date;
  status: 'pending' | 'applied' | 'dismissed';
}

// Customer insights
export interface CustomerInsight {
  customerId: number;
  businessId: number;
  insights: {
    preferences: Array<{
      category: string;
      preference: string;
      confidence: number;
    }>;
    patterns: Array<{
      pattern: string;
      frequency: string;
      lastObserved: Date;
    }>;
    recommendations: Array<{
      type: 'service' | 'timing' | 'staff' | 'package';
      title: string;
      description: string;
      expectedValue: number;
    }>;
    riskFactors: Array<{
      factor: string;
      risk: 'low' | 'medium' | 'high';
      mitigation: string;
    }>;
  };
  lastUpdated: Date;
}

// Staff optimization insights
export interface StaffOptimization {
  businessId: number;
  date: string;
  recommendations: Array<{
    type: 'scheduling' | 'training' | 'workload' | 'performance';
    staffId: number;
    staffName: string;
    recommendation: string;
    impact: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  metrics: {
    currentUtilization: number;
    optimizedUtilization: number;
    potentialRevenue: number;
    customerSatisfaction: number;
  };
  generatedAt: Date;
}

// AI Analytics
export interface AIAnalytics {
  date: string;
  businessId: number;
  totalRequests: number;
  requestsByFeature: Record<string, number>;
  averageResponseTime: number;
  successRate: number;
  tokensUsed: number;
  costEstimate: number;
  topInsights: Array<{
    insight: string;
    frequency: number;
    impact: string;
  }>;
  userEngagement: {
    activeUsers: number;
    averageSessionLength: number;
    featureAdoption: Record<string, number>;
  };
}

// Form validation schemas
export const aiConfigFormSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(['openai', 'claude', 'gemini', 'deepseek', 'local', 'ollama', 'mock', 'disabled']).default('disabled'),
  providerConfig: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
    model: z.string().optional(),
    temperature: z.coerce.number().min(0).max(2).default(0.7),
    maxTokens: z.coerce.number().min(1).max(100000).default(1000),
    customHeaders: z.record(z.string()).default({}),
  }).default({}),
  features: z.object({
    smartBooking: z.boolean().default(false),
    customerInsights: z.boolean().default(false),
    staffOptimization: z.boolean().default(false),
    priceOptimization: z.boolean().default(false),
    reviewAnalysis: z.boolean().default(false),
    marketingInsights: z.boolean().default(false),
    predictiveAnalytics: z.boolean().default(false),
    chatbot: z.boolean().default(false),
  }).default({}),
  dataRetention: z.object({
    days: z.coerce.number().min(1).max(365).default(30),
    anonymize: z.boolean().default(true),
    excludePersonalData: z.boolean().default(true),
  }).default({}),
  rateLimit: z.object({
    requestsPerMinute: z.coerce.number().min(1).max(1000).default(10),
    requestsPerHour: z.coerce.number().min(1).max(10000).default(100),
    requestsPerDay: z.coerce.number().min(1).max(100000).default(1000),
  }).default({}),
});

export const aiRequestFormSchema = z.object({
  feature: z.enum(['smartBooking', 'customerInsights', 'staffOptimization', 'priceOptimization', 'reviewAnalysis', 'marketingInsights', 'predictiveAnalytics', 'chatbot']),
  prompt: z.string().min(1, "Prompt is required"),
  context: z.record(z.any()).optional(),
  metadata: z.object({
    industry: z.string().optional(),
    service: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
  }).optional(),
});

// Export form types
export type AIConfigFormData = z.infer<typeof aiConfigFormSchema>;
export type AIRequestFormData = z.infer<typeof aiRequestFormSchema>;