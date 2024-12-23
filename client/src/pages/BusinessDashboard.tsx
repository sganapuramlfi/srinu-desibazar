import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "../hooks/use-user";
import { useBusiness } from "../hooks/use-business";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Calendar,
  Users,
  BarChart,
  Settings,
  PlusCircle,
  Store,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface BusinessDashboardProps {
  businessId: number;
}

export default function BusinessDashboard({ businessId }: BusinessDashboardProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { business, isLoading, error } = useBusiness(businessId);

  useEffect(() => {
    if (!user || user.role !== "business") {
      navigate("/auth");
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Error</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              {error?.message || "Failed to load business dashboard"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderIndustrySpecificTools = () => {
    switch (business.industryType) {
      case "salon":
        return (
          <>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
          </>
        );
      case "restaurant":
        return (
          <>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
          </>
        );
      case "event":
        return (
          <>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
          </>
        );
      case "realestate":
        return (
          <>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="viewings">Viewings</TabsTrigger>
          </>
        );
      case "retail":
        return (
          <>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </>
        );
      case "professional":
        return (
          <>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
          </>
        );
      default:
        return null;
    }
  };

  const renderIndustrySpecificContent = () => {
    switch (business.industryType) {
      case "salon":
        return (
          <>
            <TabsContent value="services" className="p-4">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Salon Services</h3>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </div>
              {/* Service list/management will be implemented here */}
            </TabsContent>
            <TabsContent value="staff" className="p-4">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Staff Management</h3>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </div>
              {/* Staff management will be implemented here */}
            </TabsContent>
          </>
        );
      // Add other industry-specific content similarly
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Store className="h-6 w-6 text-primary mr-2" />
          <h1 className="text-xl font-semibold">{business.name}</h1>
          <span className="ml-2 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
            {business.status}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-8 p-8">
        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">No bookings yet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0</div>
              <p className="text-xs text-muted-foreground">Start adding services</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">No customers yet</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <Card className="flex-1">
          <Tabs defaultValue="bookings" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none px-4">
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              {renderIndustrySpecificTools()}
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="p-4">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Bookings</h3>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Booking
                </Button>
              </div>
              <div className="text-sm text-muted-foreground text-center py-8">
                No bookings found. Start by adding your first booking.
              </div>
            </TabsContent>

            {renderIndustrySpecificContent()}

            <TabsContent value="analytics" className="p-4">
              <h3 className="text-lg font-semibold mb-4">Analytics</h3>
              <div className="text-sm text-muted-foreground text-center py-8">
                Analytics will be available once you start getting bookings.
              </div>
            </TabsContent>

            <TabsContent value="settings" className="p-4">
              <h3 className="text-lg font-semibold mb-4">Business Settings</h3>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your business profile and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Profile settings form will be implemented here */}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Working Hours</CardTitle>
                    <CardDescription>
                      Set your business operating hours
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Working hours form will be implemented here */}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}