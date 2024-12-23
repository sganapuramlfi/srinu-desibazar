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
} from "lucide-react";

interface BusinessDashboardProps {
  businessId: number;
}

export default function BusinessDashboard({ businessId }: BusinessDashboardProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { business, isLoading } = useBusiness(businessId);

  useEffect(() => {
    if (!user || user.role !== "business") {
      navigate("/auth");
    }
  }, [user, navigate]);

  if (isLoading || !business) {
    return <div>Loading...</div>;
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

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Store className="h-6 w-6 text-primary mr-2" />
          <h1 className="text-xl font-semibold">{business.name}</h1>
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
              <div className="text-2xl font-bold">123</div>
              <p className="text-xs text-muted-foreground">+10% from last month</p>
            </CardContent>
          </Card>
          {/* Add more overview cards here */}
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
              {/* Add booking list/table here */}
            </TabsContent>

            <TabsContent value="analytics" className="p-4">
              <h3 className="text-lg font-semibold mb-4">Analytics</h3>
              {/* Add analytics charts here */}
            </TabsContent>

            <TabsContent value="settings" className="p-4">
              <h3 className="text-lg font-semibold mb-4">Business Settings</h3>
              {/* Add settings form here */}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
