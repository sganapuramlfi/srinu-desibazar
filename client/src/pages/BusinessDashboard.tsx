import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "../hooks/use-user";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Package, Users, Store, Loader2, AlertCircle, CalendarDays, Calendar, Settings, Bookmark, Clock, Crown, CheckCircle, MessageCircle, Bell } from "lucide-react";
import { StaffTab } from "../components/StaffTab";
import { ServiceStaffTab } from "../components/ServiceStaffTab";
import { RosterTabUpdated } from "../components/RosterTabUpdated";
import { ServicesTab } from "../components/ServicesTab";
import { ServiceSlotsTab } from "../components/ServiceSlotsTab";
import { SmartBusinessProfileTab } from "../components/SmartBusinessProfileTab";
import { ShiftTemplatesTab } from "../components/ShiftTemplatesTab";
import { BusinessSubscriptionTab } from "../components/BusinessSubscriptionTab";
import BookingsPage from "../pages/BookingsPage";
import type { SalonStaff, ShiftTemplate, SalonService } from "../types/salon";
import { useToast } from "@/hooks/use-toast";

// Restaurant-specific components
import { RestaurantMenuTab } from "../components/RestaurantMenuTab";
import { RestaurantOrdersTab } from "../components/RestaurantOrdersTab";
import { RestaurantTablesTab } from "../components/RestaurantTablesTab";
import { RestaurantStaffTab } from "../components/RestaurantStaffTab";
import { RestaurantPromotionsTab } from "../components/RestaurantPromotionsTab";

// Universal business components
import { BusinessReviewsTab } from "../components/BusinessReviewsTab";
import BusinessAlertsTab from "../components/BusinessAlertsTab";

interface BusinessDashboardProps {
  businessId: number;
  businessSlug: string;
}

interface Business {
  id: number;
  name: string;
  description?: string;
  industryType: string;
  status: string;
  userId: number;
  logo_url?: string;
  contactInfo?: {
    phone: string;
    email: string;
    address: string;
  };
}

function BusinessDashboard({ businessId, businessSlug }: BusinessDashboardProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user has access to this business
    const hasBusinessAccess = user.businessAccess?.some(access => 
      access.businessId === businessId && access.isActive
    );

    if (!hasBusinessAccess) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access this dashboard."
      });
      navigate("/");
      return;
    }
  }, [user, businessId]); // Removed navigate and toast to prevent infinite loops

  const { data: business, error: businessError, isLoading: isLoadingBusiness } = useQuery<Business>({
    queryKey: [`/api/businesses/${businessId}/profile`],
    enabled: !!businessId && !!user,
    staleTime: 0,
    retry: 1
  });

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<SalonStaff[]>({
    queryKey: [`/api/businesses/${businessId}/staff`],
    enabled: !!businessId && !!user,
    staleTime: 0,
    retry: 1
  });

  const { data: services = [], isLoading: isLoadingServices } = useQuery<SalonService[]>({
    queryKey: [`/api/businesses/${businessId}/services`],
    enabled: !!businessId && !!user,
    staleTime: 0,
    retry: 1
  });

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<ShiftTemplate[]>({
    queryKey: [`/api/businesses/${businessId}/shift-templates`],
    enabled: !!businessId && !!user && business?.industryType === 'salon', // Only for salon businesses
    staleTime: 0,
    retry: 1
  });

  if (isLoadingBusiness) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (businessError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <h1 className="text-2xl font-bold">Error</h1>
            </div>
            <p className="mt-4 text-muted-foreground">
              {businessError instanceof Error ? businessError.message : "Failed to load business data"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <h1 className="text-2xl font-bold">Business Not Found</h1>
            </div>
            <p className="mt-4 text-muted-foreground">
              The business you're looking for doesn't exist or you don't have permission to access it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access control is handled in useEffect above - user already has verified access

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{business.name}</h1>
          <p className="text-muted-foreground">{business.description || 'Manage your business operations'}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => window.open(`/storefront/${businessSlug}`, '_blank')}>
            <Store className="w-4 h-4 mr-2" />
            View Storefront
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            <Package className="w-4 h-4 mr-2" />
            Browse Platform
          </Button>
        </div>
      </div>

      {/* Onboarding Progress Banner for New Businesses */}
      {business && (!business.description || !business.contactInfo?.phone) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="bg-amber-100 p-2 rounded-full">
                <Settings className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-800 mb-2">
                  🚀 Complete Your Business Setup
                </h3>
                <p className="text-amber-700 mb-4">
                  Your business is registered! Complete these essential steps to start attracting customers and accepting bookings.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {business.description ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-amber-400" />
                    )}
                    <span className={business.description ? "text-green-700" : "text-amber-700"}>
                      Business description & contact info
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 rounded-full border-2 border-amber-400" />
                    <span className="text-amber-700">
                      {business.industryType === 'restaurant' ? 'Menu items' : 'Services & pricing'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 rounded-full border-2 border-amber-400" />
                    <span className="text-amber-700">Public storefront page</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={(!business?.description || !business?.contactInfo?.phone) ? "profile" : "subscription"} className="w-full">
        <TabsList className={`grid w-full ${business.industryType === 'restaurant' ? 'grid-cols-9' : 'grid-cols-11'}`}>
          <TabsTrigger value="subscription">
            <Crown className="w-4 h-4 mr-2" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="profile">
            <Settings className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          
          {/* Restaurant-specific tabs */}
          {business.industryType === 'restaurant' ? (
            <>
              <TabsTrigger value="orders">
                <Clock className="w-4 h-4 mr-2" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="menu">
                <Package className="w-4 h-4 mr-2" />
                Menu
              </TabsTrigger>
              <TabsTrigger value="tables">
                <Store className="w-4 h-4 mr-2" />
                Tables
              </TabsTrigger>
              <TabsTrigger value="restaurant-staff">
                <Users className="w-4 h-4 mr-2" />
                Staff
              </TabsTrigger>
              <TabsTrigger value="promotions">
                <Calendar className="w-4 h-4 mr-2" />
                Promotions
              </TabsTrigger>
              <TabsTrigger value="reviews">
                <MessageCircle className="w-4 h-4 mr-2" />
                Reviews
              </TabsTrigger>
              <TabsTrigger value="alerts">
                <Bell className="w-4 h-4 mr-2" />
                Alerts
              </TabsTrigger>
            </>
          ) : (
            /* Salon/Service business tabs */
            <>
              <TabsTrigger value="services">
                <Package className="w-4 h-4 mr-2" />
                Services
              </TabsTrigger>
              <TabsTrigger value="staff">
                <Users className="w-4 h-4 mr-2" />
                Staff
              </TabsTrigger>
              <TabsTrigger value="shift-templates">
                <Clock className="w-4 h-4 mr-2" />
                Shift Templates
              </TabsTrigger>
              <TabsTrigger value="roster">
                <CalendarDays className="w-4 h-4 mr-2" />
                Roster
              </TabsTrigger>
              <TabsTrigger value="service-staff">
                <Store className="w-4 h-4 mr-2" />
                Service Staff
              </TabsTrigger>
              <TabsTrigger value="slots">
                <Calendar className="w-4 h-4 mr-2" />
                Service Slots
              </TabsTrigger>
              <TabsTrigger value="bookings">
                <Bookmark className="w-4 h-4 mr-2" />
                Bookings
              </TabsTrigger>
              <TabsTrigger value="reviews">
                <MessageCircle className="w-4 h-4 mr-2" />
                Reviews
              </TabsTrigger>
              <TabsTrigger value="alerts">
                <Bell className="w-4 h-4 mr-2" />
                Alerts
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="subscription">
          <BusinessSubscriptionTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="profile">
          <SmartBusinessProfileTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="services">
          <ServicesTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="staff">
          <StaffTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="shift-templates">
          <ShiftTemplatesTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="roster">
          <RosterTabUpdated
            businessId={businessId}
            staff={staff}
            templates={templates}
            isLoadingStaff={isLoadingStaff}
            isLoadingTemplates={isLoadingTemplates}
          />
        </TabsContent>
        <TabsContent value="service-staff">
          <ServiceStaffTab
            businessId={businessId}
            industryType={business.industryType}
          />
        </TabsContent>
        <TabsContent value="slots">
          <ServiceSlotsTab
            businessId={businessId}
            staff={staff}
            services={services}
          />
        </TabsContent>
        <TabsContent value="bookings">
          <BookingsPage businessId={businessId.toString()} />
        </TabsContent>
        <TabsContent value="reviews">
          <BusinessReviewsTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="alerts">
          <BusinessAlertsTab businessId={businessId} />
        </TabsContent>
        
        {/* Restaurant-specific tab contents */}
        {business.industryType === 'restaurant' && (
          <>
            <TabsContent value="orders">
              <RestaurantOrdersTab businessId={businessId} />
            </TabsContent>
            <TabsContent value="menu">
              <RestaurantMenuTab businessId={businessId} />
            </TabsContent>
            <TabsContent value="tables">
              <RestaurantTablesTab businessId={businessId} />
            </TabsContent>
            <TabsContent value="restaurant-staff">
              <RestaurantStaffTab businessId={businessId} />
            </TabsContent>
            <TabsContent value="promotions">
              <RestaurantPromotionsTab businessId={businessId} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

export default BusinessDashboard;