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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Crown, 
  Rocket, 
  Zap, 
  MapPin, 
  Target, 
  Calendar, 
  Star,
  Globe,
  TrendingUp,
  CheckCircle,
  Gift,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BusinessSubscriptionTabProps {
  businessId: number;
}

interface BusinessSubscription {
  id: number;
  businessId: number;
  tier: "free" | "premium" | "enterprise";
  status: "trial" | "active" | "cancelled" | "expired";
  trialStartDate: string;
  trialEndDate: string;
  paidStartDate?: string;
  enabledModules: string[];
  adTargeting: "global" | "local" | "both";
  adPriority: number;
  locationCoordinates: {
    lat?: number;
    lng?: number;
    city?: string;
    suburb?: string;
  };
  maxAdsPerMonth: number;
  features: Record<string, boolean>;
}

const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free Tier",
    icon: Gift,
    color: "bg-gray-500",
    price: "Free",
    features: [
      "1 Module (Salon OR Restaurant OR Event)",
      "Global ad visibility only",
      "5 ads per month",
      "Basic analytics",
      "Standard support"
    ],
    adPriority: 1,
    maxAds: 5,
    targeting: "global" as const
  },
  premium: {
    name: "Premium",
    icon: Star,
    color: "bg-blue-500", 
    price: "$29/month (180 Days FREE)",
    features: [
      "Up to 3 modules",
      "Local + Global ad targeting",
      "25 ads per month",
      "Priority ad placement",
      "Advanced analytics",
      "Location-based targeting",
      "Priority support"
    ],
    adPriority: 8,
    maxAds: 25,
    targeting: "both" as const
  },
  enterprise: {
    name: "Enterprise",
    icon: Crown,
    color: "bg-purple-500",
    price: "Express Interest",
    features: [
      "ALL modules included",
      "Premium ad placement",
      "Unlimited ads",
      "AI-powered targeting",
      "Custom analytics dashboard",
      "Dedicated account manager",
      "24/7 priority support",
      "White-label solutions"
    ],
    adPriority: 12,
    maxAds: 999,
    targeting: "both" as const
  }
};

const AVAILABLE_MODULES = [
  { id: "salon", name: "Salon & Spa", icon: "✨" },
  { id: "restaurant", name: "Restaurant & Cafés", icon: "🍽️" },
  { id: "event", name: "Event Management", icon: "🎉" },
  { id: "realestate", name: "Real Estate", icon: "🏠" },
  { id: "retail", name: "Retail Stores", icon: "🛍️" },
  { id: "professional", name: "Professional Services", icon: "⚖️" }
];

export function BusinessSubscriptionTab({ businessId }: BusinessSubscriptionTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<"free" | "premium" | "enterprise">("free");

  // Get business info to determine industry type
  const { data: business } = useQuery({
    queryKey: [`/api/businesses/${businessId}/profile`],
    queryFn: async () => {
      const response = await fetch(`/api/businesses/${businessId}/profile`);
      return response.json();
    },
    enabled: !!businessId,
  });

  // Get current subscription
  const { data: subscription, isLoading } = useQuery<BusinessSubscription>({
    queryKey: [`/api/businesses/${businessId}/subscription`],
    queryFn: async () => {
      const response = await fetch(`/api/businesses/${businessId}/subscription`);
      if (!response.ok) {
        // Create default trial subscription if none exists  
        const businessType = business?.industryType || "restaurant";
        const defaultSub = {
          businessId,
          tier: "premium",
          status: "trial", 
          trialStartDate: new Date().toISOString(),
          trialEndDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days
          enabledModules: [businessType], // Enable their business industry module
          adTargeting: "both",
          adPriority: 3,
          locationCoordinates: {},
          maxAdsPerMonth: 25,
          features: {
            multiModule: true,
            localTargeting: true,
            prioritySupport: true,
            advancedAnalytics: true
          }
        };
        return defaultSub;
      }
      return response.json();
    },
    enabled: !!businessId,
  });

  // Update subscription mutation
  const updateSubscription = useMutation({
    mutationFn: async (updates: Partial<BusinessSubscription>) => {
      const response = await fetch(`/api/businesses/${businessId}/subscription`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/subscription`] });
      toast({
        title: "Success",
        description: "Subscription updated successfully!",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update subscription",
      });
    },
  });

  const calculateTrialDaysLeft = () => {
    if (!subscription?.trialEndDate) return 0;
    const endDate = new Date(subscription.trialEndDate);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const handleTierChange = (newTier: "free" | "premium" | "enterprise") => {
    const tierConfig = SUBSCRIPTION_TIERS[newTier];
    updateSubscription.mutate({
      tier: newTier,
      adTargeting: tierConfig.targeting,
      adPriority: tierConfig.adPriority,
      maxAdsPerMonth: tierConfig.maxAds,
    });
  };

  const handleModuleToggle = (moduleId: string, enabled: boolean) => {
    if (!subscription) return;
    
    const currentModules = subscription.enabledModules || [];
    const newModules = enabled 
      ? [...currentModules, moduleId].filter((v, i, arr) => arr.indexOf(v) === i)
      : currentModules.filter(m => m !== moduleId);

    // Enforce tier limits
    const tierConfig = SUBSCRIPTION_TIERS[subscription.tier];
    let allowedModules = newModules;
    
    if (subscription.tier === "free" && newModules.length > 1) {
      allowedModules = newModules.slice(0, 1);
      toast({
        variant: "destructive",
        title: "Free Tier Limit",
        description: "Free tier allows only 1 module. Upgrade to Premium for more!",
      });
    } else if (subscription.tier === "premium" && newModules.length > 3) {
      allowedModules = newModules.slice(0, 3);
      toast({
        variant: "destructive", 
        title: "Premium Tier Limit",
        description: "Premium tier allows up to 3 modules. Upgrade to Enterprise for unlimited!",
      });
    }

    updateSubscription.mutate({
      enabledModules: allowedModules,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  const trialDaysLeft = calculateTrialDaysLeft();
  const currentTier = subscription?.tier || "free";
  const tierConfig = SUBSCRIPTION_TIERS[currentTier];

  return (
    <div className="space-y-6">
      {/* Trial Status Banner */}
      <Card className="border-l-4 border-l-green-500 bg-green-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle className="text-green-800">🎉 180-Day FREE Trial Active!</CardTitle>
                <CardDescription className="text-green-700">
                  All tiers free during startup phase • No billing required
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-green-600 text-white">
              <Clock className="h-3 w-3 mr-1" />
              {trialDaysLeft} days left
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={(180 - trialDaysLeft) / 180 * 100} className="mb-2" />
          <p className="text-sm text-green-700">
            Enjoy all premium features free! Perfect time to grow your business with DesiBazaar.
          </p>
        </CardContent>
      </Card>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${tierConfig.color} text-white`}>
                <tierConfig.icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Current Plan: {tierConfig.name}</CardTitle>
                <CardDescription>
                  {tierConfig.price} • Ad Priority: {subscription?.adPriority}/12
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {subscription?.maxAdsPerMonth} ads/month
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Tier Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(SUBSCRIPTION_TIERS).map(([tier, config]) => (
          <Card 
            key={tier}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              currentTier === tier ? 'ring-2 ring-primary shadow-lg' : ''
            }`}
            onClick={() => setSelectedTier(tier as any)}
          >
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <div className={`p-3 rounded-lg ${config.color} text-white`}>
                  <config.icon className="h-6 w-6" />
                </div>
              </div>
              <CardTitle className="text-lg">{config.name}</CardTitle>
              <CardDescription className="text-2xl font-bold text-primary">
                {config.price}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {config.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {currentTier !== tier && (
                <Button 
                  className="w-full mt-4" 
                  variant={tier === "free" ? "outline" : "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTierChange(tier as any);
                  }}
                  disabled={updateSubscription.isPending}
                >
                  {tier === "free" ? "Downgrade" : "Upgrade"} to {config.name}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Enabled Business Modules
          </CardTitle>
          <CardDescription>
            Choose which business modules to activate. 
            {currentTier === "free" && " (Free tier: 1 module only)"}
            {currentTier === "premium" && " (Premium tier: up to 3 modules)"}
            {currentTier === "enterprise" && " (Enterprise tier: unlimited modules)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AVAILABLE_MODULES.map((module) => {
              const isEnabled = subscription?.enabledModules?.includes(module.id) || false;
              const canToggle = currentTier === "enterprise" || 
                              (currentTier === "premium" && (isEnabled || (subscription?.enabledModules?.length || 0) < 3)) ||
                              (currentTier === "free" && (isEnabled || (subscription?.enabledModules?.length || 0) < 1));
              
              return (
                <Card key={module.id} className={`${isEnabled ? 'bg-primary/5 border-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{module.icon}</span>
                        <div>
                          <div className="font-medium">{module.name}</div>
                          <div className="text-xs text-muted-foreground">{module.id}</div>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleModuleToggle(module.id, checked)}
                        disabled={!canToggle || updateSubscription.isPending}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ad Targeting Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Smart Ad Targeting
          </CardTitle>
          <CardDescription>
            Configure how your business appears in location-aware advertisements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ad Targeting Scope</label>
              <Select 
                value={subscription?.adTargeting || "global"} 
                onValueChange={(value: "global" | "local" | "both") => 
                  updateSubscription.mutate({ adTargeting: value })
                }
                disabled={currentTier === "free"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Global (All users)
                    </div>
                  </SelectItem>
                  <SelectItem value="local" disabled={currentTier === "free"}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Local Only (25km radius)
                    </div>
                  </SelectItem>
                  <SelectItem value="both" disabled={currentTier === "free"}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Both (Premium reach)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {currentTier === "free" && (
                <p className="text-xs text-muted-foreground">
                  Upgrade to Premium for local targeting
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Ad Priority Level</label>
              <div className="flex items-center gap-2">
                <Progress value={(subscription?.adPriority || 1) / 12 * 100} className="flex-1" />
                <Badge variant="outline">{subscription?.adPriority || 1}/12</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Higher priority = better ad placement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}