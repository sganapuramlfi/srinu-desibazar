import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, 
  Store, 
  Navigation, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  Crown,
  Star,
  Gift,
  Target,
  Zap,
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation as useGeoLocation } from "@/hooks/use-location";
import { useQueryClient } from "@tanstack/react-query";

const businessRegistrationSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().optional(),
  industryType: z.enum(["salon", "restaurant", "event", "realestate", "retail", "professional"]),
  address: z.string().min(5, "Please enter a valid address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  subscriptionTier: z.enum(["free", "premium", "enterprise"]),
  selectedModules: z.array(z.string()).min(1, "Please select at least one module"),
});

type BusinessRegistrationData = z.infer<typeof businessRegistrationSchema>;

const INDUSTRIES = [
  { id: "salon", name: "Salon & Spa", icon: "✨", example: "Hair salon, beauty spa, nail studio" },
  { id: "restaurant", name: "Restaurant & Cafés", icon: "🍽️", example: "Restaurant, café, food truck" },
  { id: "event", name: "Event Management", icon: "🎉", example: "Wedding planner, party organizer" },
  { id: "realestate", name: "Real Estate", icon: "🏠", example: "Property sales, rentals" },
  { id: "retail", name: "Retail Stores", icon: "🛍️", example: "Fashion, electronics, groceries" },
  { id: "professional", name: "Professional Services", icon: "⚖️", example: "Legal, accounting, consulting" }
];

const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free Tier",
    price: "180 Days FREE",
    icon: Gift,
    color: "border-gray-300 bg-gray-50",
    features: ["1 Module", "Global Ads", "5 ads/month", "Basic support"],
    maxModules: 1,
    recommended: false
  },
  premium: {
    name: "Premium",
    price: "180 Days FREE",
    icon: Star,
    color: "border-blue-300 bg-blue-50",
    features: ["3 Modules", "Local + Global Ads", "25 ads/month", "Priority support"],
    maxModules: 3,
    recommended: true
  },
  enterprise: {
    name: "Enterprise", 
    price: "180 Days FREE",
    icon: Crown,
    color: "border-purple-300 bg-purple-50",
    features: ["ALL Modules", "Premium Ads", "Unlimited ads", "24/7 support"],
    maxModules: 999,
    recommended: false
  }
};

const STEPS = [
  { id: 1, title: "Smart Location", description: "Verify your business location" },
  { id: 2, title: "Business Details", description: "Tell us about your business" },
  { id: 3, title: "Choose Plan", description: "Select subscription tier" },
  { id: 4, title: "Select Modules", description: "Pick business modules" },
];

export default function BusinessRegistration() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { location, isLoading: locationLoading, error: locationError, requestLocation, clearError } = useGeoLocation();

  const form = useForm<BusinessRegistrationData>({
    resolver: zodResolver(businessRegistrationSchema),
    defaultValues: {
      name: "",
      description: "",
      industryType: "restaurant", // Default to restaurant since it's most common
      address: "",
      phone: "",
      email: "",
      password: "",
      subscriptionTier: "premium", // Default to recommended
      selectedModules: [],
    },
  });

  const watchedTier = form.watch("subscriptionTier");
  const watchedModules = form.watch("selectedModules");
  const maxModules = SUBSCRIPTION_TIERS[watchedTier || "free"].maxModules;

  // Auto-populate address from location
  useEffect(() => {
    if (location && !form.getValues("address")) {
      const address = `${location.suburb || location.city}, ${location.state}`;
      form.setValue("address", address);

      // Show success toast
      toast({
        title: "📍 Location Detected",
        description: `${location.suburb || location.city}, ${location.state}`,
      });
    }
  }, [location, form, toast]);

  // Show error toast when location detection fails
  useEffect(() => {
    if (locationError) {
      toast({
        variant: "destructive",
        title: "Location Detection Failed",
        description: locationError,
      });
    }
  }, [locationError, toast]);

  const handleNext = async () => {
    // Validate step 2 fields before advancing so errors are visible in context
    if (currentStep === 2) {
      const isValid = await form.trigger(["name", "industryType", "address", "phone", "email", "password"]);
      if (!isValid) return;
    }
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: BusinessRegistrationData) => {
    setIsSubmitting(true);
    try {
      // Calculate trial end date (180 days from now)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 180);

      const registrationData = {
        ...data,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          city: location.city,
          suburb: location.suburb,
          state: location.state,
        } : null,
        subscription: {
          tier: data.subscriptionTier,
          trialEndDate: trialEndDate.toISOString(),
          enabledModules: data.selectedModules,
        }
      };

      const response = await fetch("/api/simple/register/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: data.name,
          email: data.email,
          password: data.password,
          industryType: data.industryType
        }),
        credentials: "include"
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Registration failed");
      }
      
      // Refresh user data since backend auto-logs user in
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      
      if (result.data.devMode && result.data.redirectTo) {
        // Development mode: auto-verified and logged in
        toast({
          title: "🎉 Registration Successful!",
          description: `Welcome to DesiBazaar! You're now logged in.`,
        });
        // Small delay to ensure user data is refreshed
        setTimeout(() => navigate(result.data.redirectTo), 100);
      } else if (result.data.emailVerificationRequired) {
        // Production mode: requires email verification
        toast({
          title: "🎉 Registration Successful!",
          description: `Welcome to DesiBazaar! Please check your email for verification.`,
        });
        navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
      } else {
        // Fallback: redirect to dashboard
        toast({
          title: "🎉 Registration Successful!",
          description: `Welcome to DesiBazaar!`,
        });
        // Small delay to ensure user data is refreshed
        setTimeout(() => navigate(result.data.redirectTo || `/dashboard/${result.data.businessId}`), 100);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error?.message || "Please try again or contact support.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Navigation className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">📍 Smart Location Detection</h2>
              <p className="text-muted-foreground">
                We'll help customers find you with precise location targeting
              </p>
            </div>

            {locationLoading ? (
              <Card className="p-6 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Detecting your location...</p>
              </Card>
            ) : locationError ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6 text-center">
                  <MapPin className="h-8 w-8 text-red-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-red-800 mb-2">Location Detection Failed</h3>
                  <p className="text-red-700 mb-4 text-sm">
                    {locationError}
                  </p>
                  <div className="bg-white p-4 rounded-lg mb-4 text-left">
                    <h4 className="font-medium mb-2 text-red-800">📝 How to fix this:</h4>
                    <ul className="text-sm space-y-1 text-red-700">
                      <li>1. Click your browser's location icon (usually in the address bar)</li>
                      <li>2. Select "Allow" for location access</li>
                      <li>3. Click the button below to try again</li>
                      <li className="mt-2 pt-2 border-t border-red-200">
                        <strong>Or</strong> enter your address manually in the next step
                      </li>
                    </ul>
                  </div>
                  <Button onClick={() => { clearError(); requestLocation(); }} className="mb-2">
                    <Navigation className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <p className="text-xs text-red-600 mt-2">
                    Don't worry - you can skip this and enter your address manually
                  </p>
                </CardContent>
              </Card>
            ) : location ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">Location Detected!</h3>
                      <p className="text-green-700">
                        {location.suburb && `${location.suburb}, `}{location.city}, {location.state}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-medium mb-2">🎯 Your Smart Advertising Advantage:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Local customers will see you first in search results</li>
                      <li>• Distance-based targeting (users see "2.3km away")</li>
                      <li>• Suburban market focus for better conversion</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-6 text-center">
                  <MapPin className="h-8 w-8 text-orange-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-orange-800 mb-2">Enable Location for Smart Ads</h3>
                  <p className="text-orange-700 mb-4 text-sm">
                    Location helps customers find local businesses like yours
                  </p>
                  <div className="bg-white p-4 rounded-lg mb-4 text-left">
                    <h4 className="font-medium mb-2">🌟 Benefits of location detection:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Auto-fill your business address</li>
                      <li>• Better local search rankings</li>
                      <li>• Show distance to customers</li>
                    </ul>
                  </div>
                  <Button onClick={requestLocation} className="mb-2">
                    <Navigation className="h-4 w-4 mr-2" />
                    Enable Location
                  </Button>
                  <p className="text-xs text-orange-600 mt-2">
                    You can also enter your address manually in the next step
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="text-center">
              <Button onClick={handleNext} size="lg">
                Continue to Business Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Store className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Tell us about your business</h2>
              <p className="text-muted-foreground">
                This information helps customers discover and connect with you
              </p>
            </div>

            <Form {...form}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Spice Paradise Restaurant" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDUSTRIES.map((industry) => (
                            <SelectItem key={industry.id} value={industry.id}>
                              <div className="flex items-center gap-2">
                                <span>{industry.icon}</span>
                                <div>
                                  <div>{industry.name}</div>
                                  <div className="text-xs text-muted-foreground">{industry.example}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Collins Street, Melbourne CBD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="+61 4XX XXX XXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Email *</FormLabel>
                      <FormControl>
                        <Input placeholder="info@yourbusiness.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Create a secure password" {...field} />
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
                    <FormLabel>Business Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of your business and services..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>

            <div className="flex gap-4">
              <Button variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Continue to Subscription
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Crown className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">🎉 Choose Your FREE Plan</h2>
              <p className="text-muted-foreground">
                All plans include 180 days completely free! No billing required during startup phase.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(SUBSCRIPTION_TIERS).map(([tier, config]) => (
                <Card 
                  key={tier}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    watchedTier === tier ? 'ring-2 ring-primary shadow-lg' : ''
                  } ${config.color} ${config.recommended ? 'relative' : ''}`}
                  onClick={() => form.setValue("subscriptionTier", tier as any)}
                >
                  {config.recommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-white px-4 py-1">
                        🚀 RECOMMENDED
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                      <config.icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                    <CardDescription className="text-xl font-bold text-primary">
                      {config.price}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {config.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Continue to Modules
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Select Business Modules</h2>
              <p className="text-muted-foreground">
                Choose which modules to activate. 
                {watchedTier === "free" && " (Free tier: 1 module only)"}
                {watchedTier === "premium" && " (Premium tier: up to 3 modules)"}
                {watchedTier === "enterprise" && " (Enterprise tier: unlimited modules)"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {INDUSTRIES.map((industry) => {
                const isSelected = watchedModules.includes(industry.id);
                const canSelect = watchedModules.length < maxModules || isSelected;
                
                return (
                  <Card 
                    key={industry.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : canSelect ? 'hover:shadow-md' : 'opacity-50'
                    }`}
                    onClick={() => {
                      if (!canSelect && !isSelected) return;
                      
                      const current = form.getValues("selectedModules");
                      const updated = isSelected 
                        ? current.filter(m => m !== industry.id)
                        : [...current, industry.id];
                      form.setValue("selectedModules", updated);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{industry.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium">{industry.name}</div>
                          <div className="text-xs text-muted-foreground">{industry.example}</div>
                        </div>
                        {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {watchedModules.length === 0 && (
              <div className="text-center text-muted-foreground">
                Please select at least one module to continue
              </div>
            )}

            <div className="flex gap-4">
              <Button variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit, (errors) => {
                  // If Step 2 fields have errors, jump back so user can see them
                  const step2Fields = ["name", "industryType", "address", "phone", "email", "password"] as const;
                  const hasStep2Error = step2Fields.some(f => f in errors);
                  if (hasStep2Error) {
                    setCurrentStep(2);
                    toast({
                      variant: "destructive",
                      title: "Missing required information",
                      description: "Please fill in all required fields before continuing.",
                    });
                  } else if ("selectedModules" in errors) {
                    toast({
                      variant: "destructive",
                      title: "Select a module",
                      description: "Please select at least one business module to continue.",
                    });
                  }
                })}
                className="flex-1"
                disabled={watchedModules.length === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    🚀 Start My Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'border-primary bg-primary text-white' 
                    : 'border-gray-300 bg-white text-gray-400'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`h-0.5 w-16 ml-4 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={(currentStep / STEPS.length) * 100} className="mb-2" />
          <div className="text-center">
            <h1 className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.title}
            </h1>
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-xl">
          <CardContent className="p-8">
            {renderStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}