// Client-side module registry that works with server API
export interface ModuleConfig {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  industry: string;
  features: string[];
  dependencies?: string[];
}

export interface BaseModule {
  config: ModuleConfig;
  components?: any[];
  routes?: any[];
}

export type IndustryType = 
  | 'salon'
  | 'restaurant'
  | 'realestate'
  | 'eventmanagement'
  | 'retail'
  | 'professionalservices';

export class ClientModuleRegistry {
  private static instance: ClientModuleRegistry;
  private modules: Map<string, BaseModule> = new Map();

  private constructor() {}

  static getInstance(): ClientModuleRegistry {
    if (!ClientModuleRegistry.instance) {
      ClientModuleRegistry.instance = new ClientModuleRegistry();
    }
    return ClientModuleRegistry.instance;
  }

  async registerModule(module: BaseModule): Promise<void> {
    this.modules.set(module.config.id, module);
  }

  getModule(moduleId: string): BaseModule | undefined {
    return this.modules.get(moduleId);
  }

  getAllModules(): BaseModule[] {
    return Array.from(this.modules.values());
  }

  getEnabledModules(): BaseModule[] {
    return this.getAllModules().filter(module => module.config.enabled);
  }

  getModulesByIndustry(industry: IndustryType): BaseModule[] {
    return this.getAllModules().filter(module => module.config.industry === industry);
  }

  isModuleEnabled(moduleId: string): boolean {
    const module = this.getModule(moduleId);
    return module?.config.enabled || false;
  }

  clear(): void {
    this.modules.clear();
  }
}