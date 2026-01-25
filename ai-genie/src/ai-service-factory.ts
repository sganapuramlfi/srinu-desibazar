import { IAIService, AIConfig } from './types.js';
import { OpenAIService } from './services/openai-service.js';
import { MockAIService } from './services/mock-service.js';
import { ClaudeService } from './services/claude-service.js';
import { GeminiService } from './services/gemini-service.js';
import { DeepSeekService } from './services/deepseek-service.js';
import { OllamaService } from './services/ollama-service.js';
import { AIConfigManager } from './config.js';

// Disabled service for when AI is turned off
class DisabledAIService implements IAIService {
  isEnabled(): boolean {
    return false;
  }

  async search(): Promise<any> {
    return { suggestions: [], aiSummary: '', confidence: 0 };
  }

  async booking(): Promise<any> {
    return { action: 'error', message: 'AI assistant is currently disabled' };
  }

  async insights(): Promise<any> {
    return { 
      recommendation: 'AI insights are disabled', 
      priority: 'low', 
      bookingTrend: 'N/A', 
      optimalHours: [], 
      insights: [] 
    };
  }
}

export class AIServiceFactory {
  private static instance: IAIService | null = null;
  private static config: AIConfigManager;

  static initialize(config: AIConfigManager): void {
    this.config = config;
    this.instance = null; // Reset instance when config changes
  }

  static getInstance(): IAIService {
    if (!this.instance) {
      this.instance = this.createService();
    }
    return this.instance;
  }

  private static createService(): IAIService {
    if (!this.config.isEnabled()) {
      return new DisabledAIService();
    }

    const provider = this.config.getProvider();
    const aiConfig = this.config.getConfig();

    switch (provider) {
      case 'openai':
        return new OpenAIService(aiConfig);
      
      case 'claude':
        return new ClaudeService(aiConfig);
      
      case 'gemini':
        return new GeminiService(aiConfig);
      
      case 'deepseek':
        return new DeepSeekService(aiConfig);
      
      case 'ollama':
      case 'local':
        return new OllamaService(aiConfig);
      
      case 'mock':
        return new MockAIService();
      
      case 'disabled':
      default:
        return new DisabledAIService();
    }
  }

  // Force recreate service (useful for runtime config changes)
  static resetInstance(): void {
    this.instance = null;
  }

  // Check if specific feature is available
  static isFeatureEnabled(feature: keyof AIConfig['features']): boolean {
    return this.config?.isFeatureEnabled(feature) || false;
  }
}