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
import { SimpleLocationAd } from "@/components/advertising/SimpleLocationAd";
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

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  // const { trackCategoryView } = useCategoryTracking();

  const { data: businesses, isLoading } = useQuery<Business[]>({
    queryKey: ["/api/businesses", selectedIndustry],
    enabled: true,
  });

  const { data: statistics } = useQuery({
    queryKey: ["/api/statistics"],
    enabled: true,
  });

  return (
    <div className="min-h-screen">
      {/* Location Permission Dialog - Temporarily disabled for debugging */}
      {/* <LocationPermissionDialog /> */}
      
      {/* Single Unified 12-Column Grid Container - Everything Inside */}
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-0 min-h-screen">
          
          {/* Left Sponsored Column - Smart Location-Aware Ads */}
          <div className="hidden lg:block lg:col-span-2 pr-4">
            <SimpleLocationAd position="sidebar_left" />
          </div>
          
          {/* Main Content - Full width on mobile/tablet, 8/12 on large screens */}
          <div className="col-span-12 lg:col-span-8 px-0 lg:px-4">
            
            {/* Mobile/Tablet Offers Banner - Only visible on smaller screens */}
            <div className="lg:hidden bg-gradient-to-r from-purple-500 via-green-500 to-blue-500 text-white p-4 rounded-lg mb-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <h3 className="font-bold text-sm">Special Offers Available!</h3>
                    <p className="text-xs opacity-90">Hair, Spa & Wellness Services</p>
                  </div>
                </div>
                <button className="bg-white text-purple-600 px-4 py-2 rounded font-bold text-xs hover:bg-gray-100 transition-all">
                  View Offers
                </button>
              </div>
            </div>
            {/* Enhanced Hero Section - Grid Aligned */}
            <section className="relative py-12 px-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg mb-6">
              <div className="text-center">
                <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
                  Book Local Services Instantly
                </h1>
                <p className="text-xl text-muted-foreground mb-6">
                  Connect with {statistics?.totalBusinesses || '12,000'}+ verified businesses across 6 industries
                </p>
          
          {/* Registration Benefits Section */}
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 mb-8 border border-primary/20">
            <h3 className="text-lg font-semibold text-primary mb-4">
              Join DesiBazaar Community - Register User & Business
            </h3>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* User Registration Benefits */}
              <div className="text-left">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Register as User
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Save favorite businesses & services
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Track booking history & preferences
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Get exclusive offers & discounts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Quick booking with saved details
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => navigate("/auth?mode=register")}
                >
                  Register as User
                </Button>
              </div>
              
              {/* Business Registration Benefits */}
              <div className="text-left">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  List Your Business
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Reach thousands of local customers
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Manage bookings & appointments
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Build online reputation with reviews
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Free basic listing, premium options
                  </li>
                </ul>
                <Button 
                  className="w-full mt-4"
                  onClick={() => navigate("/register")}
                >
                  List Your Business Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Trust Statistics */}
          <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>{statistics?.totalCustomers?.toLocaleString() || '500K'}+ Happy Customers</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <span>{statistics?.averageRating || '4.8'} Average Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Verified Businesses</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span>Instant Booking</span>
            </div>
          </div>

          <div className="flex max-w-xl mx-auto gap-2">
            <Input
              placeholder="Search 'hair salon near me' or 'best restaurants'..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-lg"
            />
            <Button size="lg">
              <Search className="mr-2 h-5 w-5" />
              Search
            </Button>
          </div>
          
          {/* Popular Searches */}
          <div className="mt-4 text-sm text-muted-foreground">
            <span className="mr-2">Popular:</span>
            <button className="hover:text-primary mx-1">Hair Salon</button>
            <span className="text-muted-foreground/50">•</span>
            <button className="hover:text-primary mx-1">Restaurant Booking</button>
            <span className="text-muted-foreground/50">•</span>
            <button className="hover:text-primary mx-1">Wedding Planners</button>
            <span className="text-muted-foreground/50">•</span>
            <button className="hover:text-primary mx-1">Real Estate</button>
          </div>
        </div>
              </section>

            {/* Rich Industry Categories - Grid Aligned */}
            <section className="py-8 px-0 mb-6">
        <div>
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
              const realCount = statistics?.industryStats?.[id] || count;
              return (
              <Card
                key={id}
                className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                  selectedIndustry === id ? "border-primary shadow-md" : ""
                }`}
                onClick={() => {
                  setSelectedIndustry(id);
                  // trackCategoryView(id); // Smart ad targeting
                }}
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
                  >
                    Explore {name}
                    <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
            </section>

            {/* Enhanced Featured Businesses */}
            <section className="py-16 px-4 bg-muted/50">
        <div>
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
              {businesses?.map((business) => (
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
        </div>
            </section>

            {/* Social Proof & Trust Section */}
            <section className="py-16 px-4">
        <div>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Trusted by Local Communities
            </h2>
            <p className="text-muted-foreground">
              Real experiences from real customers
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current text-yellow-500" />
                    ))}
                  </div>
                </div>
                <CardDescription>
                  "Found the perfect wedding venue through DesiBazaar. The booking process was seamless and the service was exceptional!"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">S</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Sarah M.</div>
                    <div className="text-sm text-muted-foreground">Event Planning</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current text-yellow-500" />
                    ))}
                  </div>
                </div>
                <CardDescription>
                  "As a business owner, DesiBazaar helped me grow my salon by 300%. The platform brings quality customers consistently."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">R</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Raj P.</div>
                    <div className="text-sm text-muted-foreground">Salon Owner</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current text-yellow-500" />
                    ))}
                  </div>
                </div>
                <CardDescription>
                  "Quick restaurant reservations, reliable service providers, and honest reviews. DesiBazaar is my go-to app now!"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">A</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Anita K.</div>
                    <div className="text-sm text-muted-foreground">Regular Customer</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
            </section>

            {/* Business CTA Section */}
            <section className="py-16 px-4 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Grow Your Business with DesiBazaar
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join 12,000+ businesses that trust us to connect them with quality customers
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
          
          {/* Right Sponsored Column - Smart Location-Aware Ads */}  
          <div className="hidden lg:block lg:col-span-2 pl-4">
            <SimpleLocationAd position="sidebar_right" />
          </div>
          
        </div>
      </div>
    </div>
  );
}
