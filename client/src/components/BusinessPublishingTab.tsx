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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Globe, 
  Eye, 
  Share2, 
  Copy, 
  ExternalLink, 
  Upload,
  Clock,
  MapPin,
  Phone,
  Mail,
  Camera,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BusinessPublishingTabProps {
  businessId: number;
}

interface PublishingSettings {
  isPublished: boolean;
  showMenu: boolean;
  showPromotions: boolean;
  showReservations: boolean;
  showDelivery: boolean;
  allowOnlineOrdering: boolean;
  displayHours: boolean;
  displayContact: boolean;
  autoPublishPromotions: boolean;
  seoTitle?: string;
  seoDescription?: string;
  socialShareImage?: string;
}

interface BusinessStats {
  pageViews: number;
  totalBookings: number;
  conversionRate: number;
  averageRating: number;
  totalReviews: number;
}

export function BusinessPublishingTab({ businessId }: BusinessPublishingTabProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const publicUrl = `${window.location.origin}/business/${businessId}`;

  // Fetch publishing settings
  const { data: publishingSettings, isLoading: isLoadingSettings } = useQuery<PublishingSettings>({
    queryKey: [`/api/businesses/${businessId}/publishing-settings`],
    queryFn: async () => {
      // Default settings if API doesn't exist yet
      return {
        isPublished: true,
        showMenu: true,
        showPromotions: true,
        showReservations: true,
        showDelivery: true,
        allowOnlineOrdering: true,
        displayHours: true,
        displayContact: true,
        autoPublishPromotions: true,
      };
    },
    enabled: !!businessId,
  });

  // Fetch business stats
  const { data: stats } = useQuery<BusinessStats>({
    queryKey: [`/api/businesses/${businessId}/public-stats`],
    queryFn: async () => {
      // Mock data for now
      return {
        pageViews: 1247,
        totalBookings: 89,
        conversionRate: 7.2,
        averageRating: 4.8,
        totalReviews: 142,
      };
    },
    enabled: !!businessId,
  });

  // Update publishing settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<PublishingSettings>) => {
      // In real implementation, this would update the backend
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/publishing-settings`] });
      toast({ title: "Success", description: "Publishing settings updated" });
    },
  });

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopySuccess(true);
      toast({ title: "Success", description: "URL copied to clipboard!" });
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      toast({ title: "Error", description: "Failed to copy URL" });
    }
  };

  const handleToggleSetting = (key: keyof PublishingSettings, value: boolean) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  const generateSocialPost = () => {
    const messages = [
      `🍽️ Experience authentic Indian cuisine at Mumbai Spice Palace! Book your table now: ${publicUrl}`,
      `🌶️ Craving something spicy? Check out our menu and special offers: ${publicUrl}`,
      `✨ New promotions are live! Don't miss our happy hour deals: ${publicUrl}`,
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    navigator.clipboard.writeText(randomMessage);
    toast({ title: "Social post copied!", description: "Ready to share on your social media" });
  };

  if (isLoadingSettings) {
    return <div>Loading publishing settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Publishing Status */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Business Publishing
              </CardTitle>
              <CardDescription>Control how your restaurant appears to the public</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={publishingSettings?.isPublished}
                onCheckedChange={(checked) => handleToggleSetting('isPublished', checked)}
              />
              <Badge variant={publishingSettings?.isPublished ? "default" : "secondary"}>
                {publishingSettings?.isPublished ? "LIVE" : "DRAFT"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Your restaurant is live!</p>
                <p className="text-sm text-green-600">Customers can find and book with you</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Input value={publicUrl} readOnly className="flex-1" />
              <Button onClick={handleCopyUrl} variant="outline">
                {copySuccess ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button asChild variant="outline">
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="visibility" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visibility">Visibility</TabsTrigger>
          <TabsTrigger value="seo">SEO & Marketing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="social">Social Sharing</TabsTrigger>
        </TabsList>

        <TabsContent value="visibility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>What customers can see</CardTitle>
              <CardDescription>Control which features are visible on your public page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Menu & Pricing</Label>
                    <p className="text-sm text-muted-foreground">Show your full menu with prices</p>
                  </div>
                  <Switch
                    checked={publishingSettings?.showMenu}
                    onCheckedChange={(checked) => handleToggleSetting('showMenu', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active Promotions</Label>
                    <p className="text-sm text-muted-foreground">Display current deals and offers</p>
                  </div>
                  <Switch
                    checked={publishingSettings?.showPromotions}
                    onCheckedChange={(checked) => handleToggleSetting('showPromotions', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Table Reservations</Label>
                    <p className="text-sm text-muted-foreground">Allow customers to book tables</p>
                  </div>
                  <Switch
                    checked={publishingSettings?.showReservations}
                    onCheckedChange={(checked) => handleToggleSetting('showReservations', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Online Ordering</Label>
                    <p className="text-sm text-muted-foreground">Enable pickup and delivery orders</p>
                  </div>
                  <Switch
                    checked={publishingSettings?.allowOnlineOrdering}
                    onCheckedChange={(checked) => handleToggleSetting('allowOnlineOrdering', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Opening Hours</Label>
                    <p className="text-sm text-muted-foreground">Show your restaurant hours</p>
                  </div>
                  <Switch
                    checked={publishingSettings?.displayHours}
                    onCheckedChange={(checked) => handleToggleSetting('displayHours', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Contact Information</Label>
                    <p className="text-sm text-muted-foreground">Display phone and email</p>
                  </div>
                  <Switch
                    checked={publishingSettings?.displayContact}
                    onCheckedChange={(checked) => handleToggleSetting('displayContact', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Engine Optimization</CardTitle>
              <CardDescription>Improve your visibility in search results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seoTitle">Page Title</Label>
                <Input 
                  id="seoTitle" 
                  placeholder="Mumbai Spice Palace - Authentic Indian Restaurant in Melbourne"
                  defaultValue={publishingSettings?.seoTitle}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  This appears as the title in search results (60 characters recommended)
                </p>
              </div>
              
              <div>
                <Label htmlFor="seoDescription">Meta Description</Label>
                <Textarea 
                  id="seoDescription"
                  placeholder="Experience authentic Indian cuisine with modern twist. Book your table for an unforgettable dining experience in Melbourne CBD."
                  defaultValue={publishingSettings?.seoDescription}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  This appears in search result snippets (160 characters recommended)
                </p>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-blue-800">Auto-publish promotions</p>
                  <p className="text-sm text-blue-600">New promotions appear automatically on landing page</p>
                </div>
                <Switch
                  checked={publishingSettings?.autoPublishPromotions}
                  onCheckedChange={(checked) => handleToggleSetting('autoPublishPromotions', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Eye className="h-8 w-8 text-blue-600" />
                  <div className="text-right">
                    <p className="text-2xl font-bold">{stats?.pageViews?.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Page Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="text-right">
                    <p className="text-2xl font-bold">{stats?.totalBookings}</p>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <RefreshCw className="h-8 w-8 text-purple-600" />
                  <div className="text-right">
                    <p className="text-2xl font-bold">{stats?.conversionRate}%</p>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">⭐</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{stats?.averageRating}/5</p>
                    <p className="text-sm text-muted-foreground">{stats?.totalReviews} Reviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Mobile visitors</span>
                  <span className="font-medium">78%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Peak viewing hours</span>
                  <span className="font-medium">6:00 PM - 8:00 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Most viewed section</span>
                  <span className="font-medium">Menu (45%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average session duration</span>
                  <span className="font-medium">2m 34s</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Sharing</CardTitle>
              <CardDescription>Promote your restaurant on social platforms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={generateSocialPost} className="h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">Generate Social Post</p>
                    <p className="text-sm opacity-80">AI-powered promotional content</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">Share Menu Update</p>
                    <p className="text-sm text-muted-foreground">Announce new dishes</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">Promotion Alert</p>
                    <p className="text-sm text-muted-foreground">Share current deals</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">QR Code Menu</p>
                    <p className="text-sm text-muted-foreground">Download printable QR</p>
                  </div>
                </Button>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Quick Share Options</h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Facebook</Button>
                  <Button size="sm" variant="outline">Instagram</Button>
                  <Button size="sm" variant="outline">WhatsApp</Button>
                  <Button size="sm" variant="outline">Email</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}