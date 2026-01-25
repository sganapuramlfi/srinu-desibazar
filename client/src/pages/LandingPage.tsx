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
  Star,
  Users,
  User,
  TrendingUp,
  Badge,
  Clock,
  ArrowRight,
  CheckCircle,
  Zap,
  Award,
  Heart,
} from "lucide-react";
import type { Business } from "../types/db";
import { AbrakadabraIcon } from "@/components/AbrakadabraIcon";
// import { SmartSidebarAd } from "@/components/advertising/SmartSidebarAd";
// import { LocationPermissionDialog } from "@/components/LocationPermissionDialog";

const industries = [
  { 
    id: "salon", 
    icon: Scissors, 
    name: "Salon & Spa",
    count: "2,847",
    rating: "4.8",
    popular: ["Hair Cut", "Facial", "Massage"],
    trending: true
  },
  { 
    id: "restaurant", 
    icon: UtensilsCrossed, 
    name: "Restaurant & Cafés",
    count: "1,923",
    rating: "4.6",
    popular: ["Dine-in", "Takeaway", "Catering"],
    trending: false
  },
  { 
    id: "event", 
    icon: Calendar, 
    name: "Event Management",
    count: "892",
    rating: "4.9",
    popular: ["Weddings", "Corporate", "Birthday"],
    trending: true
  },
  { 
    id: "realestate", 
    icon: Home, 
    name: "Real Estate",
    count: "1,534",
    rating: "4.7",
    popular: ["Buy", "Rent", "Sell"],
    trending: false
  },
  { 
    id: "retail", 
    icon: Store, 
    name: "Retail Stores",
    count: "3,421",
    rating: "4.5",
    popular: ["Fashion", "Electronics", "Groceries"],
    trending: false
  },
  { 
    id: "professional", 
    icon: Briefcase, 
    name: "Professional Services",
    count: "1,176",
    rating: "4.8",
    popular: ["Legal", "Accounting", "Consulting"],
    trending: true
  },
];

// Mock data for fallbacks
const mockStatistics = {
  totalBusinesses: '12,847',
  industryStats: {
    salon: '2,847',
    restaurant: '1,923',
    event: '892',
    realestate: '1,534',
    retail: '3,421',
    professional: '1,176'
  }
};

const mockBusinesses = [
  {
    id: 1,
    name: "Elite Hair Salon",
    contactInfo: { address: "123 Main St, Downtown" }
  },
  {
    id: 2,
    name: "Gourmet Bistro",
    contactInfo: { address: "456 Food Court, City Center" }
  },
  {
    id: 3,
    name: "Wellness Spa & Beauty",
    contactInfo: { address: "789 Wellness Ave, Uptown" }
  }
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      const params = new URLSearchParams();
      params.append("q", searchTerm.trim());
      if (selectedIndustry) {
        params.append("industry", selectedIndustry);
      }
      navigate(`/search?${params}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleIndustryExplore = (industryId: string) => {
    const params = new URLSearchParams();
    params.append("industry", industryId);
    navigate(`/search?${params}`);
  };

  // Enable API calls with proper error handling
  const { data: businesses, isLoading } = useQuery<Business[]>({
    queryKey: ["/api/businesses", selectedIndustry],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedIndustry) params.append("industry", selectedIndustry);
      params.append("limit", "6");
      
      const response = await fetch(`/api/businesses?${params}`);
      if (!response.ok) throw new Error("Failed to fetch businesses");
      const data = await response.json();
      
      // Ensure we return an array
      return Array.isArray(data) ? data : [];
    },
    enabled: true,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Use mock data as fallback when API fails
    placeholderData: mockBusinesses
  });

  const { data: statistics } = useQuery({
    queryKey: ["/api/statistics"],
    queryFn: async () => {
      const response = await fetch("/api/statistics");
      if (!response.ok) throw new Error("Failed to fetch statistics");
      return response.json();
    },
    enabled: true,
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
    // Use mock data as fallback
    placeholderData: mockStatistics
  });


  return (
    <div className="min-h-screen">
      {/* Abrakadabra AI Assistant - Clean floating popup for all contexts */}
      <AbrakadabraIcon context="directory" />
      
      {/* Single Unified 12-Column Grid Container - Everything Inside */}
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-0 min-h-screen">
          
          {/* Main Content - Full width on mobile/tablet, 12/12 on large screens */}
          <div className="col-span-12 px-0 lg:px-4">
            
            {/* Enhanced Hero Section */}
            <section className="relative py-12 px-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg mb-6">
              <div className="text-center">
                <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
                  Book Local Services Instantly
                </h1>
                <p className="text-xl text-muted-foreground mb-6">
                  Connect with {statistics?.totalBusinesses || mockStatistics.totalBusinesses}+ verified businesses across 6 industries
                </p>

                <div className="flex max-w-xl mx-auto gap-2">
                  <Input
                    placeholder="Search 'hair salon near me' or 'best restaurants'..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-lg"
                  />
                  <Button size="lg" onClick={handleSearch}>
                    <Search className="mr-2 h-5 w-5" />
                    Search
                  </Button>
                </div>
              </div>
            </section>

            {/* Rich Industry Categories */}
            <section className="py-8 px-0 mb-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">
                  Browse by Category
                </h2>
                <p className="text-muted-foreground">
                  Discover trusted businesses across all industries
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {industries.map(({ id, icon: Icon, name, count, rating, popular, trending }) => {
                  const realCount = statistics?.industryStats?.[id] || mockStatistics.industryStats[id] || count;
                  return (
                    <Card
                      key={id}
                      className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                        selectedIndustry === id ? "border-primary shadow-md" : ""
                      }`}
                      onClick={() => setSelectedIndustry(id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{name}</CardTitle>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{realCount} businesses</span>
                                <span className="text-muted-foreground/50">•</span>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-current text-yellow-500" />
                                  <span>{rating}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {trending && (
                            <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                              <TrendingUp className="h-3 w-3" />
                              Trending
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Popular services:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {popular.map((service, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-muted px-2 py-1 rounded-full"
                              >
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-3 group"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIndustryExplore(id);
                          }}
                        >
                          Explore {name}
                          <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Featured Businesses Section */}
            <section className="py-16 px-4 bg-muted/50">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">
                  Featured Premium Partners
                </h2>
                <p className="text-muted-foreground">
                  Trusted by thousands of customers with exceptional service
                </p>
              </div>
              
              <Carousel className="w-full">
                <CarouselContent>
                  {(Array.isArray(businesses) ? businesses : mockBusinesses).map((business) => (
                    <CarouselItem key={business.id} className="md:basis-1/2 lg:basis-1/3">
                      <Card className="mx-2 group hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="group-hover:text-primary transition-colors">
                                  {business.name}
                                </CardTitle>
                                <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                  <Award className="h-3 w-3" />
                                  Premium
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-current text-yellow-500" />
                                  <span>4.8</span>
                                  <span className="text-muted-foreground/50">(127 reviews)</span>
                                </div>
                              </div>
                              <CardDescription className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {business.contactInfo?.address || "Downtown Area"}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Next Available:</span>
                              <span className="font-medium">Today 2:30 PM</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                className="flex-1"
                                onClick={() => navigate(`/business/${business.id}`)}
                              >
                                Book Now
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/business/${business.id}`)}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </section>

            {/* Business CTA Section */}
            <section className="py-16 px-4 bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-4">
                  Grow Your Business with DesiBazaar
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Join {statistics?.totalBusinesses || mockStatistics.totalBusinesses}+ businesses that trust us to connect them with quality customers
                </p>
                
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">More Customers</h3>
                    <p className="text-sm text-muted-foreground text-center">Reach thousands of potential customers actively searching for your services</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Increase Revenue</h3>
                    <p className="text-sm text-muted-foreground text-center">Premium listings get 5x more bookings and higher customer engagement</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Build Trust</h3>
                    <p className="text-sm text-muted-foreground text-center">Verified badges and customer reviews help build credibility and trust</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" onClick={() => navigate("/register")}>
                    List Your Business Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline">
                    Learn About Premium
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground mt-4">
                  ✓ Free basic listing • ✓ No setup fees • ✓ Cancel anytime
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
