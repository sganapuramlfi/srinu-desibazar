// Main AI Genie Module Export
export * from './types.js';
export * from './config.js';
export * from './ai-service-factory.js';
export * from './services/openai-service.js';
export * from './services/claude-service.js';
export * from './services/gemini-service.js';
export * from './services/deepseek-service.js';
export * from './services/ollama-service.js';
export * from './services/mock-service.js';

// Express.js integration
export { createAIRoutes } from './server/routes.js';
export { aiMiddleware } from './server/middleware.js';

// Client-side hooks and components  
export { useAISearch } from './client/hooks.js';
export { AISearchBox } from './client/components.js';

// Main initialization function
import { AIConfigManager } from './config.js';
import { AIServiceFactory } from './ai-service-factory.js';

export function initializeAIGenie(config?: Partial<import('./types.js').AIConfig>) {
  const aiConfig = new AIConfigManager(config);
  AIServiceFactory.initialize(aiConfig);
  
  return {
    config: aiConfig,
    service: AIServiceFactory.getInstance(),
    isEnabled: () => aiConfig.isEnabled(),
    toggleFeature: (feature: keyof import('./types.js').AIConfig['features'], enabled: boolean) => {
      aiConfig.toggleFeature(feature, enabled);
      AIServiceFactory.resetInstance(); // Reinitialize with new config
    },
    setEnabled: (enabled: boolean) => {
      aiConfig.setEnabled(enabled);
      AIServiceFactory.resetInstance();
    }
  };
}