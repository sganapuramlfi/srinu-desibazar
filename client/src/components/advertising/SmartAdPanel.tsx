import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  TrendingUp,
  Target,
  Zap,
  DollarSign,
  Eye,
  Users,
  Clock,
  BarChart3,
  Sparkles,
} from "lucide-react";

interface SmartAdConfig {
  maxAdsPerSide: number;
  autoScrollEnabled: boolean;
  scrollInterval: number;
  categoryTargetingBoost: number;
  interestMatchingBoost: number;
  moduleSpecificBoost: number;
  premiumAnimationPreference: string;
  revenueOptimization: {
    prioritizePremium: boolean;
    minimumAdQuality: number;
    maxFreeAds: number;
  };
  sizeDistribution: {
    small: number;
    medium: number;
    large: number;
    full: number;
  };
}

interface AdPerformanceMetrics {
  totalRevenue: number;
  totalClicks: number;
  totalImpressions: number;
  avgCTR: number;
  topPerformingCategories: Array<{
    category: string;
    revenue: number;
    clicks: number;
  }>;
  adSizePerformance: Array<{
    size: string;
    revenue: number;
    ctr: number;
  }>;
}

const defaultConfig: SmartAdConfig = {
  maxAdsPerSide: 3,
  autoScrollEnabled: true,
  scrollInterval: 8000,
  categoryTargetingBoost: 2.0,
  interestMatchingBoost: 1.5,
  moduleSpecificBoost: 1.2,
  premiumAnimationPreference: 'flash',
  revenueOptimization: {
    prioritizePremium: true,
    minimumAdQuality: 3,
    maxFreeAds: 1,
  },
  sizeDistribution: {
    small: 20,
    medium: 40,
    large: 30,
    full: 10,
  }
};

export function SmartAdPanel() {
  const [config, setConfig] = useState<SmartAdConfig>(defaultConfig);
  const [activeTab, setActiveTab] = useState("settings");
  
  const queryClient = useQueryClient();

  // Fetch current configuration
  const { data: currentConfig } = useQuery<SmartAdConfig>({
    queryKey: ["/api/admin/smart-ad-config"],
    initialData: defaultConfig,
  });

  // Fetch performance metrics
  const { data: metrics } = useQuery<AdPerformanceMetrics>({
    queryKey: ["/api/admin/ad-performance"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: SmartAdConfig) => {
      const response = await fetch("/api/admin/smart-ad-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update configuration");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smart-ad-config"] });
    },
  });

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

  const handleConfigChange = (key: keyof SmartAdConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleNestedConfigChange = (
    parent: keyof SmartAdConfig,
    key: string,
    value: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [parent]: { ...prev[parent] as any, [key]: value }
    }));
  };

  const saveConfiguration = () => {
    updateConfigMutation.mutate(config);
  };

  const resetToDefaults = () => {
    setConfig(defaultConfig);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Smart Ad Revenue System
          </h2>
          <p className="text-muted-foreground">
            Intelligent ad placement and revenue optimization controls
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            Reset Defaults
          </Button>
          <Button 
            onClick={saveConfiguration}
            disabled={updateConfigMutation.isPending}
          >
            {updateConfigMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Smart Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                +15% from smart targeting
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Smart Clicks</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalClicks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +25% engagement boost
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Smart CTR</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgCTR}%</div>
              <p className="text-xs text-muted-foreground">
                Above industry average
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impressions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalImpressions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Smart targeting active
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Controls */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Smart Settings</TabsTrigger>
          <TabsTrigger value="targeting">Targeting Rules</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Optimization</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Display Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Ads Per Sidebar (2-5)</Label>
                  <Slider
                    value={[config.maxAdsPerSide]}
                    onValueChange={([value]) => handleConfigChange('maxAdsPerSide', value)}
                    min={2}
                    max={5}
                    step={1}
                    className="mt-2"
                  />
                  <div className="text-sm text-muted-foreground mt-1">
                    Current: {config.maxAdsPerSide} ads per side
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Auto-Scroll Ads</Label>
                  <Switch
                    checked={config.autoScrollEnabled}
                    onCheckedChange={(value) => handleConfigChange('autoScrollEnabled', value)}
                  />
                </div>

                {config.autoScrollEnabled && (
                  <div>
                    <Label>Scroll Interval (seconds)</Label>
                    <Slider
                      value={[config.scrollInterval / 1000]}
                      onValueChange={([value]) => handleConfigChange('scrollInterval', value * 1000)}
                      min={3}
                      max={15}
                      step={1}
                      className="mt-2"
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      Every {config.scrollInterval / 1000} seconds
                    </div>
                  </div>
                )}

                <div>
                  <Label>Premium Animation Style</Label>
                  <Select
                    value={config.premiumAnimationPreference}
                    onValueChange={(value) => handleConfigChange('premiumAnimationPreference', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">Static (Subtle)</SelectItem>
                      <SelectItem value="fade">Fade (Elegant)</SelectItem>
                      <SelectItem value="slide">Slide (Smooth)</SelectItem>
                      <SelectItem value="bounce">Bounce (Premium)</SelectItem>
                      <SelectItem value="flash">Flash (Attention-grabbing)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Size Distribution (%)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(config.sizeDistribution).map(([size, percentage]) => (
                  <div key={size}>
                    <Label className="capitalize">{size} Ads - {percentage}%</Label>
                    <Slider
                      value={[percentage]}
                      onValueChange={([value]) => 
                        handleNestedConfigChange('sizeDistribution', size, value)
                      }
                      min={0}
                      max={50}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                ))}
                <div className="text-sm text-muted-foreground">
                  Total: {Object.values(config.sizeDistribution).reduce((a, b) => a + b, 0)}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="targeting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Smart Targeting Multipliers
              </CardTitle>
              <CardDescription>
                Control how much to boost ads based on user behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Category Match Boost (1.0x - 5.0x)</Label>
                <Slider
                  value={[config.categoryTargetingBoost]}
                  onValueChange={([value]) => handleConfigChange('categoryTargetingBoost', value)}
                  min={1}
                  max={5}
                  step={0.1}
                  className="mt-2"
                />
                <div className="text-sm text-muted-foreground mt-1">
                  {config.categoryTargetingBoost}x boost for category-matched ads
                </div>
              </div>

              <div>
                <Label>Interest Matching Boost (1.0x - 3.0x)</Label>
                <Slider
                  value={[config.interestMatchingBoost]}
                  onValueChange={([value]) => handleConfigChange('interestMatchingBoost', value)}
                  min={1}
                  max={3}
                  step={0.1}
                  className="mt-2"
                />
                <div className="text-sm text-muted-foreground mt-1">
                  {config.interestMatchingBoost}x boost for interest-matched ads
                </div>
              </div>

              <div>
                <Label>Module-Specific Boost (1.0x - 2.0x)</Label>
                <Slider
                  value={[config.moduleSpecificBoost]}
                  onValueChange={([value]) => handleConfigChange('moduleSpecificBoost', value)}
                  min={1}
                  max={2}
                  step={0.1}
                  className="mt-2"
                />
                <div className="text-sm text-muted-foreground mt-1">
                  {config.moduleSpecificBoost}x boost for module-specific ads
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue Optimization
              </CardTitle>
              <CardDescription>
                Maximize ad revenue with smart pricing and placement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Prioritize Premium Ads</Label>
                  <p className="text-sm text-muted-foreground">
                    Show higher-paying ads first
                  </p>
                </div>
                <Switch
                  checked={config.revenueOptimization.prioritizePremium}
                  onCheckedChange={(value) => 
                    handleNestedConfigChange('revenueOptimization', 'prioritizePremium', value)
                  }
                />
              </div>

              <div>
                <Label>Minimum Ad Quality Score (1-5)</Label>
                <Slider
                  value={[config.revenueOptimization.minimumAdQuality]}
                  onValueChange={([value]) => 
                    handleNestedConfigChange('revenueOptimization', 'minimumAdQuality', value)
                  }
                  min={1}
                  max={5}
                  step={1}
                  className="mt-2"
                />
                <div className="text-sm text-muted-foreground mt-1">
                  Only show ads with quality score ≥ {config.revenueOptimization.minimumAdQuality}
                </div>
              </div>

              <div>
                <Label>Max Free Ads Per Side (0-2)</Label>
                <Slider
                  value={[config.revenueOptimization.maxFreeAds]}
                  onValueChange={([value]) => 
                    handleNestedConfigChange('revenueOptimization', 'maxFreeAds', value)
                  }
                  min={0}
                  max={2}
                  step={1}
                  className="mt-2"
                />
                <div className="text-sm text-muted-foreground mt-1">
                  Allow {config.revenueOptimization.maxFreeAds} free/promotional ads per sidebar
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.topPerformingCategories?.map((category, index) => (
                      <div key={category.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="capitalize">{category.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${category.revenue}</div>
                          <div className="text-xs text-muted-foreground">{category.clicks} clicks</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ad Size Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.adSizePerformance?.map((size) => (
                      <div key={size.size} className="flex items-center justify-between">
                        <div className="capitalize font-medium">{size.size}</div>
                        <div className="text-right">
                          <div className="font-semibold">${size.revenue}</div>
                          <div className="text-xs text-muted-foreground">{size.ctr}% CTR</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}