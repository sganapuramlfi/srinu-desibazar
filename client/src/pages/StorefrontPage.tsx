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
    queryKey: ["/api/businesses", businessId],
    enabled: !!businessId,
  });

  if (isLoading || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  // Mock data for demo - would come from API in production
  const amenities = [
    { icon: Wifi, name: "Free Wi-Fi" },
    { icon: Car, name: "Free Parking" },
    { icon: CreditCard, name: "Card Payment" },
    { icon: Coffee, name: "Refreshments" },
  ];

  const reviews = [
    {
      id: 1,
      rating: 5,
      author: "Sarah M.",
      content: "Excellent service! Very professional and friendly staff.",
      date: "2024-12-20"
    },
    {
      id: 2,
      rating: 4,
      author: "John D.",
      content: "Great experience. Will definitely come back!",
      date: "2024-12-18"
    },
    // Add more reviews
  ];

  const gallery = [
    "/salon-1.jpg",
    "/salon-2.jpg",
    "/salon-3.jpg",
    // Add more images
  ];

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
                  src={business.logoUrl || "/default-logo.png"}
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
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    4.8 (48 reviews)
                  </span>
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
                    <div>
                      <p className="font-medium">Monday - Friday</p>
                      <p className="text-muted-foreground">9:00 AM - 6:00 PM</p>
                    </div>
                    <div>
                      <p className="font-medium">Saturday</p>
                      <p className="text-muted-foreground">10:00 AM - 4:00 PM</p>
                    </div>
                    <div>
                      <p className="font-medium">Sunday</p>
                      <p className="text-muted-foreground">Closed</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="mt-6 space-y-2">
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

            {/* Services Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Our Services</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Haircut & Styling</span>
                      <span className="text-lg">$30</span>
                    </CardTitle>
                    <CardDescription>45 mins • Professional cut and style</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">Book Now</Button>
                  </CardContent>
                </Card>
                {/* Add more service cards */}
              </div>
            </div>

            {/* Photo Gallery */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Gallery</h2>
              <Carousel className="w-full">
                <CarouselContent>
                  {gallery.map((image, index) => (
                    <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                      <div className="p-1">
                        <div className="overflow-hidden rounded-lg aspect-square">
                          <img
                            src={image}
                            alt={`Gallery image ${index + 1}`}
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

            {/* Amenities Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {amenities.map((amenity) => (
                  <Card key={amenity.name}>
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <amenity.icon className="h-8 w-8 text-primary mb-2" />
                      <span className="text-sm font-medium">{amenity.name}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Customer Reviews</h2>
              <div className="grid gap-6">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "text-yellow-400 fill-current"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-sm font-medium mt-1">{review.author}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{review.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
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