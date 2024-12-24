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
  Wifi,
  Car,
  CreditCard,
  Coffee,
  CheckCircle2,
  AlertCircle,
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
      {/* Enhanced Hero Section with Contact & Hours */}
      <div className="relative h-[400px] bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute inset-0 p-6">
          <div className="max-w-7xl mx-auto h-full">
            <div className="flex flex-col h-full">
              {/* Top Section - Business Info */}
              <div className="flex items-center gap-6 mb-8">
                {/* Business Logo */}
                <div className="w-24 h-24 bg-white rounded-lg shadow-lg flex items-center justify-center overflow-hidden">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={`${business.name} logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <AlertCircle className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">{business.name}</h1>
                  {business.contactInfo?.address && (
                    <span className="flex items-center gap-1 text-muted-foreground text-sm">
                      <MapPin className="h-4 w-4" />
                      {business.contactInfo.address}
                    </span>
                  )}
                  {business.status === "active" && (
                    <span className="flex items-center gap-1 text-green-600 text-sm mt-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Verified Business
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Section - Quick Info Grid */}
              <div className="grid grid-cols-3 gap-4 mt-auto">
                {/* Contact Info */}
                <Card className="bg-white/95 backdrop-blur-sm">
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <Phone className="h-4 w-4 text-primary" />
                      Contact
                    </h3>
                    {business.contactInfo?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>{business.contactInfo.phone}</span>
                      </div>
                    )}
                    {business.contactInfo?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-primary" />
                        <span>{business.contactInfo.email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Operating Hours */}
                <Card className="bg-white/95 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-primary" />
                      Hours
                    </h3>
                    <div className="text-sm space-y-1 max-h-[120px] overflow-y-auto">
                      {business.operatingHours && Object.entries(business.operatingHours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize">{day}</span>
                          <span className="text-muted-foreground">
                            {hours.isOpen ? `${hours.open} - ${hours.close}` : 'Closed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Amenities */}
                <Card className="bg-white/95 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">Amenities</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {amenities.filter(amenity => amenity.enabled).map((amenity) => {
                        const IconComponent = getIconComponent(amenity.icon);
                        return (
                          <div key={amenity.name} className="flex items-center gap-2 text-sm">
                            <IconComponent className="h-4 w-4 text-primary" />
                            <span>{amenity.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column - Services & About */}
          <div className="lg:col-span-8 space-y-6">
            {/* Services Section */}
            <Card>
              <CardHeader>
                <CardTitle>Our Services</CardTitle>
                <CardDescription>Choose from our range of professional services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Service cards will be dynamically added here */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">Sample Service</CardTitle>
                          <CardDescription>45 mins • Professional service</CardDescription>
                        </div>
                        <span className="text-lg font-semibold">$50</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full">Book Now</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Book Appointment</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Calendar
                              mode="single"
                              selected={new Date()}
                              className="rounded-md border mx-auto"
                            />
                            <Button className="w-full">Check Available Slots</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle>About Us</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{business.description}</p>

                {/* Social Media Links */}
                {business.socialMedia && Object.entries(business.socialMedia).some(([_, url]) => url) && (
                  <div className="mt-4 pt-4 border-t">
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
          </div>

          {/* Right Column - Gallery and Quick Book */}
          <div className="lg:col-span-4 space-y-6">
            {/* Gallery Grid */}
            {business.gallery && business.gallery.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {business.gallery.slice(0, 4).map((image, index) => (
                      <div
                        key={index}
                        className="aspect-square rounded-md overflow-hidden"
                      >
                        <img
                          src={image.url}
                          alt={image.caption || `Gallery image ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                  {business.gallery.length > 4 && (
                    <Button variant="link" className="w-full mt-2">
                      View All Photos ({business.gallery.length})
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Book Widget */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Quick Book</CardTitle>
                <CardDescription>
                  Choose a service and book your appointment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full">View Available Services</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}