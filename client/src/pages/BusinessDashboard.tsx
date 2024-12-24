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
import { Package, Users, Store, Loader2, AlertCircle, CalendarDays } from "lucide-react";
import { StaffTab } from "@/components/StaffTab";
import { ServiceStaffTab } from "@/components/ServiceStaffTab";
import { RosterTabUpdated } from "@/components/RosterTabUpdated";
import { ServicesTab } from "@/components/ServicesTab";
import type { SalonStaff, ShiftTemplate } from "@/types/salon";

interface BusinessDashboardProps {
  businessId: number;
}

interface Business {
  id: number;
  name: string;
  industryType: string;
}

function BusinessDashboard({ businessId }: BusinessDashboardProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();

  // If not authenticated, redirect to auth page
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const { data: business } = useQuery<Business>({
    queryKey: [`/api/businesses/${businessId}`],
    enabled: !!businessId,
  });

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<SalonStaff[]>({
    queryKey: [`/api/businesses/${businessId}/staff`],
    enabled: !!businessId,
  });

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<ShiftTemplate[]>({
    queryKey: [`/api/businesses/${businessId}/shift-templates`],
    enabled: !!businessId,
  });

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
              The business you're looking for doesn't exist.
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
        <TabsList className="grid w-full grid-cols-4">
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
        </TabsList>
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
      </Tabs>
    </div>
  );
}

export default BusinessDashboard;