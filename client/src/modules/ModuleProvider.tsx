import React, { createContext, useContext, useEffect, useState } from 'react';
import { ModuleRegistry } from '../../../modules/core/ModuleRegistry';
import { BaseModule, IndustryType } from '../../../modules/core/types';

interface ModuleContextType {
  registry: ModuleRegistry;
  enabledModules: BaseModule[];
  isModuleEnabled: (moduleId: string) => boolean;
  getModulesByIndustry: (industry: IndustryType) => BaseModule[];
  loading: boolean;
  error: string | null;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const [registry] = useState(() => ModuleRegistry.getInstance());
  const [enabledModules, setEnabledModules] = useState<BaseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch module configuration from server
      const response = await fetch('/api/admin/modules/status');
      if (!response.ok) {
        throw new Error('Failed to fetch module status');
      }

      const moduleStatus = await response.json();
      
      // Load enabled modules
      for (const moduleInfo of moduleStatus.modules) {
        if (moduleInfo.enabled) {
          try {
            // Dynamic import of module components
            const moduleComponents = await import(`./components/${moduleInfo.id}/index.js`);
            
            // Create module definition with components
            const moduleDefinition: BaseModule = {
              config: {
                id: moduleInfo.id,
                name: moduleInfo.name,
                version: moduleInfo.version,
                enabled: moduleInfo.enabled,
                industry: moduleInfo.industry,
                features: moduleInfo.features,
                dependencies: moduleInfo.dependencies
              },
              components: moduleComponents.components || [],
              routes: moduleComponents.routes || []
            };

            await registry.registerModule(moduleDefinition);
          } catch (importError) {
            console.warn(`Failed to load components for module ${moduleInfo.id}:`, importError);
            
            // Register module without components
            const basicModule: BaseModule = {
              config: {
                id: moduleInfo.id,
                name: moduleInfo.name,
                version: moduleInfo.version,
                enabled: moduleInfo.enabled,
                industry: moduleInfo.industry,
                features: moduleInfo.features,
                dependencies: moduleInfo.dependencies
              }
            };

            await registry.registerModule(basicModule);
          }
        }
      }

      setEnabledModules(registry.getEnabledModules());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load modules';
      setError(errorMessage);
      console.error('Module loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const value: ModuleContextType = {
    registry,
    enabledModules,
    isModuleEnabled: (moduleId: string) => registry.isModuleEnabled(moduleId),
    getModulesByIndustry: (industry: IndustryType) => registry.getModulesByIndustry(industry),
    loading,
    error
  };

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModules() {
  const context = useContext(ModuleContext);
  if (context === undefined) {
    throw new Error('useModules must be used within a ModuleProvider');
  }
  return context;
}

// Hook to get specific module
export function useModule(moduleId: string) {
  const { registry } = useModules();
  return registry.getModule(moduleId);
}

// Hook to check if module is enabled
export function useModuleEnabled(moduleId: string) {
  const { isModuleEnabled } = useModules();
  return isModuleEnabled(moduleId);
}

// Hook to get modules by industry
export function useIndustryModules(industry: IndustryType) {
  const { getModulesByIndustry } = useModules();
  return getModulesByIndustry(industry);
}