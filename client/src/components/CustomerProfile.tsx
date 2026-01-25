import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { 
  User, 
  Phone, 
  Mail, 
  Bell, 
  Heart, 
  MapPin, 
  Lock, 
  Save,
  CheckCircle,
  AlertCircle,
  Settings
} from "lucide-react";

// Schema for profile form
const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional(),
});

// Schema for password change form
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

// Available categories for preferences
const CATEGORIES = [
  "salon", "restaurant", "healthcare", "fitness", "automotive", 
  "education", "entertainment", "shopping", "professional_services", "beauty"
];

const LOCATIONS = [
  "Melbourne CBD", "Richmond", "Fitzroy", "South Yarra", "St Kilda",
  "Brunswick", "Carlton", "Docklands", "Southbank", "Toorak"
];

export default function CustomerProfile() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("personal");

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      phone: user?.phone || "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update form defaults when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || "",
        phone: user.phone || "",
      });
    }
  }, [user, profileForm]);

  // Fetch user preferences
  const { data: preferencesData } = useQuery({
    queryKey: ['/api/simple/profile/preferences'],
    queryFn: async () => {
      const response = await fetch('/api/simple/profile/preferences', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch preferences');
      return response.json();
    },
    enabled: !!user,
  });

  const [preferences, setPreferences] = useState({
    favoriteCategories: [] as string[],
    preferredLocations: [] as string[],
    bookingReminders: true,
    marketingEmails: false,
    smsNotifications: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    bookingConfirmations: true,
    bookingReminders: true,
    promotionalEmails: false,
    smsNotifications: true,
    pushNotifications: true,
  });

  // Update local state when preferences are fetched
  useEffect(() => {
    if (preferencesData) {
      // Merge with defaults to ensure all properties exist
      setPreferences({
        favoriteCategories: preferencesData.preferences?.favoriteCategories || [],
        preferredLocations: preferencesData.preferences?.preferredLocations || [],
        bookingReminders: preferencesData.preferences?.bookingReminders ?? true,
        marketingEmails: preferencesData.preferences?.marketingEmails ?? false,
        smsNotifications: preferencesData.preferences?.smsNotifications ?? true,
      });
      
      setNotificationSettings({
        bookingConfirmations: preferencesData.notificationSettings?.bookingConfirmations ?? true,
        bookingReminders: preferencesData.notificationSettings?.bookingReminders ?? true,
        promotionalEmails: preferencesData.notificationSettings?.promotionalEmails ?? false,
        smsNotifications: preferencesData.notificationSettings?.smsNotifications ?? true,
        pushNotifications: preferencesData.notificationSettings?.pushNotifications ?? true,
      });
    }
  }, [preferencesData]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await fetch('/api/simple/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: { preferences: any; notifications: any }) => {
      const response = await fetch('/api/simple/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update preferences');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/simple/profile/preferences'] });
      toast({
        title: "Preferences Updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const response = await fetch('/api/simple/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }
      return response.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Password Change Failed",
        description: error.message,
      });
    },
  });

  const handleProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handlePasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  const handlePreferencesUpdate = () => {
    updatePreferencesMutation.mutate({
      preferences,
      notifications: notificationSettings,
    });
  };

  const toggleCategory = (category: string) => {
    setPreferences(prev => ({
      ...prev,
      favoriteCategories: prev.favoriteCategories.includes(category)
        ? prev.favoriteCategories.filter(c => c !== category)
        : [...prev.favoriteCategories, category]
    }));
  };

  const toggleLocation = (location: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredLocations: prev.preferredLocations.includes(location)
        ? prev.preferredLocations.filter(l => l !== location)
        : [...prev.preferredLocations, location]
    }));
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Please log in to view your profile.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{user.fullName || "Customer Profile"}</CardTitle>
              <div className="flex items-center gap-2">
                <CardDescription className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </CardDescription>
                {user.isEmailVerified && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                  <FormField
                    control={profileForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <Input placeholder="+61 4XX XXX XXX" {...field} />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Optional: Used for booking confirmations and important updates.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Your Preferences</CardTitle>
              <CardDescription>
                Set your favorite categories and locations to get better recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Favorite Categories */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Favorite Categories</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CATEGORIES.map((category) => (
                    <Button
                      key={category}
                      variant={preferences.favoriteCategories.includes(category) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleCategory(category)}
                      className="justify-start"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Preferred Locations */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Preferred Locations</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {LOCATIONS.map((location) => (
                    <Button
                      key={location}
                      variant={preferences.preferredLocations.includes(location) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleLocation(location)}
                      className="justify-start"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      {location}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handlePreferencesUpdate}
                  disabled={updatePreferencesMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updatePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Control how and when you receive notifications from us.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Booking Confirmations</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when your bookings are confirmed
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.bookingConfirmations}
                    onCheckedChange={(checked) =>
                      setNotificationSettings(prev => ({ ...prev, bookingConfirmations: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Booking Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive reminders before your appointments
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.bookingReminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings(prev => ({ ...prev, bookingReminders: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive important updates via SMS
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings(prev => ({ ...prev, smsNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Promotional Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Get deals and promotions from your favorite businesses
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.promotionalEmails}
                    onCheckedChange={(checked) =>
                      setNotificationSettings(prev => ({ ...prev, promotionalEmails: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive real-time updates in your browser
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings(prev => ({ ...prev, pushNotifications: checked }))
                    }
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handlePreferencesUpdate}
                  disabled={updatePreferencesMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updatePreferencesMutation.isPending ? "Saving..." : "Save Notification Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and account security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Choose a strong password with at least 6 characters, including numbers and special characters.
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={changePasswordMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}