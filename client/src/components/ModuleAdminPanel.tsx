import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Activity, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface ModuleInfo {
  id: string;
  name: string;
  version: string;
  industry: string;
  enabled: boolean;
  features: string[];
  dependencies: string[];
}

interface ModuleStatus {
  total: number;
  enabled: number;
  disabled: number;
  modules: ModuleInfo[];
}

export function ModuleAdminPanel() {
  const [moduleStatus, setModuleStatus] = useState<ModuleStatus | null>(null);
  const [moduleHealth, setModuleHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    loadModuleData();
  }, []);

  const loadModuleData = async () => {
    try {
      setLoading(true);
      
      const [statusResponse, healthResponse] = await Promise.all([
        fetch('/api/admin/modules/status'),
        fetch('/api/admin/modules/health')
      ]);

      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setModuleStatus(status);
      }

      if (healthResponse.ok) {
        const health = await healthResponse.json();
        setModuleHealth(health);
      }
    } catch (error) {
      console.error('Failed to load module data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (moduleId: string, enabled: boolean) => {
    try {
      setToggling(moduleId);
      
      const response = await fetch(`/api/admin/modules/${moduleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        await loadModuleData(); // Refresh data
      } else {
        throw new Error('Failed to toggle module');
      }
    } catch (error) {
      console.error('Failed to toggle module:', error);
    } finally {
      setToggling(null);
    }
  };

  if (loading && !moduleStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading modules...</span>
      </div>
    );
  }

  const getIndustryColor = (industry: string) => {
    const colors = {
      salon: 'bg-pink-100 text-pink-800',
      restaurant: 'bg-orange-100 text-orange-800',
      realestate: 'bg-blue-100 text-blue-800',
      event: 'bg-purple-100 text-purple-800',
      retail: 'bg-green-100 text-green-800',
      professional: 'bg-gray-100 text-gray-800'
    };
    return colors[industry as keyof typeof colors] || colors.professional;
  };

  const getHealthStatus = (moduleId: string) => {
    if (!moduleHealth?.modules?.[moduleId]) return null;
    const health = moduleHealth.modules[moduleId];
    
    if (health.status === 'healthy') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (health.status === 'unhealthy') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Module Management</h1>
          <p className="text-gray-600">Manage pluggable industry modules</p>
        </div>
        <Button onClick={loadModuleData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {moduleStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{moduleStatus.total}</div>
              <p className="text-xs text-muted-foreground">
                Available industry modules
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enabled Modules</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{moduleStatus.enabled}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`text-2xl font-bold ${
                  moduleHealth?.status === 'healthy' ? 'text-green-600' : 
                  moduleHealth?.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {moduleHealth?.status === 'healthy' ? '✓' : 
                   moduleHealth?.status === 'degraded' ? '⚠' : '✗'}
                </div>
                <span className="capitalize">{moduleHealth?.status || 'Unknown'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Module Management Tabs */}
      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="health">Health Check</TabsTrigger>
        </TabsList>

        <TabsContent value="modules">
          <div className="grid gap-4">
            {moduleStatus?.modules.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {module.name}
                          {getHealthStatus(module.id)}
                          <Badge className={getIndustryColor(module.industry)}>
                            {module.industry}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          Module ID: {module.id} • Version: {module.version}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={module.enabled}
                        onCheckedChange={(enabled) => toggleModule(module.id, enabled)}
                        disabled={toggling === module.id}
                      />
                      {toggling === module.id && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Features */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Features</h4>
                      <div className="flex flex-wrap gap-1">
                        {module.features.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Dependencies */}
                    {module.dependencies.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Dependencies</h4>
                        <div className="flex flex-wrap gap-1">
                          {module.dependencies.map((dep) => (
                            <Badge key={dep} variant="secondary" className="text-xs">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Health Info */}
                    {moduleHealth?.modules?.[module.id] && (
                      <div className="text-xs text-gray-500 grid grid-cols-3 gap-2">
                        <span>Routes: {moduleHealth.modules[module.id].routes || 0}</span>
                        <span>Endpoints: {moduleHealth.modules[module.id].endpoints || 0}</span>
                        <span>Features: {moduleHealth.modules[module.id].features || 0}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>System Health Check</CardTitle>
            </CardHeader>
            <CardContent>
              {moduleHealth ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Overall Status:</span>
                    <Badge className={
                      moduleHealth.status === 'healthy' ? 'bg-green-100 text-green-800' :
                      moduleHealth.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {moduleHealth.status}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Last checked: {new Date(moduleHealth.timestamp).toLocaleString()}
                  </div>

                  <div className="grid gap-3">
                    {Object.entries(moduleHealth.modules).map(([moduleId, health]: [string, any]) => (
                      <div key={moduleId} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-2">
                          {health.status === 'healthy' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-medium">{moduleId}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {health.status === 'healthy' ? (
                            `${health.features} features, ${health.routes} routes, ${health.endpoints} endpoints`
                          ) : (
                            health.error
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>No health data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}