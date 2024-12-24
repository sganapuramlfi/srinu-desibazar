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
  ChevronRight,
  Trash2,
} from "lucide-react";
import type { Business } from "@db/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";

interface StorefrontPageProps {
  params: {
    businessId: string;
  };
}

export default function StorefrontPage({ params }: StorefrontPageProps) {
  const businessId = parseInt(params.businessId);
  const [, navigate] = useLocation();
  const { user } = useUser();

  const { data: business, isLoading } = useQuery<Business>({
    queryKey: [`/api/businesses/${businessId}/profile`],
    enabled: !!businessId,
  });

  const queryClient = useQueryClient();

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoIndex: number) => {
      const response = await fetch(`/api/businesses/${businessId}/gallery/${photoIndex}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/profile`] });
    },
  });

  const handleDeletePhoto = async (photoIndex: number) => {
    try {
      await deletePhotoMutation.mutateAsync(photoIndex);
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  if (isLoading || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  const amenities = business.amenities || [];

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
      {/* Hero Section with Business Info */}
      <div className="relative bg-gradient-to-r from-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Business Info */}
            <div className="flex-1">
              <div className="flex items-start gap-6">
                {/* Logo */}
                <div className="w-24 h-24 bg-white rounded-lg shadow-lg flex items-center justify-center overflow-hidden">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={`${business.name} logo`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.src = 'https://via.placeholder.com/96';
                      }}
                    />
                  ) : (
                    <AlertCircle className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-3xl font-bold">{business.name}</h1>
                      {business.status === "active" && (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm mt-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Verified Business
                        </span>
                      )}
                    </div>
                    <Button size="lg" className="hidden md:flex">
                      Book Appointment
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quick Info Grid */}
                  <div className="grid md:grid-cols-3 gap-6 mt-6">
                    {/* Location & Contact */}
                    <div className="space-y-2">
                      {business.contactInfo?.address && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                          <span>{business.contactInfo.address}</span>
                        </div>
                      )}
                      {business.contactInfo?.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-primary" />
                          <span>{business.contactInfo.phone}</span>
                        </div>
                      )}
                      {business.contactInfo?.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-primary" />
                          <span>{business.contactInfo.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Hours Summary */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>Today's Hours</span>
                      </div>
                      {business.operatingHours && (
                        <div className="text-sm">
                          {business.operatingHours[Object.keys(business.operatingHours)[0]]?.isOpen ? (
                            <span className="text-green-600">
                              Open: {business.operatingHours[Object.keys(business.operatingHours)[0]]?.open} - {business.operatingHours[Object.keys(business.operatingHours)[0]]?.close}
                            </span>
                          ) : (
                            <span className="text-red-600">Closed</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-3">
                      {amenities.filter(amenity => amenity.enabled).map((amenity) => {
                        const IconComponent = getIconComponent(amenity.icon);
                        return (
                          <div
                            key={amenity.name}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/5 rounded-md text-xs"
                          >
                            <IconComponent className="h-3 w-3 text-primary" />
                            <span>{amenity.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Book Button */}
            <Button size="lg" className="md:hidden w-full">
              Book Appointment
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column - Services & About */}
          <div className="lg:col-span-8 space-y-8">
            {/* Services Section */}
            <Card>
              <CardHeader>
                <CardTitle>Our Services</CardTitle>
                <CardDescription>Choose from our range of professional services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Sample service card - will be replaced with actual services */}
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
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
                      <Button className="w-full">Book Now</Button>
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

                {/* Operating Hours */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-4">Operating Hours</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {business.operatingHours && Object.entries(business.operatingHours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="capitalize font-medium">{day}</span>
                        <span className="text-muted-foreground">
                          {hours.isOpen ? `${hours.open} - ${hours.close}` : 'Closed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Media Links */}
                {business.socialMedia && Object.entries(business.socialMedia).some(([_, url]) => url) && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold mb-4">Connect With Us</h3>
                    <div className="flex gap-4">
                      {Object.entries(business.socialMedia).map(([platform, url]) => (
                        url && (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 capitalize"
                          >
                            {platform}
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Gallery */}
          <div className="lg:col-span-4">
            {business.gallery && business.gallery.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Gallery</CardTitle>
                  {user && business.userId === user.id && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Manage Photos
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Manage Gallery Photos</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                          {business.gallery.map((image, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square rounded-md overflow-hidden bg-muted">
                                <img
                                  src={image.url}
                                  alt={image.caption || `Gallery image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.src = 'https://via.placeholder.com/300';
                                  }}
                                />
                              </div>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeletePhoto(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {business.gallery.slice(0, 4).map((image, index) => (
                      <div
                        key={index}
                        className="aspect-square rounded-md overflow-hidden bg-muted"
                      >
                        <img
                          src={image.url}
                          alt={image.caption || `Gallery image ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.src = 'https://via.placeholder.com/300';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {business.gallery.length > 4 && (
                    <Button variant="outline" className="w-full mt-4">
                      View All Photos ({business.gallery.length})
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}