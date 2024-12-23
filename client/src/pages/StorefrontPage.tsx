import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Phone, Mail, Star } from "lucide-react";
import type { Business } from "@db/schema";

interface StorefrontPageProps {
  params: {
    businessId: string;
  };
}

export default function StorefrontPage({ params }: StorefrontPageProps) {
  const businessId = parseInt(params.businessId);
  const [, navigate] = useLocation();

  const { data: business, isLoading } = useQuery<Business>({
    queryKey: ["/api/businesses", businessId],
    enabled: !!businessId,
  });

  if (isLoading || !business) {
    return <div>Loading...</div>;
  }

  const renderIndustrySpecificContent = () => {
    switch (business.industryType) {
      case "salon":
        return (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Salon Services */}
            <Card>
              <CardHeader>
                <CardTitle>Haircut</CardTitle>
                <CardDescription>45 mins • $30</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Book Appointment</Button>
              </CardContent>
            </Card>
            {/* Add more salon services */}
          </div>
        );
      case "restaurant":
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold">Menu</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Menu Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Butter Chicken</CardTitle>
                  <CardDescription>$18</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Tender chicken in a rich tomato-based curry sauce
                  </p>
                </CardContent>
              </Card>
              {/* Add more menu items */}
            </div>
          </div>
        );
      // Add cases for other industry types
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-64 bg-primary/10">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">{business.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {business.contactInfo?.address}
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400" />
                4.5 (123 reviews)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Left Column - Business Info */}
          <div className="md:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>About Us</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{business.description}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Mon-Fri: 9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>{business.contactInfo?.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>{business.contactInfo?.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Industry-specific content */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Our Services</h2>
              {renderIndustrySpecificContent()}
            </div>
          </div>

          {/* Right Column - Booking Widget */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Make a Booking</CardTitle>
                <CardDescription>
                  Choose a date and time for your appointment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Calendar
                    mode="single"
                    selected={new Date()}
                    className="rounded-md border"
                  />
                  <Button className="w-full">Check Availability</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
