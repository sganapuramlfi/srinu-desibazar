import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "../hooks/use-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Badge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Star, 
  ChefHat, 
  Users, 
  Calendar,
  ShoppingCart,
  Gift,
  Truck,
  UserPlus,
  Heart,
  Share2,
  UtensilsCrossed,
  Info,
  ImageIcon,
  MessageSquare,
  Award,
  Wifi,
  CreditCard,
  Car,
  CheckCircle,
  ExternalLink,
  Zap,
  TrendingUp,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfessionalBusinessPageProps {
  businessSlug: string;
}

interface Business {
  id: number;
  name: string;
  description?: string;
  industryType: string;
  status: string;
  contactInfo?: {
    phone: string;
    email: string;
    address: string;
  };
}

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  imageUrl?: string;
  preparationTime?: number;
  spiceLevel?: number;
  isVegetarian: boolean;
  isVegan: boolean;
  isHalal: boolean;
  category?: {
    id: number;
    name: string;
  };
}

interface Promotion {
  id: number;
  title: string;
  description?: string;
  type: string;
  discountType: string;
  discountValue?: number;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isActive: boolean;
}

interface BusinessLocation {
  id: number;
  address: string;
  city: string;
  suburb?: string;
  state: string;
  postcode?: string;
}

interface RestaurantTable {
  id: number;
  tableNumber: string;
  seatingCapacity: number;
  location?: string;
}

export function ProfessionalBusinessPage({ businessSlug }: ProfessionalBusinessPageProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState("overview");

  // Extract business ID from slug (temporary solution until full slug support)
  const businessId = businessSlug.includes('-') ? 
    parseInt(businessSlug.split('-').pop() || '0') : 
    parseInt(businessSlug);

  // Fetch business profile by ID (using existing endpoint)
  const { data: business, isLoading: isLoadingBusiness } = useQuery<Business>({
    queryKey: [`/api/businesses/${businessId}/profile`],
    enabled: !!businessId && businessId > 0,
  });

  // Fetch menu items (public)
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: [`/api/restaurants/${business?.id}/menu/items`],
    enabled: !!business?.id && business?.industryType === "restaurant",
  });

  // Fetch active promotions (public)
  const { data: promotions = [] } = useQuery<Promotion[]>({
    queryKey: [`/api/restaurants/${business?.id}/promotions`],
    enabled: !!business?.id && business?.industryType === "restaurant",
  });

  // Fetch location
  const { data: location } = useQuery<BusinessLocation>({
    queryKey: [`/api/businesses/${business?.id}/location`],
    enabled: !!business?.id,
  });

  // Fetch tables (public view)
  const { data: tables = [] } = useQuery<RestaurantTable[]>({
    queryKey: [`/api/restaurants/${business?.id}/tables`],
    enabled: !!business?.id && business?.industryType === "restaurant",
  });

  const handleAuthenticatedAction = (action: string) => {
    if (!user) {
      setAuthAction(action);
      setShowAuthModal(true);
      return;
    }
    
    // Proceed with authenticated actions
    switch (action) {
      case 'booking':
        toast({ title: "Booking System", description: "Opening reservation system..." });
        break;
      case 'order':
        toast({ title: "Online Order", description: "Adding to cart..." });
        break;
      case 'promotion':
        toast({ title: "Promotion Applied", description: "Discount code copied!" });
        break;
    }
  };

  const formatDiscountValue = (promotion: Promotion) => {
    switch (promotion.discountType) {
      case 'percentage':
        return `${promotion.discountValue}% OFF`;
      case 'fixed_amount':
        return `$${promotion.discountValue} OFF`;
      case 'buy_one_get_one':
        return 'BOGO';
      default:
        return 'SPECIAL OFFER';
    }
  };

  const isPromotionActive = (promotion: Promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    return promotion.isActive && now >= startDate && now <= endDate;
  };

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    const categoryName = item.category?.name || "Other";
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const activePromotions = promotions.filter(isPromotionActive);

  // Mock business stats for professional display
  const businessStats = {
    totalOrders: 2847,
    happyCustomers: 1923,
    averageRating: 4.8,
    reviewCount: 142,
    responseTime: "12 min",
    deliveryTime: "25-35 min"
  };

  if (isLoadingBusiness) {
    return <div className="flex items-center justify-center min-h-screen">Loading restaurant...</div>;
  }

  if (!business) {
    return <div className="flex items-center justify-center min-h-screen">Restaurant not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header with Hero Section */}
      <div className="relative bg-gradient-to-r from-red-600 to-orange-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-4xl font-bold">{business.name}</h1>
                <Badge className="bg-green-500 text-white text-sm">
                  <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                  OPEN NOW
                </Badge>
              </div>
              
              <p className="text-xl text-white/90 mb-6">{business.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{businessStats.averageRating}</span>
                  <span className="text-white/80">({businessStats.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>Delivery: {businessStats.deliveryTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>{location?.suburb}, {location?.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>{businessStats.totalOrders}+ orders</span>
                </div>
              </div>
              
              {/* Primary Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  size="lg"
                  className="bg-white text-red-600 hover:bg-gray-100 font-semibold"
                  onClick={() => handleAuthenticatedAction('booking')}
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Reserve Table
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-red-600"
                  onClick={() => handleAuthenticatedAction('order')}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Order Online
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-red-600"
                  onClick={() => handleAuthenticatedAction('order')}
                >
                  <Truck className="h-5 w-5 mr-2" />
                  Delivery
                </Button>
              </div>
            </div>
            
            {/* Hero Image/Gallery */}
            <div className="relative">
              <div className="aspect-video bg-white/10 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-white/50" />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white text-gray-900 p-3 rounded-lg shadow-lg">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm font-medium">1.2k views today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Tabs Navigation */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 h-16 bg-transparent">
              <TabsTrigger value="overview" className="flex flex-col gap-1 h-full">
                <Info className="h-4 w-4" />
                <span className="text-xs">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex flex-col gap-1 h-full">
                <UtensilsCrossed className="h-4 w-4" />
                <span className="text-xs">Menu</span>
              </TabsTrigger>
              <TabsTrigger value="offers" className="flex flex-col gap-1 h-full">
                <Gift className="h-4 w-4" />
                <span className="text-xs">Offers</span>
                {activePromotions.length > 0 && (
                  <Badge className="h-4 w-4 p-0 text-xs bg-red-500 text-white rounded-full">
                    {activePromotions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reservations" className="flex flex-col gap-1 h-full">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Reserve</span>
              </TabsTrigger>
              <TabsTrigger value="info" className="flex flex-col gap-1 h-full">
                <MapPin className="h-4 w-4" />
                <span className="text-xs">Info</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex flex-col gap-1 h-full">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">Reviews</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{businessStats.happyCustomers}+</div>
                  <div className="text-sm text-gray-600">Happy Customers</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{businessStats.responseTime}</div>
                  <div className="text-sm text-gray-600">Response Time</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{businessStats.averageRating}/5</div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{businessStats.deliveryTime}</div>
                  <div className="text-sm text-gray-600">Delivery Time</div>
                </CardContent>
              </Card>
            </div>

            {/* Active Promotions Preview */}
            {activePromotions.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <Zap className="h-5 w-5" />
                    Limited Time Offers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {activePromotions.slice(0, 2).map((promotion) => (
                      <div key={promotion.id} className="bg-white p-4 rounded-lg border border-red-200">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-red-800">{promotion.title}</h3>
                          <Badge className="bg-red-600 text-white">
                            {formatDiscountValue(promotion)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{promotion.description}</p>
                        <Button 
                          size="sm" 
                          className="bg-red-600 hover:bg-red-700 w-full"
                          onClick={() => handleAuthenticatedAction('promotion')}
                        >
                          {user ? 'Claim Now' : 'Sign Up to Claim'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Popular Menu Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Customer Favorites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {menuItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <UtensilsCrossed className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{item.name}</h4>
                          {item.isVegetarian && <Badge variant="secondary" className="text-xs">VEG</Badge>}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-semibold text-lg">${item.price}</span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAuthenticatedAction('order')}
                          >
                            {user ? 'Add to Cart' : 'Sign Up to Order'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5" />
                  Complete Menu
                </CardTitle>
                <CardDescription>
                  Browse our full selection of authentic dishes
                  {!user && (
                    <Badge className="ml-2 bg-orange-100 text-orange-800">
                      Sign up to order online
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.entries(groupedMenuItems).map(([categoryName, items]) => (
                  <div key={categoryName} className="mb-8">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
                      {categoryName}
                    </h3>
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-lg">{item.name}</h4>
                              <div className="flex gap-1">
                                {item.isVegetarian && <Badge variant="secondary" className="text-xs">VEG</Badge>}
                                {item.isVegan && <Badge variant="secondary" className="text-xs">VEGAN</Badge>}
                                {item.isHalal && <Badge variant="secondary" className="text-xs">HALAL</Badge>}
                                {item.spiceLevel && (
                                  <Badge variant="outline" className="text-xs">
                                    🌶️ {item.spiceLevel}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-gray-600 mb-2">{item.description}</p>
                            {item.preparationTime && (
                              <p className="text-sm text-gray-500">Prep time: {item.preparationTime} min</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-bold text-xl mb-2">${item.price}</p>
                            <Button 
                              onClick={() => handleAuthenticatedAction('order')}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {user ? 'Add to Cart' : 'Sign Up to Order'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Special Offers & Promotions
                </CardTitle>
                <CardDescription>
                  Exclusive deals and limited-time offers
                  {!user && " - Sign up to claim these deals!"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {activePromotions.map((promotion) => (
                    <Card key={promotion.id} className="border-red-200">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <Badge className="bg-red-600 text-white text-sm font-bold">
                            {formatDiscountValue(promotion)}
                          </Badge>
                          <span className="text-2xl">🎉</span>
                        </div>
                        <CardTitle className="text-lg">{promotion.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">{promotion.description}</p>
                        {promotion.startTime && promotion.endTime && (
                          <div className="flex items-center gap-1 text-sm text-orange-600 mb-3 bg-orange-50 px-2 py-1 rounded">
                            <Clock className="h-3 w-3" />
                            <span>Valid {promotion.startTime} - {promotion.endTime}</span>
                          </div>
                        )}
                        <Button 
                          className="w-full bg-red-600 hover:bg-red-700"
                          onClick={() => handleAuthenticatedAction('promotion')}
                        >
                          {user ? 'Claim Deal' : 'Sign Up to Claim'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Table Reservations
                </CardTitle>
                <CardDescription>
                  Book your perfect dining experience
                  {!user && (
                    <Badge className="ml-2 bg-blue-100 text-blue-800">
                      Sign up to make reservations
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">Available Tables</h3>
                    <div className="space-y-3">
                      {tables.map((table) => (
                        <div key={table.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">Table {table.tableNumber}</span>
                            <p className="text-sm text-gray-600">
                              {table.seatingCapacity} guests • {table.location || "Main dining"}
                            </p>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => handleAuthenticatedAction('booking')}
                          >
                            {user ? 'Book Now' : 'Sign Up to Book'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">Reservation Benefits</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Guaranteed seating</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Special occasion setup</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Priority service</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Easy rescheduling</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full mt-4 bg-red-600 hover:bg-red-700"
                      onClick={() => handleAuthenticatedAction('booking')}
                    >
                      {user ? 'Make Reservation' : 'Sign Up to Reserve'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Opening Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Monday - Friday</span>
                      <span className="font-medium">9:00 AM - 10:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturday - Sunday</span>
                      <span className="font-medium">10:00 AM - 11:00 PM</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-green-600 font-medium">Currently Open</span>
                      <span className="text-sm text-gray-500">Closes at 10:00 PM</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location & Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {location && (
                      <div>
                        <p className="font-medium">Address</p>
                        <p className="text-gray-600">
                          {location.address}<br />
                          {location.suburb}, {location.city} {location.postcode}
                        </p>
                      </div>
                    )}
                    {business.contactInfo && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{business.contactInfo.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{business.contactInfo.email}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Amenities & Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Free WiFi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Card Payments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Parking Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Home Delivery</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Multi-Platform Integration</CardTitle>
                  <CardDescription>We're available on all major platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">Uber Eats</span>
                      <Button size="sm" variant="outline" onClick={() => window.open('https://ubereats.com', '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Order
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">DoorDash</span>
                      <Button size="sm" variant="outline" onClick={() => window.open('https://doordash.com', '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Order
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">OpenTable</span>
                      <Button size="sm" variant="outline" onClick={() => window.open('https://opentable.com', '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Reserve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Customer Reviews
                </CardTitle>
                <CardDescription>
                  What our customers are saying
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {[
                      { name: "Sarah Johnson", rating: 5, comment: "Amazing food and excellent service! The butter chicken was perfect.", date: "2 days ago" },
                      { name: "Mike Chen", rating: 4, comment: "Great atmosphere and authentic flavors. Will definitely come back.", date: "1 week ago" },
                      { name: "Emma Wilson", rating: 5, comment: "Best Indian restaurant in Melbourne CBD. Highly recommended!", date: "2 weeks ago" }
                    ].map((review, index) => (
                      <div key={index} className="border-b pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">{review.name[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium">{review.name}</p>
                            <div className="flex items-center gap-1">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              ))}
                              <span className="text-sm text-gray-500 ml-1">{review.date}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-600">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">Overall Rating</h3>
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-green-600">{businessStats.averageRating}</div>
                      <div className="flex justify-center gap-1 my-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">Based on {businessStats.reviewCount} reviews</p>
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={() => handleAuthenticatedAction('review')}
                    >
                      {user ? 'Write Review' : 'Sign Up to Review'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Authentication Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Join DesiBazaar Today!</DialogTitle>
            <DialogDescription className="text-center">
              Create your free account to unlock exclusive features
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Gift className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-medium">Exclusive Deals</h3>
                <p className="text-sm text-gray-600">Member-only promotions</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-medium">Easy Booking</h3>
                <p className="text-sm text-gray-600">Instant reservations</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-medium">Online Ordering</h3>
                <p className="text-sm text-gray-600">Pickup & delivery</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <Award className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <h3 className="font-medium">Loyalty Rewards</h3>
                <p className="text-sm text-gray-600">Earn points & prizes</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700" 
                onClick={() => window.location.href = '/auth'}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Sign Up Free
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.location.href = '/auth'}
              >
                Login
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}