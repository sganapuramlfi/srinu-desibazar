import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Wifi,
  Car,
  CreditCard,
  Coffee,
  Users,
  Accessibility,
  Volume2,
  Utensils,
  Camera,
  Scissors,
  Sparkles,
  Calendar,
  Copy,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Upload,
  ImagePlus,
  Trash2,
  Navigation,
  MapPin as MapPinIcon,
  Lock
} from "lucide-react";

interface SmartBusinessProfileTabProps {
  businessId: number;
}

const businessProfileSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  contactInfo: z.object({
    phone: z.string().min(10, "Please enter a valid phone number"),
    // Email is in the collapsed "Optional" section — allow empty string, only validate format when filled
    email: z.union([z.string().email("Please enter a valid email address"), z.literal("")]),
    address: z.string().min(5, "Please enter a complete address"),
  }),
  operatingHours: z.record(z.object({
    open: z.string(),
    close: z.string(),
    isOpen: z.boolean(),
  })),
  amenities: z.array(z.string()),
  socialMedia: z.object({
    website: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
  }),
  holidayPolicy: z.string().optional(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    manualLatitude: z.string().optional(),
    manualLongitude: z.string().optional(),
    detectedAddress: z.string().optional(),
  }).optional(),
});

type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;

// Smart presets for different business types
const OPERATING_HOURS_PRESETS = {
  "Standard Business": {
    monday: { open: "09:00", close: "17:00", isOpen: true },
    tuesday: { open: "09:00", close: "17:00", isOpen: true },
    wednesday: { open: "09:00", close: "17:00", isOpen: true },
    thursday: { open: "09:00", close: "17:00", isOpen: true },
    friday: { open: "09:00", close: "17:00", isOpen: true },
    saturday: { open: "10:00", close: "15:00", isOpen: true },
    sunday: { open: "10:00", close: "15:00", isOpen: false },
  },
  "Restaurant": {
    monday: { open: "11:00", close: "22:00", isOpen: true },
    tuesday: { open: "11:00", close: "22:00", isOpen: true },
    wednesday: { open: "11:00", close: "22:00", isOpen: true },
    thursday: { open: "11:00", close: "22:00", isOpen: true },
    friday: { open: "11:00", close: "23:00", isOpen: true },
    saturday: { open: "11:00", close: "23:00", isOpen: true },
    sunday: { open: "12:00", close: "21:00", isOpen: true },
  },
  "Salon & Spa": {
    monday: { open: "09:00", close: "18:00", isOpen: false },
    tuesday: { open: "09:00", close: "18:00", isOpen: true },
    wednesday: { open: "09:00", close: "18:00", isOpen: true },
    thursday: { open: "09:00", close: "20:00", isOpen: true },
    friday: { open: "09:00", close: "20:00", isOpen: true },
    saturday: { open: "08:00", close: "17:00", isOpen: true },
    sunday: { open: "10:00", close: "16:00", isOpen: true },
  },
  "Café": {
    monday: { open: "07:00", close: "17:00", isOpen: true },
    tuesday: { open: "07:00", close: "17:00", isOpen: true },
    wednesday: { open: "07:00", close: "17:00", isOpen: true },
    thursday: { open: "07:00", close: "17:00", isOpen: true },
    friday: { open: "07:00", close: "18:00", isOpen: true },
    saturday: { open: "08:00", close: "18:00", isOpen: true },
    sunday: { open: "08:00", close: "16:00", isOpen: true },
  }
};

// Industry-specific amenities with smart suggestions
const AMENITY_CATEGORIES = {
  restaurant: {
    "Essential": [
      { id: "card_payment", name: "Card Payment", icon: CreditCard },
      { id: "wifi", name: "Free Wi-Fi", icon: Wifi },
      { id: "parking", name: "Free Parking", icon: Car },
      { id: "takeaway", name: "Takeaway", icon: Utensils },
    ],
    "Dining Experience": [
      { id: "outdoor_seating", name: "Outdoor Seating", icon: Users },
      { id: "family_friendly", name: "Family Friendly", icon: Users },
      { id: "wheelchair_accessible", name: "Wheelchair Accessible", icon: Accessibility },
      { id: "live_music", name: "Live Music", icon: Volume2 },
    ]
  },
  salon: {
    "Essential": [
      { id: "card_payment", name: "Card Payment", icon: CreditCard },
      { id: "wifi", name: "Free Wi-Fi", icon: Wifi },
      { id: "parking", name: "Free Parking", icon: Car },
      { id: "appointment_booking", name: "Online Booking", icon: Calendar },
    ],
    "Services": [
      { id: "hair_styling", name: "Hair Styling", icon: Scissors },
      { id: "makeup", name: "Makeup Services", icon: Sparkles },
      { id: "photography", name: "Photography", icon: Camera },
      { id: "wheelchair_accessible", name: "Wheelchair Accessible", icon: Accessibility },
    ]
  },
  default: {
    "Essential": [
      { id: "card_payment", name: "Card Payment", icon: CreditCard },
      { id: "wifi", name: "Free Wi-Fi", icon: Wifi },
      { id: "parking", name: "Free Parking", icon: Car },
      { id: "wheelchair_accessible", name: "Wheelchair Accessible", icon: Accessibility },
    ]
  }
};

const HOLIDAY_POLICIES = [
  "Open regular hours on most holidays",
  "Closed on major holidays (Christmas, New Year)",
  "Reduced hours on holidays",
  "Check website/call for holiday hours",
  "Open 365 days a year"
];

export function SmartBusinessProfileTab({ businessId }: SmartBusinessProfileTabProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [completionProgress, setCompletionProgress] = useState(0);
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<File[]>([]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showLocationAdvanced, setShowLocationAdvanced] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: business, isLoading } = useQuery({
    queryKey: [`/api/businesses/${businessId}/profile`],
    queryFn: async () => {
      const response = await fetch(`/api/businesses/${businessId}/profile`);
      return response.json();
    },
    enabled: !!businessId,
  });

  // Get subscription info for feature gating
  const { data: subscription } = useQuery({
    queryKey: [`/api/businesses/${businessId}/subscription`],
    queryFn: async () => {
      const response = await fetch(`/api/businesses/${businessId}/subscription`);
      return response.json();
    },
    enabled: !!businessId,
  });

  const form = useForm<BusinessProfileFormData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      name: "",
      description: "",
      contactInfo: {
        phone: "",
        email: "",
        address: "",
      },
      operatingHours: OPERATING_HOURS_PRESETS["Standard Business"],
      amenities: [],
      socialMedia: {
        website: "",
        facebook: "",
        instagram: "",
      },
      holidayPolicy: HOLIDAY_POLICIES[1], // Default to "Closed on major holidays"
      location: {
        latitude: undefined,
        longitude: undefined,
        manualLatitude: "",
        manualLongitude: "",
        detectedAddress: "",
      },
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: BusinessProfileFormData) => {
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));

      // Add logo if selected
      if (selectedLogo) {
        formData.append("logo", selectedLogo);
      }

      // Add gallery images
      selectedGalleryImages.forEach((file, index) => {
        formData.append(`gallery`, file);
      });

      const response = await fetch(`/api/businesses/${businessId}/profile`, {
        method: 'PUT',
        body: formData,
        credentials: 'include'
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update profile');
      return result;
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully!" });
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/profile`] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update profile",
        description: error?.message || "Please try again or contact support."
      });
    },
  });

  // Load existing business data
  useEffect(() => {
    if (business) {
      const ci = (business.contactInfo as any) || {};
      const sm = (business.socialMedia as any) || {};
      const oh = business.operatingHours && Object.keys(business.operatingHours).length > 0
        ? business.operatingHours
        : OPERATING_HOURS_PRESETS["Standard Business"];

      form.reset({
        name: business.name || "",
        description: business.description || "",
        // Always provide string defaults — never undefined — so RHF keeps inputs controlled
        contactInfo: {
          phone: ci.phone || "",
          email: ci.email || "",
          address: ci.address || "",
        },
        operatingHours: oh,
        amenities: Array.isArray(business.amenities) ? business.amenities : [],
        socialMedia: {
          website: sm.website || "",
          facebook: sm.facebook || "",
          instagram: sm.instagram || "",
        },
        holidayPolicy: business.holidayPolicy || HOLIDAY_POLICIES[1],
      });
      setSelectedAmenities(Array.isArray(business.amenities) ? business.amenities : []);
    }
  }, [business, form]);

  // Calculate completion progress
  useEffect(() => {
    const values = form.watch();
    let completed = 0;
    const total = 7;

    if (values.name?.length >= 2) completed++;
    if (values.description?.length >= 10) completed++;
    if (values.contactInfo?.phone?.length >= 10) completed++;
    if (values.contactInfo?.email?.includes('@')) completed++;
    if (values.contactInfo?.address?.length >= 5) completed++;
    if (values.amenities?.length > 0) completed++;
    if (Object.values(values.operatingHours || {}).some(day => day.isOpen)) completed++;

    setCompletionProgress(Math.round((completed / total) * 100));
  }, [form.watch()]);

  // Location detection functions
  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Geolocation not supported",
        description: "Your browser doesn't support location detection"
      });
      return;
    }

    setIsDetectingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue("location.latitude", latitude);
        form.setValue("location.longitude", longitude);
        form.setValue("location.manualLatitude", latitude.toFixed(6));
        form.setValue("location.manualLongitude", longitude.toFixed(6));
        form.setValue("location.detectedAddress", "Location detected successfully");
        
        toast({
          title: "Location detected!",
          description: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        });
        setIsDetectingLocation(false);
      },
      (error) => {
        let message = "Location detection failed";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information unavailable";
            break;
          case error.TIMEOUT:
            message = "Location request timed out";
            break;
        }
        
        toast({
          variant: "destructive",
          title: "Location Detection Failed",
          description: message
        });
        setIsDetectingLocation(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 60000 
      }
    );
  };

  // Gallery management
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Logo must be under 5MB"
        });
        return;
      }
      setSelectedLogo(file);
    }
  };

  const handleGalleryImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxAllowed = subscription?.tier === 'free' ? 1 : 3;
    const currentCount = selectedGalleryImages.length;
    
    if (currentCount + files.length > maxAllowed) {
      toast({
        variant: "destructive",
        title: `Gallery limit reached`,
        description: `${subscription?.tier === 'free' ? 'Free tier' : 'Premium tier'} allows ${maxAllowed} image${maxAllowed > 1 ? 's' : ''} maximum`
      });
      return;
    }

    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        variant: "destructive",
        title: "Files too large",
        description: "All images must be under 5MB"
      });
      return;
    }

    setSelectedGalleryImages((prev) => [...prev, ...files]);
  };

  const removeGalleryImage = (index: number) => {
    setSelectedGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Check subscription tier for features
  const isPremiumUser = subscription?.tier === 'premium' || subscription?.tier === 'enterprise';
  const galleryLimit = subscription?.tier === 'free' ? 1 : 3;

  const applyPreset = (presetName: string) => {
    const preset = OPERATING_HOURS_PRESETS[presetName as keyof typeof OPERATING_HOURS_PRESETS];
    form.setValue("operatingHours", preset);
    setSelectedPreset(presetName);
    toast({ title: `Applied ${presetName} hours`, description: "You can customize these times as needed." });
  };

  const copyToAllDays = () => {
    const mondayHours = form.getValues("operatingHours.monday");
    const newHours = { ...form.getValues("operatingHours") };
    
    Object.keys(newHours).forEach(day => {
      if (day !== "sunday") { // Keep Sunday as-is typically
        newHours[day] = { ...mondayHours };
      }
    });
    
    form.setValue("operatingHours", newHours);
    toast({ title: "Copied Monday hours to all weekdays" });
  };

  const toggleAmenity = (amenityId: string) => {
    const current = selectedAmenities.includes(amenityId);
    const updated = current 
      ? selectedAmenities.filter(id => id !== amenityId)
      : [...selectedAmenities, amenityId];
    
    setSelectedAmenities(updated);
    form.setValue("amenities", updated);
  };

  const getAmenitiesForIndustry = (industryType: string) => {
    return AMENITY_CATEGORIES[industryType as keyof typeof AMENITY_CATEGORIES] || AMENITY_CATEGORIES.default;
  };

  const onSubmit = (data: BusinessProfileFormData) => {
    // Convert manual coordinates to numbers if provided
    if (data.location?.manualLatitude && data.location?.manualLongitude) {
      const lat = parseFloat(data.location.manualLatitude);
      const lng = parseFloat(data.location.manualLongitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        data.location.latitude = lat;
        data.location.longitude = lng;
      }
    }

    updateProfileMutation.mutate({
      ...data,
      amenities: selectedAmenities,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  const amenityCategories = getAmenitiesForIndustry(business?.industryType || "default");

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Business Profile Setup</h2>
              <p className="text-muted-foreground">
                Complete your profile to appear in search results and attract customers
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{completionProgress}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${completionProgress}%` }}
            />
          </div>
          {completionProgress < 100 && (
            <p className="text-sm text-amber-600 mt-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              Complete all sections to make your business discoverable
            </p>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            // Show a toast so the user knows validation failed
            const firstError = Object.values(errors)[0];
            const message =
              (firstError as any)?.message ||
              (firstError as any)?.phone?.message ||
              (firstError as any)?.email?.message ||
              (firstError as any)?.address?.message ||
              "Please fill in all required fields before saving.";
            toast({
              variant: "destructive",
              title: "Cannot save profile",
              description: String(message),
            });
          })}
          className="space-y-6"
        >
          
          {/* Essential Business Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Essential Business Information
              </CardTitle>
              <CardDescription>
                The basics customers need to know about your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Amazing Restaurant" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactInfo.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Phone className="mr-1 h-4 w-4" />
                        Phone Number *
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+61 4XX XXX XXX" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Description *</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Tell customers what makes your business special. What services do you offer? What's your experience?"
                        className="h-24"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactInfo.address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <MapPin className="mr-1 h-4 w-4" />
                      Full Address *
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Collins Street, Melbourne VIC 3000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Smart Operating Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Operating Hours
              </CardTitle>
              <CardDescription>
                Set your business hours - use presets to save time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Quick Presets */}
              <div>
                <label className="text-sm font-medium mb-2 block">Quick Setup</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.keys(OPERATING_HOURS_PRESETS).map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={selectedPreset === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => applyPreset(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyToAllDays}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy Mon to All
                  </Button>
                </div>
              </div>

              {/* Simplified Hours Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(form.watch("operatingHours") || {}).map(([day, hours]) => (
                  <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FormField
                        control={form.control}
                        name={`operatingHours.${day}.isOpen`}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <span className="font-medium capitalize w-20">{day}</span>
                    </div>
                    
                    {hours.isOpen ? (
                      <div className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name={`operatingHours.${day}.open`}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="time"
                              className="w-20"
                            />
                          )}
                        />
                        <span>-</span>
                        <FormField
                          control={form.control}
                          name={`operatingHours.${day}.close`}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="time"
                              className="w-20"
                            />
                          )}
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Closed</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Holiday Policy */}
              <FormField
                control={form.control}
                name="holidayPolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holiday Hours</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select holiday policy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HOLIDAY_POLICIES.map((policy) => (
                          <SelectItem key={policy} value={policy}>
                            {policy}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Smart Amenities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5" />
                Amenities & Features
              </CardTitle>
              <CardDescription>
                Highlight what makes your business convenient and accessible
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(amenityCategories).map(([category, amenities]) => (
                <div key={category}>
                  <h4 className="font-medium mb-3">{category}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {amenities.map((amenity) => {
                      const Icon = amenity.icon;
                      const isSelected = selectedAmenities.includes(amenity.id);
                      return (
                        <Button
                          key={amenity.id}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className="justify-start h-auto p-3"
                          onClick={() => toggleAmenity(amenity.id)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <span className="text-sm">{amenity.name}</span>
                          {isSelected && <CheckCircle2 className="ml-auto h-4 w-4" />}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Logo & Gallery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ImagePlus className="mr-2 h-5 w-5" />
                Business Logo & Gallery
              </CardTitle>
              <CardDescription>
                Upload your business logo and showcase photos
                {subscription?.tier === 'free' && " (Free: 1 gallery photo, Premium: 3 photos)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Logo Upload */}
              <div>
                <FormLabel className="text-base font-medium">Business Logo</FormLabel>
                <div className="mt-3 flex items-center gap-4">
                  {business?.logo && !selectedLogo && (
                    <img
                      src={business.logo}
                      alt="Current logo"
                      className="h-16 w-16 object-contain rounded-lg border bg-white"
                    />
                  )}
                  {selectedLogo && (
                    <img
                      src={URL.createObjectURL(selectedLogo)}
                      alt="Selected logo"
                      className="h-16 w-16 object-contain rounded-lg border bg-white"
                    />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("logo-upload")?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    {selectedLogo ? "Change Logo" : "Upload Logo"}
                  </Button>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Max 5MB • JPG, PNG, WebP formats
                </p>
              </div>

              {/* Gallery Upload */}
              <div>
                <FormLabel className="text-base font-medium flex items-center gap-2">
                  Gallery Photos
                  <Badge variant={subscription?.tier === 'free' ? "secondary" : "default"}>
                    {subscription?.tier === 'free' ? 'Free: 1 photo' : 'Premium: 3 photos'}
                  </Badge>
                </FormLabel>
                
                <div className="mt-3 space-y-4">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("gallery-upload")?.click()}
                      disabled={selectedGalleryImages.length >= galleryLimit}
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Add Photos ({selectedGalleryImages.length}/{galleryLimit})
                    </Button>
                    <Input
                      id="gallery-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleGalleryImagesChange}
                    />
                    {subscription?.tier === 'free' && (
                      <Button variant="outline" size="sm" disabled>
                        <Lock className="mr-1 h-3 w-3" />
                        Upgrade for 3 photos
                      </Button>
                    )}
                  </div>

                  {/* Gallery Preview */}
                  {selectedGalleryImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedGalleryImages.map((file, index) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-lg border bg-muted overflow-hidden"
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Gallery ${index + 1}`}
                            className="object-cover w-full h-full"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => removeGalleryImage(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smart Location (Premium Feature) */}
          <Card className={isPremiumUser ? "" : "opacity-75"}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Navigation className="mr-2 h-5 w-5" />
                  Smart Navigation
                  {!isPremiumUser && <Lock className="ml-2 h-4 w-4 text-muted-foreground" />}
                </span>
                {isPremiumUser && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLocationAdvanced(!showLocationAdvanced)}
                  >
                    {showLocationAdvanced ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                {isPremiumUser 
                  ? "Enable precise navigation to your business location"
                  : "Upgrade to Premium for exact GPS coordinates and navigation"
                }
              </CardDescription>
            </CardHeader>
            {isPremiumUser && (
              <CardContent className="space-y-4">
                {/* Location Detection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={detectLocation}
                      disabled={isDetectingLocation}
                      className="flex items-center gap-2"
                    >
                      {isDetectingLocation ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <Navigation className="h-4 w-4" />
                      )}
                      {isDetectingLocation ? "Detecting..." : "Detect My Location"}
                    </Button>
                    
                    {form.watch("location.latitude") && (
                      <Badge variant="secondary" className="text-green-700 bg-green-100">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Location Set
                      </Badge>
                    )}
                  </div>

                  {/* Show detected coordinates */}
                  {form.watch("location.latitude") && form.watch("location.longitude") && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700">
                        📍 Coordinates: {form.watch("location.latitude")?.toFixed(6)}, {form.watch("location.longitude")?.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Manual Coordinates (Advanced) */}
                {showLocationAdvanced && (
                  <div className="space-y-3 pt-3 border-t">
                    <FormLabel className="text-sm font-medium">Manual Coordinates (Optional)</FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="location.manualLatitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Latitude</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="-37.813611"
                                className="text-sm"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location.manualLongitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Longitude</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="144.963056"
                                className="text-sm"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Placeholder for OpenStreetMap integration - coming soon!
                    </p>
                  </div>
                )}
              </CardContent>
            )}
            {!isPremiumUser && (
              <CardContent>
                <div className="text-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Smart navigation requires Premium subscription
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Upgrade to Enable
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Advanced/Optional Sections (Collapsible) */}
          <Card>
            <CardHeader>
              <CardTitle 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <span className="flex items-center">
                  <Globe className="mr-2 h-5 w-5" />
                  Social Media & Contact (Optional)
                </span>
                {showAdvanced ? <ChevronUp /> : <ChevronDown />}
              </CardTitle>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="contactInfo.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Mail className="mr-1 h-4 w-4" />
                        Business Email
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="info@yourbusiness.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="socialMedia.website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Globe className="mr-1 h-4 w-4" />
                          Website
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://yourbusiness.com" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialMedia.facebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Facebook className="mr-1 h-4 w-4" />
                          Facebook
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="facebook.com/yourpage" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialMedia.instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Instagram className="mr-1 h-4 w-4" />
                          Instagram
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="@yourbusiness" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Save Button */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {completionProgress === 100 ? (
                <span className="text-green-600 flex items-center">
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Profile ready for storefront!
                </span>
              ) : (
                `${7 - Math.floor((completionProgress / 100) * 7)} required fields remaining`
              )}
            </div>
            <Button type="submit" disabled={updateProfileMutation.isPending} size="lg">
              {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}