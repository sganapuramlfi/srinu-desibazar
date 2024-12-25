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
  industryType: string;
  status: string;
  userId: number;
}

function BusinessDashboard({ businessId }: BusinessDashboardProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();

  // If not authenticated, redirect to auth page
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user has access to this business
    if (user.role !== "business") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access this dashboard."
      });
      navigate("/");
    }
  }, [user, navigate, toast]);

  const { data: business, error: businessError } = useQuery<Business>({
    queryKey: [`/api/businesses/${businessId}`],
    enabled: !!businessId,
  });

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<SalonStaff[]>({
    queryKey: [`/api/businesses/${businessId}/staff`],
    enabled: !!businessId && !!user,
  });

  const { data: services = [], isLoading: isLoadingServices } = useQuery<SalonService[]>({
    queryKey: [`/api/businesses/${businessId}/services`],
    enabled: !!businessId && !!user,
  });

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<ShiftTemplate[]>({
    queryKey: [`/api/businesses/${businessId}/shift-templates`],
    enabled: !!businessId && !!user,
  });

  if (businessError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Error</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              {businessError instanceof Error ? businessError.message : "Failed to load business data"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Business Not Found</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
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
          <p className="text-muted-foreground">Manage your business operations</p>
        </div>
      </div>

      <Tabs defaultValue="services" className="w-full">
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