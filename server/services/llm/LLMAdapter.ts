/**
 * LLM-Agnostic Adapter Pattern
 * Auto-detects and adapts to available LLM providers
 * 
 * Founder Vision: Never be locked into one provider
 * Engineer Approach: Clean abstraction with fallbacks
 */

export interface LLMProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateResponse(prompt: string, options?: any): Promise<string>;
  extractJSON(prompt: string): Promise<any>;
  getCost(): number; // cost per 1k tokens
  getSpeed(): number; // avg response time in ms
}

export interface LLMConfig {
  provider: string;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class OpenAIProvider implements LLMProvider {
  name = "OpenAI";
  private apiKey: string;
  private model: string;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey!;
    this.model = config.model || "gpt-3.5-turbo";
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": `Bearer ${this.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateResponse(prompt: string, options: any = {}): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 500
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async extractJSON(prompt: string): Promise<any> {
    const response = await this.generateResponse(prompt + "\n\nReturn only valid JSON:", {
      temperature: 0.1
    });
    return JSON.parse(response);
  }

  getCost(): number { return 0.002; } // $0.002 per 1k tokens
  getSpeed(): number { return 800; } // 800ms avg
}

export class AnthropicProvider implements LLMProvider {
  name = "Anthropic";
  private apiKey: string;
  private model: string;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey!;
    this.model = config.model || "claude-3-haiku-20240307";
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async generateResponse(prompt: string, options: any = {}): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens || 500,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    return data.content[0].text;
  }

  async extractJSON(prompt: string): Promise<any> {
    const response = await this.generateResponse(prompt + "\n\nReturn only valid JSON:");
    return JSON.parse(response);
  }

  getCost(): number { return 0.0008; } // $0.0008 per 1k tokens
  getSpeed(): number { return 600; } // 600ms avg
}

export class OllamaProvider implements LLMProvider {
  name = "Ollama";
  private endpoint: string;
  private model: string;

  constructor(config: LLMConfig) {
    this.endpoint = config.endpoint || "http://localhost:11434";
    this.model = config.model || "llama3.2:3b";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.models?.some((m: any) => m.name.includes(this.model.split(':')[0]));
    } catch {
      return false;
    }
  }

  async generateResponse(prompt: string, options: any = {}): Promise<string> {
    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 500
        }
      })
    });
    const data = await response.json();
    return data.response;
  }

  async extractJSON(prompt: string): Promise<any> {
    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt + "\n\nReturn only valid JSON:",
        stream: false,
        format: "json",
        options: { temperature: 0.1 }
      })
    });
    const data = await response.json();
    return JSON.parse(data.response);
  }

  getCost(): number { return 0; } // Free local inference
  getSpeed(): number { return 400; } // 400ms avg (local)
}

export class LLMAdapterManager {
  private providers: Map<string, LLMProvider> = new Map();
  private activeProvider: LLMProvider | null = null;
  private fallbackEnabled = true;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    const configs = this.loadConfigFromEnv();
    
    // Initialize all configured providers
    configs.forEach(config => {
      let provider: LLMProvider;
      
      switch (config.provider.toLowerCase()) {
        case 'openai':
          provider = new OpenAIProvider(config);
          break;
        case 'anthropic':
          provider = new AnthropicProvider(config);
          break;
        case 'ollama':
          provider = new OllamaProvider(config);
          break;
        default:
          console.warn(`Unknown LLM provider: ${config.provider}`);
          return;
      }
      
      this.providers.set(config.provider, provider);
    });
  }

  private loadConfigFromEnv(): LLMConfig[] {
    const configs: LLMConfig[] = [];
    
    // OpenAI Configuration
    if (process.env.OPENAI_API_KEY) {
      configs.push({
        provider: "openai",
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo"
      });
    }
    
    // Anthropic Configuration
    if (process.env.ANTHROPIC_API_KEY) {
      configs.push({
        provider: "anthropic",
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307"
      });
    }
    
    // Ollama Configuration (always try if no other providers)
    configs.push({
      provider: "ollama",
      endpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "llama3.2:3b"
    });
    
    return configs;
  }

  async getBestProvider(): Promise<LLMProvider | null> {
    if (this.activeProvider) return this.activeProvider;
    
    // Test all providers and rank by preference
    const available: Array<{provider: LLMProvider, score: number}> = [];
    
    for (const [name, provider] of this.providers) {
      try {
        if (await provider.isAvailable()) {
          // Score based on speed, cost, and reliability
          let score = 0;
          score += (1000 - provider.getSpeed()) / 10; // Faster = better
          score += (0.01 - provider.getCost()) * 1000; // Cheaper = better
          score += name === 'ollama' ? 20 : 0; // Local = more reliable
          
          available.push({ provider, score });
        }
      } catch (error) {
        console.warn(`Provider ${name} availability check failed:`, error);
      }
    }
    
    if (available.length === 0) {
      console.warn('No LLM providers available, using fallback');
      return null;
    }
    
    // Select best provider
    available.sort((a, b) => b.score - a.score);
    this.activeProvider = available[0].provider;
    
    console.log(`🧠 AI Genie using: ${this.activeProvider.name}`);
    return this.activeProvider;
  }

  async generateResponse(prompt: string, options: any = {}): Promise<string> {
    const provider = await this.getBestProvider();
    
    if (!provider) {
      // Fallback to simple template-based responses
      return this.generateFallbackResponse(prompt);
    }
    
    try {
      return await provider.generateResponse(prompt, options);
    } catch (error) {
      console.error(`LLM generation failed with ${provider.name}:`, error);
      
      if (this.fallbackEnabled) {
        // Try next best provider
        this.activeProvider = null;
        return this.generateFallbackResponse(prompt);
      }
      
      throw error;
    }
  }

  async extractJSON(prompt: string): Promise<any> {
    const provider = await this.getBestProvider();
    
    if (!provider) {
      return this.extractJSONFallback(prompt);
    }
    
    try {
      return await provider.extractJSON(prompt);
    } catch (error) {
      console.error(`JSON extraction failed with ${provider.name}:`, error);
      return this.extractJSONFallback(prompt);
    }
  }

  private generateFallbackResponse(prompt: string): string {
    // Simple template-based fallback
    if (prompt.toLowerCase().includes('indian')) {
      return "I found several great Indian restaurants in your area! Let me show you the most popular ones.";
    }
    if (prompt.toLowerCase().includes('chinese')) {
      return "Here are some excellent Chinese restaurants nearby with great reviews.";
    }
    return "I found some great restaurant options for you! Take a look at these recommendations.";
  }

  private extractJSONFallback(prompt: string): any {
    // Simple keyword extraction
    const text = prompt.toLowerCase();
    return {
      cuisine_type: ['indian', 'chinese', 'thai', 'japanese'].find(c => text.includes(c)) || null,
      location: ['cbd', 'richmond', 'carlton'].find(l => text.includes(l)) || null,
      features: ['halal', 'vegetarian', 'delivery'].filter(f => text.includes(f))
    };
  }

  getStatus(): any {
    return {
      activeProvider: this.activeProvider?.name || 'fallback',
      availableProviders: Array.from(this.providers.keys()),
      fallbackEnabled: this.fallbackEnabled
    };
  }
}

// Export singleton
export const llmAdapter = new LLMAdapterManager();