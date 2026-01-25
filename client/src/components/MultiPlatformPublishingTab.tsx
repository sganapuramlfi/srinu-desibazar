import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Truck,
  Calendar,
  UtensilsCrossed,
  Settings,
  Zap,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MultiPlatformPublishingTabProps {
  businessId: number;
}

interface PlatformIntegration {
  id: string;
  name: string;
  type: 'delivery' | 'reservation' | 'pos';
  logo: string;
  isConnected: boolean;
  isActive: boolean;
  features: string[];
  commission: number;
  monthlyOrders?: number;
  revenue?: number;
  lastSync?: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
}

interface SyncStats {
  totalMenuItems: number;
  lastMenuSync: string;
  totalTables: number;
  lastTableSync: string;
  totalPromotions: number;
  lastPromotionSync: string;
}

export function MultiPlatformPublishingTab({ businessId }: MultiPlatformPublishingTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformIntegration | null>(null);

  // Mock data for platform integrations
  const platforms: PlatformIntegration[] = [
    {
      id: 'ubereats',
      name: 'Uber Eats',
      type: 'delivery',
      logo: '🚗',
      isConnected: true,
      isActive: true,
      features: ['Menu Sync', 'Order Management', 'Real-time Updates'],
      commission: 15,
      monthlyOrders: 342,
      revenue: 8650,
      lastSync: '2 minutes ago',
      status: 'connected'
    },
    {
      id: 'doordash',
      name: 'DoorDash',
      type: 'delivery',
      logo: '🏠',
      isConnected: true,
      isActive: true,
      features: ['Menu Sync', 'Promotions', 'Analytics'],
      commission: 18,
      monthlyOrders: 287,
      revenue: 7240,
      lastSync: '5 minutes ago',
      status: 'connected'
    },
    {
      id: 'grubhub',
      name: 'Grubhub',
      type: 'delivery',
      logo: '🍔',
      isConnected: false,
      isActive: false,
      features: ['Menu Sync', 'Order Management'],
      commission: 20,
      status: 'disconnected'
    },
    {
      id: 'opentable',
      name: 'OpenTable',
      type: 'reservation',
      logo: '🍽️',
      isConnected: true,
      isActive: true,
      features: ['Table Sync', 'Reservation Management', 'Customer Reviews'],
      commission: 5,
      monthlyOrders: 156,
      revenue: 3900,
      lastSync: '1 hour ago',
      status: 'connected'
    },
    {
      id: 'resy',
      name: 'Resy',
      type: 'reservation',
      logo: '📅',
      isConnected: false,
      isActive: false,
      features: ['Reservation Sync', 'Waitlist Management'],
      commission: 8,
      status: 'disconnected'
    },
    {
      id: 'square',
      name: 'Square POS',
      type: 'pos',
      logo: '💳',
      isConnected: true,
      isActive: true,
      features: ['Menu Sync', 'Inventory', 'Sales Analytics'],
      commission: 3,
      lastSync: '30 minutes ago',
      status: 'connected'
    }
  ];

  const syncStats: SyncStats = {
    totalMenuItems: 24,
    lastMenuSync: '2 minutes ago',
    totalTables: 8,
    lastTableSync: '1 hour ago',
    totalPromotions: 3,
    lastPromotionSync: '15 minutes ago'
  };

  const connectedPlatforms = platforms.filter(p => p.isConnected);
  const totalMonthlyRevenue = connectedPlatforms.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const totalMonthlyOrders = connectedPlatforms.reduce((sum, p) => sum + (p.monthlyOrders || 0), 0);

  const handleTogglePlatform = (platformId: string, isActive: boolean) => {
    toast({
      title: isActive ? "Platform Activated" : "Platform Deactivated",
      description: `${platforms.find(p => p.id === platformId)?.name} ${isActive ? 'is now receiving' : 'stopped receiving'} updates.`
    });
  };

  const handleConnectPlatform = (platform: PlatformIntegration) => {
    toast({
      title: "Connecting to " + platform.name,
      description: "Opening integration setup...",
    });
  };

  const handleSyncNow = (platformId: string) => {
    toast({
      title: "Syncing Data",
      description: "Menu, tables, and promotions are being synchronized...",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'syncing': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />;
      case 'syncing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connected Platforms</p>
                <p className="text-2xl font-bold">{connectedPlatforms.length}</p>
              </div>
              <ExternalLink className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">${totalMonthlyRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Orders</p>
                <p className="text-2xl font-bold">{totalMonthlyOrders.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Commission</p>
                <p className="text-2xl font-bold">
                  {Math.round(connectedPlatforms.reduce((sum, p) => sum + p.commission, 0) / connectedPlatforms.length)}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Platform Integrations
          </CardTitle>
          <CardDescription>
            Connect once, publish everywhere. Update your menu, tables, and promotions across all platforms simultaneously.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Monthly Performance</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platforms.map((platform) => (
                <TableRow key={platform.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{platform.logo}</span>
                      <div>
                        <div className="font-medium">{platform.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {platform.features.slice(0, 2).join(', ')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {platform.type === 'delivery' && <Truck className="h-3 w-3 mr-1" />}
                      {platform.type === 'reservation' && <Calendar className="h-3 w-3 mr-1" />}
                      {platform.type === 'pos' && <UtensilsCrossed className="h-3 w-3 mr-1" />}
                      {platform.type}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={getStatusColor(platform.status)}>
                        {getStatusIcon(platform.status)}
                      </div>
                      <span className={`text-sm ${getStatusColor(platform.status)}`}>
                        {platform.status}
                      </span>
                    </div>
                    {platform.lastSync && (
                      <div className="text-xs text-muted-foreground">
                        Last sync: {platform.lastSync}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {platform.isConnected ? (
                      <div>
                        <div className="font-medium">{platform.monthlyOrders || 0} orders</div>
                        <div className="text-sm text-muted-foreground">
                          ${(platform.revenue || 0).toLocaleString()} revenue
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not connected</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <span className="font-medium">{platform.commission}%</span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {platform.isConnected ? (
                        <>
                          <Switch
                            checked={platform.isActive}
                            onCheckedChange={(checked) => handleTogglePlatform(platform.id, checked)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncNow(platform.id)}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPlatform(platform)}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnectPlatform(platform)}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sync Status */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sync Status
            </CardTitle>
            <CardDescription>
              Real-time synchronization across all connected platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4" />
                  <span>Menu Items</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{syncStats.totalMenuItems} items</div>
                  <div className="text-sm text-muted-foreground">
                    Last sync: {syncStats.lastMenuSync}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Tables & Reservations</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{syncStats.totalTables} tables</div>
                  <div className="text-sm text-muted-foreground">
                    Last sync: {syncStats.lastTableSync}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Promotions & Offers</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{syncStats.totalPromotions} active</div>
                  <div className="text-sm text-muted-foreground">
                    Last sync: {syncStats.lastPromotionSync}
                  </div>
                </div>
              </div>
            </div>
            
            <Button className="w-full mt-4" onClick={() => handleSyncNow('all')}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync All Platforms Now
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
            <CardDescription>Platform comparison and optimization tips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Best Performer</span>
                </div>
                <p className="text-sm text-green-700">
                  Uber Eats: 342 orders, $8,650 revenue (15% commission)
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Growing Platform</span>
                </div>
                <p className="text-sm text-blue-700">
                  DoorDash: +23% orders this month, consider promotion boost
                </p>
              </div>
              
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800">Optimization Tip</span>
                </div>
                <p className="text-sm text-orange-700">
                  Connect to Grubhub to increase delivery coverage by 30%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Benefits Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Zap className="h-5 w-5" />
            Why Multi-Platform Publishing Matters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm"><strong>One Update, Everywhere:</strong> Change menu once, update all platforms</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm"><strong>Maximize Reach:</strong> Be available where your customers are</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm"><strong>Save Time:</strong> No more manual updates across 10+ systems</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm"><strong>Real-time Sync:</strong> Inventory and availability always accurate</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm"><strong>Unified Analytics:</strong> See all performance data in one place</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm"><strong>Increase Revenue:</strong> Multi-platform presence = more orders</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Settings Dialog */}
      {selectedPlatform && (
        <Dialog open={!!selectedPlatform} onOpenChange={() => setSelectedPlatform(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{selectedPlatform.logo}</span>
                {selectedPlatform.name} Settings
              </DialogTitle>
              <DialogDescription>
                Configure how your restaurant data syncs with {selectedPlatform.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Sync Features</h4>
                {selectedPlatform.features.map((feature, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{feature}</span>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Performance This Month</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Orders:</span>
                    <span className="font-medium ml-2">{selectedPlatform.monthlyOrders || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Revenue:</span>
                    <span className="font-medium ml-2">${(selectedPlatform.revenue || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPlatform(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast({ title: "Settings Updated", description: `${selectedPlatform.name} settings saved successfully.` });
                setSelectedPlatform(null);
              }}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}