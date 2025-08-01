import React, { createContext, useContext, useEffect, useState } from 'react';
import { ClientModuleRegistry, BaseModule, IndustryType } from './ClientModuleRegistry';

interface ModuleContextType {
  registry: ClientModuleRegistry;
  enabledModules: BaseModule[];
  isModuleEnabled: (moduleId: string) => boolean;
  getModulesByIndustry: (industry: IndustryType) => BaseModule[];
  loading: boolean;
  error: string | null;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const [registry] = useState(() => ClientModuleRegistry.getInstance());
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

      // Clear existing modules
      registry.clear();

      // Fetch module configuration from server
      const response = await fetch('/api/admin/modules/status');
      if (!response.ok) {
        // If admin endpoint fails, try to get basic module info from public endpoint
        const publicResponse = await fetch('/api/modular/registration/industries');
        if (publicResponse.ok) {
          const industriesData = await publicResponse.json();
          
          // Register modules based on available industries
          for (const industry of industriesData.industries) {
            const moduleDefinition: BaseModule = {
              config: {
                id: industry.id,
                name: industry.name,
                version: '1.0.0',
                enabled: industry.isAvailable,
                industry: industry.id,
                features: industry.features || [],
                dependencies: []
              }
            };
            await registry.registerModule(moduleDefinition);
          }
          
          setEnabledModules(registry.getEnabledModules());
          return;
        }
        
        throw new Error('Failed to fetch module status');
      }

      const moduleStatus = await response.json();
      
      // Load all modules (not just enabled ones)
      for (const moduleInfo of moduleStatus.modules || []) {
        try {
          // Skip dynamic component imports for now - components are optional
          let moduleComponents = {};
          
          // Create module definition
          const moduleDefinition: BaseModule = {
            config: {
              id: moduleInfo.id,
              name: moduleInfo.name,
              version: moduleInfo.version,
              enabled: moduleInfo.enabled,
              industry: moduleInfo.industry,
              features: moduleInfo.features || [],
              dependencies: moduleInfo.dependencies || []
            },
            components: moduleComponents.components || [],
            routes: moduleComponents.routes || []
          };

          await registry.registerModule(moduleDefinition);
        } catch (error) {
          console.warn(`Failed to register module ${moduleInfo.id}:`, error);
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