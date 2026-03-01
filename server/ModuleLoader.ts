import { Router } from 'express';
import { ModuleRegistry } from '../modules/core/ModuleRegistry.js';
import { BaseModule } from '../modules/core/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ModuleLoader {
  private registry: ModuleRegistry;
  private router: Router;

  constructor() {
    this.registry = ModuleRegistry.getInstance();
    this.router = Router();
  }

  // Load all enabled modules from configuration
  async loadModules(): Promise<void> {
    try {
      // Load module configuration
      const configPath = path.join(__dirname, '../modules/config/modules.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      console.log('🔧 Loading modules from configuration...');

      // Load each enabled module
      for (const [moduleId, moduleConfig] of Object.entries(config)) {
        if (typeof moduleConfig === 'object' && (moduleConfig as any).enabled) {
          await this.loadModule(moduleId, moduleConfig as any);
        }
      }

      // Set up API routes for all loaded modules
      this.setupModuleRoutes();

      console.log(`✅ Successfully loaded ${this.registry.getEnabledModules().length} modules`);
    } catch (error) {
      console.error('❌ Failed to load modules:', error);
      throw error;
    }
  }

  // Load a specific module
  private async loadModule(moduleId: string, config: any): Promise<void> {
    try {
      console.log(`📦 Loading module: ${moduleId}`);

      // Import module dynamically
      const modulePath = path.join(__dirname, '../modules', moduleId, 'index.ts');
      
      if (!fs.existsSync(modulePath)) {
        console.warn(`⚠️  Module file not found: ${modulePath}`);
        return;
      }

      // Convert Windows path to proper file:// URL for ESM import
      const moduleUrl = path.isAbsolute(modulePath) ? `file:///${modulePath.replace(/\\/g, '/')}` : modulePath;
      const moduleImport = await import(moduleUrl);
      const moduleDefinition: BaseModule = moduleImport.default;

      if (!moduleDefinition) {
        console.warn(`⚠️  Module ${moduleId} has no default export`);
        return;
      }

      // Merge configuration settings
      moduleDefinition.config = {
        ...moduleDefinition.config,
        ...config,
        enabled: config.enabled
      };

      // Register module
      await this.registry.registerModule(moduleDefinition);

      console.log(`✅ Module ${moduleId} loaded successfully`);
    } catch (error) {
      console.error(`❌ Failed to load module ${moduleId}:`, error);
    }
  }

  // Set up API routes for all modules
  private setupModuleRoutes(): void {
    const endpoints = this.registry.getAllEndpoints();

    for (const endpoint of endpoints) {
      const method = endpoint.method.toLowerCase() as keyof Router;
      
      console.log(`🔗 Registering route: ${method.toUpperCase()} ${endpoint.fullPath}`);

      // Apply authentication middleware if required
      const middlewares: any[] = [];
      if (endpoint.auth) {
        // Add auth middleware here
        middlewares.push((req: any, res: any, next: any) => {
          // Simple auth check - replace with your auth logic
          if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
          }
          next();
        });
      }

      // Add module-specific middleware
      if (endpoint.middleware) {
        middlewares.push(...endpoint.middleware);
      }

      // Register route
      (this.router as any)[method](
        endpoint.fullPath,
        ...middlewares,
        endpoint.handler
      );
    }
  }

  // Get the router with all module routes
  getRouter(): Router {
    return this.router;
  }

  // Get module registry instance
  getRegistry(): ModuleRegistry {
    return this.registry;
  }

  // Enable/disable module at runtime
  async toggleModule(moduleId: string, enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        await this.registry.enableModule(moduleId);
      } else {
        await this.registry.disableModule(moduleId);
      }

      // Update configuration file
      await this.updateModuleConfig(moduleId, { enabled });

      console.log(`📦 Module ${moduleId} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error(`❌ Failed to toggle module ${moduleId}:`, error);
      throw error;
    }
  }

  // Update module configuration
  private async updateModuleConfig(moduleId: string, updates: any): Promise<void> {
    const configPath = path.join(__dirname, '../modules/config/modules.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    if (config[moduleId]) {
      config[moduleId] = { ...config[moduleId], ...updates };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
  }

  // Get module status for admin dashboard
  getModuleStatus() {
    const allModules = this.registry.getAllModules();
    const enabledModules = this.registry.getEnabledModules();

    return {
      total: allModules.length,
      enabled: enabledModules.length,
      disabled: allModules.length - enabledModules.length,
      modules: allModules.map(module => ({
        id: module.config.id,
        name: module.config.name,
        version: module.config.version,
        industry: module.config.industry,
        enabled: this.registry.isModuleEnabled(module.config.id),
        features: module.config.features,
        dependencies: module.config.dependencies || []
      }))
    };
  }

  // Health check for modules
  async healthCheck(): Promise<any> {
    const enabledModules = this.registry.getEnabledModules();
    const health = {
      status: 'healthy',
      modules: {} as any,
      timestamp: new Date().toISOString()
    };

    for (const module of enabledModules) {
      try {
        // Basic health check - module is loaded and enabled
        health.modules[module.config.id] = {
          status: 'healthy',
          version: module.config.version,
          features: module.config.features.length,
          routes: module.routes?.length || 0,
          endpoints: module.api?.endpoints.length || 0
        };
      } catch (error) {
        health.status = 'degraded';
        health.modules[module.config.id] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return health;
  }
}