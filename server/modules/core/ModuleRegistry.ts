interface ModuleConfig {
  id: string;
  name: string;
  version: string;
  features: string[];
}

interface Module {
  config: ModuleConfig;
  enabled: boolean;
}

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules: Map<string, Module> = new Map();

  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  constructor() {
    // Initialize default modules
    this.modules.set("restaurant", {
      config: {
        id: "restaurant",
        name: "Restaurant Management",
        version: "1.0.0",
        features: ["table_management", "menu_management", "booking_system"]
      },
      enabled: true
    });

    this.modules.set("salon", {
      config: {
        id: "salon",
        name: "Salon Management",
        version: "1.0.0",
        features: ["staff_management", "service_booking", "appointment_system"]
      },
      enabled: true
    });
  }

  getModuleStatus() {
    const modules = Array.from(this.modules.values());
    return {
      totalModules: modules.length,
      enabledModules: modules.filter(m => m.enabled).length,
      availableModules: modules.map(m => ({
        id: m.config.id,
        name: m.config.name,
        enabled: m.enabled
      }))
    };
  }

  getAllModules() {
    return Array.from(this.modules.values());
  }

  async enableModule(moduleId: string) {
    const module = this.modules.get(moduleId);
    if (module) {
      module.enabled = true;
    }
  }

  async disableModule(moduleId: string) {
    const module = this.modules.get(moduleId);
    if (module) {
      module.enabled = false;
    }
  }

  async getModuleFeatures(moduleId: string) {
    const module = this.modules.get(moduleId);
    return module?.config.features || [];
  }

  async healthCheck() {
    const modules = Array.from(this.modules.values());
    return {
      status: "healthy",
      modules: modules.map(m => ({
        id: m.config.id,
        status: m.enabled ? "active" : "disabled"
      }))
    };
  }
}