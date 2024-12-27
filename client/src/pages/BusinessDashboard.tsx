import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Package, Users, Store, Loader2, AlertCircle, CalendarDays, Calendar, Settings, Bookmark, Clock } from "lucide-react";
import { StaffTab } from "../components/StaffTab";
import { ServiceStaffTab } from "../components/ServiceStaffTab";
import { RosterTabUpdated } from "../components/RosterTabUpdated";
import { ServicesTab } from "../components/ServicesTab";
import { ServiceSlotsTab } from "../components/ServiceSlotsTab";
import { BusinessProfileTab } from "../components/BusinessProfileTab";
import { ShiftTemplatesTab } from "../components/ShiftTemplatesTab";
import BookingsPage from "../pages/BookingsPage";
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

type TabConfig = {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  supportedTypes: string[];
};

function BusinessDashboard({ businessId }: BusinessDashboardProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState("profile");

  // Handle authentication and access control
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
  }, [user?.role, navigate, toast]); // Only depend on user.role changes

  // Fetch business data
  const { data: business, error: businessError, isLoading: isLoadingBusiness } = useQuery<Business>({
    queryKey: [`/api/businesses/${businessId}/profile`],
    enabled: !!businessId && !!user,
    staleTime: 0,
    retry: 1
  });

  // Fetch staff data for salon type businesses
  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<SalonStaff[]>({
    queryKey: [`/api/businesses/${businessId}/staff`],
    enabled: !!businessId && !!user && business?.industryType === "salon",
    staleTime: 0,
    retry: 1
  });

  // Fetch services data
  const { data: services = [], isLoading: isLoadingServices } = useQuery<SalonService[]>({
    queryKey: [`/api/businesses/${businessId}/services`],
    enabled: !!businessId && !!user,
    staleTime: 0,
    retry: 1
  });

  // Fetch templates data for salon and restaurant businesses
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<ShiftTemplate[]>({
    queryKey: [`/api/businesses/${businessId}/shift-templates`],
    enabled: !!businessId && !!user && ["salon", "restaurant"].includes(business?.industryType || ""),
    staleTime: 0,
    retry: 1
  });

  // Memoize tab configurations to prevent unnecessary re-renders
  const getTabs = useMemo(() => {
    if (!business) return [];

    return [
      {
        id: "profile",
        label: "Profile",
        icon: <Settings className="w-4 h-4 mr-2" />,
        component: <BusinessProfileTab businessId={businessId} />,
        supportedTypes: ["salon", "restaurant", "event", "realestate", "retail", "professional"]
      },
      {
        id: "services",
        label: "Services",
        icon: <Package className="w-4 h-4 mr-2" />,
        component: <ServicesTab businessId={businessId} />,
        supportedTypes: ["salon", "restaurant", "event", "professional"]
      },
      {
        id: "staff",
        label: "Staff",
        icon: <Users className="w-4 h-4 mr-2" />,
        component: <StaffTab businessId={businessId} />,
        supportedTypes: ["salon", "restaurant", "event"]
      },
      {
        id: "shift-templates",
        label: "Shift Templates",
        icon: <Clock className="w-4 h-4 mr-2" />,
        component: <ShiftTemplatesTab businessId={businessId} />,
        supportedTypes: ["salon", "restaurant"]
      },
      {
        id: "roster",
        label: "Roster",
        icon: <CalendarDays className="w-4 h-4 mr-2" />,
        component: (
          <RosterTabUpdated
            businessId={businessId}
            staff={staff}
            templates={templates}
            isLoadingStaff={isLoadingStaff}
            isLoadingTemplates={isLoadingTemplates}
          />
        ),
        supportedTypes: ["salon", "restaurant"]
      },
      {
        id: "service-staff",
        label: "Service Staff",
        icon: <Store className="w-4 h-4 mr-2" />,
        component: (
          <ServiceStaffTab
            businessId={businessId}
            industryType={business?.industryType}
          />
        ),
        supportedTypes: ["salon", "restaurant", "event"]
      },
      {
        id: "slots",
        label: "Service Slots",
        icon: <Calendar className="w-4 h-4 mr-2" />,
        component: (
          <ServiceSlotsTab
            businessId={businessId}
            staff={staff}
            services={services}
          />
        ),
        supportedTypes: ["salon", "professional"]
      },
      {
        id: "bookings",
        label: "Bookings",
        icon: <Bookmark className="w-4 h-4 mr-2" />,
        component: <BookingsPage businessId={businessId.toString()} />,
        supportedTypes: ["salon", "restaurant", "event", "professional"]
      }
    ].filter(tab => tab.supportedTypes.includes(business.industryType));
  }, [business, businessId, staff, services, templates, isLoadingStaff, isLoadingTemplates]);

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

  // Access control check
  if (user && business.userId !== user.id) {
    toast({
      variant: "destructive",
      title: "Access Denied",
      description: "You don't have permission to access this business dashboard."
    });
    navigate("/");
    return null;
  }

  const availableTabs = getTabs;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{business.name}</h1>
          <p className="text-muted-foreground">
            {business.description || `Manage your ${business.industryType} business operations`}
          </p>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableTabs.length}, 1fr)` }}>
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {availableTabs.map(tab => (
          <TabsContent key={tab.id} value={tab.id}>
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default BusinessDashboard;