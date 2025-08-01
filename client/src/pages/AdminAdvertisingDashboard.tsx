import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Megaphone,
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Star,
  Zap,
  AlertCircle,
  Bell,
} from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: "news" | "promotion" | "feature" | "alert" | "maintenance";
  icon: string;
  color: string;
  scrollSpeed: number;
  displayDuration: number;
  isActive: boolean;
  priority: number;
  expiresAt: string;
  createdAt: string;
}

interface AdCampaign {
  id: number;
  businessId: number;
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
  priority: number;
  startDate: string;
  endDate: string;
  business: {
    name: string;
    industryType: string;
  };
}

const iconOptions = [
  { value: "Star", label: "Star", icon: Star },
  { value: "Zap", label: "Zap", icon: Zap },
  { value: "AlertCircle", label: "Alert", icon: AlertCircle },
  { value: "Bell", label: "Bell", icon: Bell },
  { value: "Megaphone", label: "Megaphone", icon: Megaphone },
];

const colorOptions = [
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
];

export default function AdminAdvertisingDashboard() {
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    type: "news" as const,
    icon: "Megaphone",
    color: "blue",
    scrollSpeed: 50,
    displayDuration: 8000,
    priority: 1,
    expiresAt: "",
  });

  const queryClient = useQueryClient();

  // Fetch announcements
  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ["/api/admin/announcements"],
    enabled: true,
  });

  // Fetch ad campaigns
  const { data: campaigns } = useQuery<AdCampaign[]>({
    queryKey: ["/api/admin/campaigns"],
    enabled: true,
  });

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcement: typeof newAnnouncement) => {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...announcement,
          expiresAt: new Date(announcement.expiresAt).toISOString(),
        }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      setIsCreateAnnouncementOpen(false);
      setNewAnnouncement({
        title: "",
        content: "",
        type: "news",
        icon: "Megaphone",
        color: "blue",
        scrollSpeed: 50,
        displayDuration: 8000,
        priority: 1,
        expiresAt: "",
      });
    },
  });

  // Toggle announcement active status
  const toggleAnnouncementMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to toggle announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
    },
  });

  // Stats calculations
  const totalRevenue = campaigns?.reduce((sum, c) => sum + Number(c.spent), 0) || 0;
  const totalClicks = campaigns?.reduce((sum, c) => sum + c.clicks, 0) || 0;
  const totalImpressions = campaigns?.reduce((sum, c) => sum + c.impressions, 0) || 0;
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";

  const handleCreateAnnouncement = () => {
    createAnnouncementMutation.mutate(newAnnouncement);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advertising Dashboard</h1>
          <p className="text-muted-foreground">
            Manage announcements, ad campaigns, and revenue analytics
          </p>
        </div>
        <Dialog open={isCreateAnnouncementOpen} onOpenChange={setIsCreateAnnouncementOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Announcement</DialogTitle>
              <DialogDescription>
                Create a new top banner announcement for all users
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newAnnouncement.title}
                  onChange={(e) =>
                    setNewAnnouncement({ ...newAnnouncement, title: e.target.value })
                  }
                  placeholder="Enter announcement title..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={newAnnouncement.content}
                  onChange={(e) =>
                    setNewAnnouncement({ ...newAnnouncement, content: e.target.value })
                  }
                  placeholder="Enter announcement content..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={newAnnouncement.type}
                    onValueChange={(value: any) =>
                      setNewAnnouncement({ ...newAnnouncement, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="news">News</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Icon</label>
                  <Select
                    value={newAnnouncement.icon}
                    onValueChange={(value) =>
                      setNewAnnouncement({ ...newAnnouncement, icon: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Color</label>
                  <Select
                    value={newAnnouncement.color}
                    onValueChange={(value) =>
                      setNewAnnouncement({ ...newAnnouncement, color: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${option.class}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={newAnnouncement.priority}
                    onChange={(e) =>
                      setNewAnnouncement({
                        ...newAnnouncement,
                        priority: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Duration (ms)</label>
                  <Input
                    type="number"
                    min="3000"
                    max="15000"
                    step="1000"
                    value={newAnnouncement.displayDuration}
                    onChange={(e) =>
                      setNewAnnouncement({
                        ...newAnnouncement,
                        displayDuration: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Expires At</label>
                <Input
                  type="datetime-local"
                  value={newAnnouncement.expiresAt}
                  onChange={(e) =>
                    setNewAnnouncement({ ...newAnnouncement, expiresAt: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateAnnouncementOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAnnouncement}
                disabled={createAnnouncementMutation.isPending}
              >
                {createAnnouncementMutation.isPending ? "Creating..." : "Create Announcement"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {campaigns?.length || 0} active campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all ad placements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total ad views
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg CTR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCTR}%</div>
            <p className="text-xs text-muted-foreground">
              Click-through rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="campaigns">Ad Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Banner Announcements</CardTitle>
              <CardDescription>
                Manage system-wide announcements displayed in the top banner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements?.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{announcement.title}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {announcement.content}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={announcement.type === 'promotion' ? 'default' : 'secondary'}>
                          {announcement.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={announcement.isActive ? 'default' : 'secondary'}>
                          {announcement.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{announcement.priority}</TableCell>
                      <TableCell>
                        {new Date(announcement.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleAnnouncementMutation.mutate({
                                id: announcement.id,
                                isActive: announcement.isActive,
                              })
                            }
                          >
                            {announcement.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Ad Campaigns</CardTitle>
              <CardDescription>
                Monitor and manage business advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns?.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{campaign.business.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {campaign.business.industryType}
                          </div>
                        </div>
                      </TableCell>
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
                      <TableCell>${campaign.budget}</TableCell>
                      <TableCell>${campaign.spent}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Revenue analytics chart will be implemented here
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Campaign performance chart will be implemented here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}