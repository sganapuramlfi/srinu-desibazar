import { AIConfig } from './types.js';

// Default AI configuration
export const defaultAIConfig: AIConfig = {
  enabled: process.env.AI_ENABLED === 'true' || false,
  openaiApiKey: process.env.OPENAI_API_KEY,
  provider: process.env.AI_PROVIDER as 'openai' | 'mock' | 'disabled' || 'disabled',
  features: {
    smartSearch: process.env.AI_SMART_SEARCH === 'true' || false,
    bookingAssistant: process.env.AI_BOOKING_ASSISTANT === 'true' || false,
    businessInsights: process.env.AI_BUSINESS_INSIGHTS === 'true' || false,
    messageAI: process.env.AI_MESSAGE_AI === 'true' || false,
  }
};

export class AIConfigManager {
  private config: AIConfig;

  constructor(initialConfig?: Partial<AIConfig>) {
    this.config = { ...defaultAIConfig, ...initialConfig };
  }

  isEnabled(): boolean {
    return this.config.enabled && this.config.provider !== 'disabled';
  }

  isFeatureEnabled(feature: keyof AIConfig['features']): boolean {
    return this.isEnabled() && this.config.features[feature];
  }

  getProvider(): AIConfig['provider'] {
    return this.config.provider;
  }

  updateConfig(updates: Partial<AIConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }

  // Runtime feature toggle
  toggleFeature(feature: keyof AIConfig['features'], enabled: boolean): void {
    this.config.features[feature] = enabled;
  }

  // Complete disable/enable
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}