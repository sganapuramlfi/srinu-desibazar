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
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Phone,
  Mail,
  Star,
  Wifi,
  Car,
  CreditCard,
  Coffee,
  CheckCircle2
} from "lucide-react";
import type { Business } from "@db/schema";

interface StorefrontPageProps {
  params: {
    businessId: string;
  };
}

export default function StorefrontPage({ params }: StorefrontPageProps) {
  const businessId = parseInt(params.businessId);
  const [, navigate] = useLocation();

  // Fetch business data
  const { data: business, isLoading } = useQuery<Business>({
    queryKey: [`/api/businesses/${businessId}/profile`],
    enabled: !!businessId,
  });

  if (isLoading || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  const amenities = business.amenities || [
    { icon: "Wifi", name: "Free Wi-Fi", enabled: true },
    { icon: "Car", name: "Free Parking", enabled: true },
    { icon: "CreditCard", name: "Card Payment", enabled: true },
    { icon: "Coffee", name: "Refreshments", enabled: true },
  ];

  // Helper function to get icon component
  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: typeof Wifi } = {
      Wifi,
      Car,
      CreditCard,
      Coffee,
    };
    return icons[iconName] || Coffee;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Business Profile */}
      <div className="relative h-[400px] bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-6">
              {/* Business Logo */}
              <div className="w-32 h-32 bg-white rounded-lg shadow-lg flex items-center justify-center">
                <img
                  src={business.logo || "/default-logo.png"}
                  alt={`${business.name} logo`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">{business.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {business.contactInfo?.address}
                  </span>
                  {business.status === "active" && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Verified Business
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Left Column - Business Info & Services */}
          <div className="md:col-span-2 space-y-8">
            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle>About Us</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{business.description}</p>

                {/* Operating Hours */}
                <div className="mt-6 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Operating Hours
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {business.operatingHours && Object.entries(business.operatingHours).map(([day, hours]) => (
                      <div key={day}>
                        <p className="font-medium capitalize">{day}</p>
                        <p className="text-muted-foreground">
                          {hours.isOpen ? `${hours.open} - ${hours.close}` : 'Closed'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="mt-6 space-y-2">
                  {business.contactInfo?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>{business.contactInfo.phone}</span>
                    </div>
                  )}
                  {business.contactInfo?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <span>{business.contactInfo.email}</span>
                    </div>
                  )}
                </div>

                {/* Social Media Links */}
                {business.socialMedia && Object.entries(business.socialMedia).some(([_, url]) => url) && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">Connect With Us</h3>
                    <div className="flex gap-4">
                      {Object.entries(business.socialMedia).map(([platform, url]) => (
                        url && (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                          >
                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Photo Gallery */}
            {business.gallery && business.gallery.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Gallery</h2>
                <Carousel className="w-full">
                  <CarouselContent>
                    {business.gallery.map((image, index) => (
                      <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                        <div className="p-1">
                          <div className="overflow-hidden rounded-lg aspect-square">
                            <img
                              src={image.url}
                              alt={image.caption || `Gallery image ${index + 1}`}
                              className="object-cover w-full h-full hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>
            )}

            {/* Amenities Section */}
            {amenities && amenities.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {amenities.filter(amenity => amenity.enabled).map((amenity) => {
                    const IconComponent = getIconComponent(amenity.icon);
                    return (
                      <Card key={amenity.name}>
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <IconComponent className="h-8 w-8 text-primary mb-2" />
                          <span className="text-sm font-medium">{amenity.name}</span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Booking Widget */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Book an Appointment</CardTitle>
                <CardDescription>
                  Choose a date and time for your visit
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