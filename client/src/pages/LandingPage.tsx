import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Search,
  Scissors,
  UtensilsCrossed,
  Calendar,
  Home,
  Store,
  Briefcase,
  MapPin,
} from "lucide-react";
import type { Business } from "@db/schema";

const industries = [
  { id: "salon", icon: Scissors, name: "Salon & Spa" },
  { id: "restaurant", icon: UtensilsCrossed, name: "Restaurant & Cafés" },
  { id: "event", icon: Calendar, name: "Event Management" },
  { id: "realestate", icon: Home, name: "Real Estate" },
  { id: "retail", icon: Store, name: "Retail Stores" },
  { id: "professional", icon: Briefcase, name: "Professional Services" },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const { data: businesses, isLoading } = useQuery<Business[]>({
    queryKey: ["/api/businesses", selectedIndustry],
    enabled: true,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/20 to-primary/5">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
            Find Local Businesses & Services
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Discover and book services from top-rated local businesses
          </p>
          <div className="flex max-w-xl mx-auto gap-2">
            <Input
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-lg"
            />
            <Button size="lg">
              <Search className="mr-2 h-5 w-5" />
              Search
            </Button>
          </div>
        </div>
      </section>

      {/* Industry Categories */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Browse by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map(({ id, icon: Icon, name }) => (
              <Card
                key={id}
                className={`cursor-pointer transition-colors hover:border-primary ${
                  selectedIndustry === id ? "border-primary" : ""
                }`}
                onClick={() => setSelectedIndustry(id)}
              >
                <CardContent className="pt-6 text-center">
                  <Icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold">{name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Businesses */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Featured Businesses
          </h2>
          <Carousel className="w-full max-w-5xl mx-auto">
            <CarouselContent>
              {businesses?.map((business) => (
                <CarouselItem key={business.id} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="mx-2">
                    <CardHeader>
                      <CardTitle>{business.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {business.contactInfo?.address}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => navigate(`/business/${business.id}`)}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>
    </div>
  );
}
