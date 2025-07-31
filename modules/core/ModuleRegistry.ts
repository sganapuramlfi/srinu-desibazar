import { BaseModule, ModuleConfig, IndustryType } from './types.js';

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules: Map<string, BaseModule> = new Map();
  private enabledModules: Set<string> = new Set();

  private constructor() {}

  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  // Register a module
  async registerModule(module: BaseModule): Promise<void> {
    const { id } = module.config;
    
    // Check dependencies
    if (module.config.dependencies) {
      for (const dep of module.config.dependencies) {
        if (!this.isModuleEnabled(dep)) {
          throw new Error(`Module ${id} requires dependency ${dep} to be enabled`);
        }
      }
    }

    this.modules.set(id, module);
    
    if (module.config.enabled) {
      await this.enableModule(id);
    }

    console.log(`Module ${id} registered successfully`);
  }

  // Enable a module
  async enableModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    if (this.enabledModules.has(moduleId)) {
      console.warn(`Module ${moduleId} is already enabled`);
      return;
    }

    // Initialize module
    if (module.onInit) {
      await module.onInit();
    }

    this.enabledModules.add(moduleId);
    console.log(`Module ${moduleId} enabled successfully`);
  }

  // Disable a module
  async disableModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    if (!this.enabledModules.has(moduleId)) {
      console.warn(`Module ${moduleId} is already disabled`);
      return;
    }

    // Check if other modules depend on this one
    for (const [id, mod] of this.modules) {
      if (mod.config.dependencies?.includes(moduleId) && this.enabledModules.has(id)) {
        throw new Error(`Cannot disable ${moduleId}: Module ${id} depends on it`);
      }
    }

    // Destroy module
    if (module.onDestroy) {
      await module.onDestroy();
    }

    this.enabledModules.delete(moduleId);
    console.log(`Module ${moduleId} disabled successfully`);
  }

  // Get all registered modules
  getAllModules(): BaseModule[] {
    return Array.from(this.modules.values());
  }

  // Get enabled modules
  getEnabledModules(): BaseModule[] {
    return Array.from(this.modules.values()).filter(module => 
      this.enabledModules.has(module.config.id)
    );
  }

  // Get modules by industry
  getModulesByIndustry(industry: IndustryType): BaseModule[] {
    return this.getEnabledModules().filter(module => 
      module.config.industry === industry
    );
  }

  // Check if module is enabled
  isModuleEnabled(moduleId: string): boolean {
    return this.enabledModules.has(moduleId);
  }

  // Get module by ID
  getModule(moduleId: string): BaseModule | undefined {
    return this.modules.get(moduleId);
  }

  // Get module config
  getModuleConfig(moduleId: string): ModuleConfig | undefined {
    return this.modules.get(moduleId)?.config;
  }

  // Get all routes from enabled modules
  getAllRoutes() {
    const routes: any[] = [];
    
    for (const module of this.getEnabledModules()) {
      if (module.routes) {
        routes.push(...module.routes.map(route => ({
          ...route,
          module: module.config.id
        })));
      }
    }
    
    return routes;
  }

  // Get all API endpoints from enabled modules
  getAllEndpoints() {
    const endpoints: any[] = [];
    
    for (const module of this.getEnabledModules()) {
      if (module.api?.endpoints) {
        endpoints.push(...module.api.endpoints.map(endpoint => ({
          ...endpoint,
          module: module.config.id,
          fullPath: `/api/${module.config.id}${endpoint.path}`
        })));
      }
    }
    
    return endpoints;
  }

  // Get components from a specific module
  getModuleComponents(moduleId: string) {
    const module = this.modules.get(moduleId);
    return module?.components || [];
  }

  // Load modules from environment configuration
  async loadFromConfig(config: Record<string, any>): Promise<void> {
    for (const [moduleId, moduleConfig] of Object.entries(config)) {
      if (typeof moduleConfig === 'object' && moduleConfig.enabled) {
        try {
          // Dynamic import of module
          const moduleFile = await import(`../${moduleId}/index.js`);
          if (moduleFile.default) {
            await this.registerModule(moduleFile.default);
          }
        } catch (error) {
          console.error(`Failed to load module ${moduleId}:`, error);
        }
      }
    }
  }
}