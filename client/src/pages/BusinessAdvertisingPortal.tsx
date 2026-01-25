import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  DollarSign,
  Eye,
  Users,
  TrendingUp,
  Play,
  Pause,
  Edit,
  Trash2,
  Target,
  Calendar,
  Megaphone,
} from "lucide-react";

interface Campaign {
  id: number;
  title: string;
  content: string;
  adType: string;
  size: string;
  animationType: string;
  budget: number;
  spent: number;
  clicks: number;
  impressions: number;
  status: string;
  startDate: string;
  endDate: string;
}

const adTypeOptions = [
  { value: "sidebar_left", label: "Left Sidebar", description: "Premium left-side placement" },
  { value: "sidebar_right", label: "Right Sidebar", description: "High-visibility right-side placement" },
];

const sizeOptions = [
  { value: "small", label: "Small", description: "Compact 150x200px", price: 0.01 },
  { value: "medium", label: "Medium", description: "Standard 200x300px", price: 0.02 },
  { value: "large", label: "Large", description: "Premium 250x400px", price: 0.03 },
  { value: "full", label: "Full", description: "Maximum 300x500px", price: 0.05 },
];

const animationOptions = [
  { value: "static", label: "Static", description: "No animation" },
  { value: "fade", label: "Fade", description: "Gentle fade effect" },
  { value: "slide", label: "Slide", description: "Smooth sliding animation" },
  { value: "flash", label: "Flash", description: "Attention-grabbing flash" },
  { value: "bounce", label: "Bounce", description: "Playful bounce effect" },
];

export default function BusinessAdvertisingPortal() {
  const { user } = useUser();
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    title: "",
    content: "",
    imageUrl: "",
    clickUrl: "",
    adType: "sidebar_left",
    size: "medium",
    animationType: "fade",
    budget: 100,
    startDate: "",
    endDate: "",
    targetingRules: {},
  });

  const queryClient = useQueryClient();

  // Fetch business campaigns
  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/business/campaigns"],
    enabled: !!user,
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: typeof newCampaign) => {
      const response = await fetch("/api/advertising/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...campaign,
          startDate: new Date(campaign.startDate).toISOString(),
          endDate: new Date(campaign.endDate).toISOString(),
        }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create campaign");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/campaigns"] });
      setIsCreateCampaignOpen(false);
      setNewCampaign({
        title: "",
        content: "",
        imageUrl: "",
        clickUrl: "",
        adType: "sidebar_left",
        size: "medium",
        animationType: "fade",
        budget: 100,
        startDate: "",
        endDate: "",
        targetingRules: {},
      });
    },
  });

  // Stats calculations
  const totalSpent = campaigns?.reduce((sum, c) => sum + Number(c.spent), 0) || 0;
  const totalClicks = campaigns?.reduce((sum, c) => sum + c.clicks, 0) || 0;
  const totalImpressions = campaigns?.reduce((sum, c) => sum + c.impressions, 0) || 0;
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";

  const handleCreateCampaign = () => {
    createCampaignMutation.mutate(newCampaign);
  };

  const getEstimatedCost = () => {
    const sizeOption = sizeOptions.find(s => s.value === newCampaign.size);
    const baseCost = sizeOption?.price || 0.02;
    const animationMultiplier = newCampaign.animationType === 'flash' ? 1.5 : 1;
    return (baseCost * animationMultiplier * 1000).toFixed(2); // Per 1000 impressions
  };

  if (!user || !user.primaryBusiness) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Business Account Required</h2>
            <p className="text-muted-foreground mb-6">
              You need a verified business account to access advertising features.
            </p>
            <Button onClick={() => window.location.href = "/auth"}>
              Login as Business
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advertising Portal</h1>
          <p className="text-muted-foreground">
            Grow your business with targeted advertising campaigns
          </p>
        </div>
        <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create New Ad Campaign</DialogTitle>
              <DialogDescription>
                Design and launch your advertising campaign to reach more customers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 max-h-[600px] overflow-y-auto">
              {/* Campaign Details */}
              <div className="space-y-4">
                <h3 className="font-semibold">Campaign Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium">Campaign Title</label>
                    <Input
                      value={newCampaign.title}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, title: e.target.value })
                      }
                      placeholder="e.g., Premium Hair Salon - Book Today!"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newCampaign.content}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, content: e.target.value })
                      }
                      placeholder="Describe your offer, highlight benefits..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Landing URL (Optional)</label>
                    <Input
                      value={newCampaign.clickUrl}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, clickUrl: e.target.value })
                      }
                      placeholder="/business/your-id or external URL"
                    />
                  </div>
                </div>
              </div>

              {/* Ad Placement */}
              <div className="space-y-4">
                <h3 className="font-semibold">Ad Placement & Design</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Placement</label>
                    <Select
                      value={newCampaign.adType}
                      onValueChange={(value) =>
                        setNewCampaign({ ...newCampaign, adType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {adTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {option.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Size</label>
                    <Select
                      value={newCampaign.size}
                      onValueChange={(value) =>
                        setNewCampaign({ ...newCampaign, size: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sizeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {option.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Animation Style</label>
                  <Select
                    value={newCampaign.animationType}
                    onValueChange={(value) =>
                      setNewCampaign({ ...newCampaign, animationType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {animationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Budget & Schedule */}
              <div className="space-y-4">
                <h3 className="font-semibold">Budget & Schedule</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Budget ($)</label>
                    <Input
                      type="number"
                      min="10"
                      step="10"
                      value={newCampaign.budget}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          budget: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={newCampaign.endDate}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span>Estimated Cost (per 1,000 impressions):</span>
                    <span className="font-semibold">${getEstimatedCost()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Based on selected size and animation. Final cost depends on actual impressions and clicks.
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateCampaignOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCampaign}
                disabled={createCampaignMutation.isPending}
              >
                {createCampaignMutation.isPending ? "Creating..." : "Launch Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across {campaigns?.length || 0} campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks}</div>
            <p className="text-xs text-muted-foreground">
              Customer interactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions}</div>
            <p className="text-xs text-muted-foreground">
              Times ads were shown
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCTR}%</div>
            <p className="text-xs text-muted-foreground">
              Average CTR
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Management */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Campaigns</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Active Campaigns</CardTitle>
              <CardDescription>
                Monitor and manage your current advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns && campaigns.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{campaign.title}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {campaign.content}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {campaign.adType} - {campaign.size}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>${campaign.spent} / ${campaign.budget}</div>
                            <div className="text-muted-foreground">
                              {((Number(campaign.spent) / campaign.budget) * 100).toFixed(0)}% used
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{campaign.clicks} clicks</div>
                            <div className="text-muted-foreground">
                              {campaign.impressions} impressions
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={campaign.status === 'active' ? 'default' : 'secondary'}
                          >
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Campaigns</h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first advertising campaign to start reaching more customers.
                  </p>
                  <Button onClick={() => setIsCreateCampaignOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Campaign
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Campaigns</CardTitle>
              <CardDescription>
                Review performance of past advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Completed campaigns will appear here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Campaign performance insights will be shown here
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Optimization Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">💡 Improve Click Rates</h4>
                    <p className="text-sm text-muted-foreground">
                      Use action words like "Book Now" or "Get 20% Off" in your campaign titles
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">🎯 Better Targeting</h4>
                    <p className="text-sm text-muted-foreground">
                      Schedule campaigns during peak hours (10 AM - 2 PM) for higher engagement
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">💰 Cost Optimization</h4>
                    <p className="text-sm text-muted-foreground">
                      Medium-sized ads with fade animation typically have the best cost-per-click ratio
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}