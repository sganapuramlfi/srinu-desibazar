import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "../hooks/use-user";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Package, Users, Store, Loader2, AlertCircle, CalendarDays, Calendar, Settings } from "lucide-react";
import { StaffTab } from "../components/StaffTab";
import { ServiceStaffTab } from "../components/ServiceStaffTab";
import { RosterTabUpdated } from "../components/RosterTabUpdated";
import { ServicesTab } from "../components/ServicesTab";
import { ServiceSlotsTab } from "../components/ServiceSlotsTab";
import { BusinessProfileTab } from "../components/BusinessProfileTab";
import type { SalonStaff, ShiftTemplate, SalonService } from "../types/salon";
import { useToast } from "@/hooks/use-toast";

interface BusinessDashboardProps {
  businessId: number;
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

function BusinessDashboard({ businessId }: BusinessDashboardProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();

  // Fetch business profile data
  const { data: business, error: businessError, isLoading: isLoadingBusiness } = useQuery<Business>({
    queryKey: [`/api/businesses/${businessId}/profile`],
    enabled: !!businessId,
    retry: 1,
    onError: (error: any) => {
      console.error('Error fetching business:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load business data"
      });
    }
  });

  // Fetch staff data
  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<SalonStaff[]>({
    queryKey: [`/api/businesses/${businessId}/staff`],
    enabled: !!businessId && !!user,
    retry: 1,
    onError: (error: any) => {
      console.error('Error fetching staff:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load staff data"
      });
    }
  });

  // Fetch services data
  const { data: services = [], isLoading: isLoadingServices } = useQuery<SalonService[]>({
    queryKey: [`/api/businesses/${businessId}/services`],
    enabled: !!businessId && !!user,
    retry: 1,
    onError: (error: any) => {
      console.error('Error fetching services:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load services data"
      });
    }
  });

  // Fetch templates data
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<ShiftTemplate[]>({
    queryKey: [`/api/businesses/${businessId}/shift-templates`],
    enabled: !!businessId && !!user,
    retry: 1
  });

  // Authentication check effect
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (user.role !== "business") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access this dashboard."
      });
      navigate("/");
    }
  }, [user, navigate, toast]);

  // Loading state
  if (isLoadingBusiness) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
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

  // Not found state
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{business.name}</h1>
          <p className="text-muted-foreground">{business.description || 'Manage your business operations'}</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">
            <Settings className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="services">
            <Package className="w-4 h-4 mr-2" />
            Services
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="w-4 h-4 mr-2" />
            Staff
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
        </TabsList>

        <TabsContent value="profile">
          <BusinessProfileTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="services">
          <ServicesTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="staff">
          <StaffTab businessId={businessId} />
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
      </Tabs>
    </div>
  );
}

export default BusinessDashboard;