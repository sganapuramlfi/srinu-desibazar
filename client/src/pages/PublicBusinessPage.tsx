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
import { VerifiedReviewSubmission } from "../components/VerifiedReviewSubmission";
import { TableBookingDialog } from "../components/TableBookingDialog";
import { UniversalBookingDialog, parseBookingIntent } from "../components/UniversalBookingDialog";
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
  Wifi,
  Car,
  CreditCard,
  Coffee,
  Accessibility,
  Volume2,
  Camera,
  Scissors,
  Sparkles,
  Globe,
  Facebook,
  Instagram,
  Navigation,
  ExternalLink,
  Award,
  TrendingUp,
  Zap,
  Shield,
  ThumbsUp,
  MessageCircle,
  Eye,
  DollarSign,
  Timer,
  ChevronRight,
  PlayCircle,
  Check,
  AlertCircle,
  ShieldCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AIAssistantWidgetWrapper, useAIStatusWrapper } from "@/components/AIIntegration";
import { useCart } from "@/contexts/CartContext";
import { CartButton, CartSidebar } from "@/components/ShoppingCart";

interface PublicBusinessPageProps {
  businessId?: number;
  slug?: string;
}

interface Business {
  id: number;
  name: string;
  description?: string;
  industryType: string;
  status: string;
  logoUrl?: string;
  publishedSections: string[];
  storefrontSettings: {
    showReviews?: boolean;
    showGallery?: boolean;
    showContactInfo?: boolean;
    showSocialMedia?: boolean;
    showOperatingHours?: boolean;
    theme?: string;
  };
  galleryImages?: string[];
  contactInfo?: {
    phone: string;
    email: string;
    address: string;
  };
  operatingHours?: Record<string, {
    open: string;
    close: string;
    isOpen: boolean;
  }>;
  amenities?: string[];
  socialMedia?: {
    website?: string;
    facebook?: string;
    instagram?: string;
  };
  partnerLinks?: {
    uberEats?: string;
    doorDash?: string;
    menulog?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  holidayPolicy?: string;
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
  isGlutenFree: boolean;
  category?: {
    id: number;
    name: string;
  };
}

interface Review {
  id: number;
  customerName: string;
  rating: number;
  comment: string;
  title?: string;
  businessResponse?: string;
  reviewDate: string;
  respondedAt?: string;
  isVerified: boolean;
}

// Amenity mapping with modern icons
const AMENITY_ICONS: Record<string, any> = {
  wifi: Wifi,
  free_wifi: Wifi,
  parking: Car,
  free_parking: Car,
  card_payment: CreditCard,
  takeaway: Gift,
  outdoor_seating: Users,
  family_friendly: Users,
  wheelchair_accessible: Accessibility,
  live_music: Volume2,
  photography: Camera,
  hair_styling: Scissors,
  makeup: Sparkles,
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: "Free Wi-Fi",
  free_wifi: "Free Wi-Fi", 
  parking: "Free Parking",
  free_parking: "Free Parking",
  card_payment: "Card Payment",
  takeaway: "Takeaway",
  outdoor_seating: "Outdoor Seating",
  family_friendly: "Family Friendly",
  wheelchair_accessible: "Wheelchair Accessible",
  live_music: "Live Music",
  photography: "Photography",
  hair_styling: "Hair Styling",
  makeup: "Makeup Services",
};

export default function PublicBusinessPage({ businessId, slug }: PublicBusinessPageProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { status: aiStatus } = useAIStatusWrapper();
  const { addToCart, setBusiness, state: cartState } = useCart();
  const [isLiked, setIsLiked] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  // Check for action parameter in URL to auto-trigger booking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'book' && user && business) {
      // Auto-trigger booking if user is logged in and business is loaded
      setTimeout(() => {
        handleBooking();
      }, 500); // Small delay to ensure component is fully mounted
    }
  }, [user, business]); // Re-run when user or business changes

  // Determine which identifier to use
  const actualBusinessId = businessId;
  const actualSlug = slug;

  // Always call slug resolution hook, but enable conditionally  
  const { data: slugResolution } = useQuery({
    queryKey: [`/api/public/businesses/slug/${actualSlug || 'placeholder'}`],
    enabled: !!actualSlug && !actualBusinessId,
    select: (data: any) => data
  });

  const finalBusinessId = actualBusinessId || slugResolution?.businessId;

  // Debug logging (remove in production)
  console.log('PublicBusinessPage props:', { 
    businessId, 
    slug, 
    actualBusinessId, 
    actualSlug, 
    finalBusinessId,
    user: user?.email || 'not logged in',
    slugResolution 
  });

  // Fetch business profile (public with publishing controls)
  const { data: business, isLoading: businessLoading } = useQuery<Business>({
    queryKey: [`/api/public/businesses/${finalBusinessId}/profile`],
    enabled: !!finalBusinessId,
  });

  // Set business context for cart when business data is loaded
  useEffect(() => {
    if (business && business.id !== cartState.businessId) {
      setBusiness(business.id, business.name);
    }
  }, [business?.id, business?.name, cartState.businessId]);

  // Fetch dynamic content based on published sections
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: [`/api/public/businesses/${finalBusinessId}/content/menu`],
    enabled: !!finalBusinessId && business?.publishedSections?.includes('menu'),
    select: (data: any) => data.content || []
  });

  // Fetch services for salons
  const { data: services = [] } = useQuery<any[]>({
    queryKey: [`/api/public/businesses/${finalBusinessId}/content/services`],
    enabled: !!finalBusinessId && business?.publishedSections?.includes('services'),
    select: (data: any) => data.content || []
  });

  // Staff is not public information - removed for all industry types

  // Fetch real reviews from API - MUST BE BEFORE ANY EARLY RETURNS
  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: [`/api/businesses/${finalBusinessId}/reviews/public`],
    enabled: !!finalBusinessId,
  });

  if (businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading amazing business...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Not Found</h1>
          <p className="text-gray-600">The business you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleProtectedAction = (action: string) => {
    if (!user) {
      toast({
        title: "Sign up required",
        description: `Please sign up to ${action} from this business.`,
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/auth'}
          >
            Sign Up
          </Button>
        ),
      });
      return;
    }

    // User is logged in - handle the action
    if (action === 'book' || action === 'book an appointment') {
      handleBooking();
    } else if (action === 'order') {
      handleOrdering();
    }
  };

  const handleBooking = () => {
    if (!business) return;
    
    // Parse any booking intent from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    const bookingIntent = parseBookingIntent(business, query);
    
    // Use Universal Booking Dialog for all industries
    setIsBookingDialogOpen(true);
  };

  const handleAddToCart = (item: MenuItem) => {
    if (!user) {
      toast({
        title: "Sign up required",
        description: "Please sign up to order from this business.",
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/auth'}
          >
            Sign Up
          </Button>
        ),
      });
      return;
    }

    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.imageUrl,
      category: item.category?.name
    });

    toast({
      title: "Added to Cart",
      description: `${item.name} has been added to your cart.`,
    });
  };

  const handleOrdering = () => {
    // This is now just for the general "Order" button - opens cart or shows message
    if (!business) return;
    
    if (business.industryType === 'restaurant' && menuItems.length > 0) {
      toast({
        title: "Browse Menu",
        description: "Add items to your cart from the menu below, then checkout when ready.",
      });
    } else {
      toast({
        title: "Ordering Coming Soon",
        description: "Online ordering will be available soon.",
      });
    }
  };

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    const categoryName = item.category?.name || "Other";
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);


  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
    : 0;

  const isCurrentlyOpen = () => {
    if (!business.operatingHours) return null;
    
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const todayHours = business.operatingHours[currentDay];
    if (!todayHours || !todayHours.isOpen) return false;
    
    const openTime = parseInt(todayHours.open.replace(':', ''));
    const closeTime = parseInt(todayHours.close.replace(':', ''));
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  const currentlyOpen = isCurrentlyOpen();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Smart Hero Section - All Key Info Above the Fold */}
      <div className="relative bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          
          {/* Top Row - Logo, Name, Rating, Status */}
          <div className="flex flex-col lg:flex-row items-center justify-between mb-8">
            <div className="flex items-center gap-6 mb-4 lg:mb-0">
              {business.logoUrl && (
                <img 
                  src={business.logoUrl} 
                  alt={`${business.name} logo`}
                  className="w-16 h-16 rounded-full shadow-xl border-3 border-white/20"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                  {business.name}
                </h1>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{averageRating.toFixed(1)}</span>
                    <span className="text-white/80 text-sm">({reviews.length} reviews)</span>
                  </div>
                  {currentlyOpen !== null && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                      currentlyOpen 
                        ? 'bg-green-500/20 text-green-100' 
                        : 'bg-red-500/20 text-red-100'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${currentlyOpen ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span>{currentlyOpen ? 'Open Now' : 'Closed'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={() => handleProtectedAction('book')}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Book Table
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => handleProtectedAction('order')}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Order
              </Button>
            </div>
          </div>

          {/* Smart Info Grid - Address, Amenities, Connect */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Address & Location */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="h-5 w-5 text-white" />
                <h3 className="font-semibold">Location</h3>
              </div>
              {business.contactInfo?.address && (
                <p className="text-white/90 text-sm mb-3">{business.contactInfo.address}</p>
              )}
              <div className="flex gap-2">
                {business.location?.latitude && business.location?.longitude && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white hover:bg-white/20 px-3 py-1 h-auto"
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${business.location!.latitude},${business.location!.longitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Navigation className="mr-1 h-3 w-3" />
                    Directions
                  </Button>
                )}
                {business.contactInfo?.phone && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white hover:bg-white/20 px-3 py-1 h-auto"
                    onClick={() => window.open(`tel:${business.contactInfo!.phone}`, '_self')}
                  >
                    <Phone className="mr-1 h-3 w-3" />
                    Call
                  </Button>
                )}
              </div>
            </div>

            {/* Key Amenities */}
            {business.amenities && business.amenities.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="h-5 w-5 text-white" />
                  <h3 className="font-semibold">Features</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {business.amenities.slice(0, 6).map((amenity, index) => {
                    const IconComponent = AMENITY_ICONS[amenity] || Coffee;
                    const label = AMENITY_LABELS[amenity] || amenity.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <IconComponent className="h-3 w-3 text-white/80" />
                        <span className="text-white/90 text-xs">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Connect With Us */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="h-5 w-5 text-white" />
                <h3 className="font-semibold">Connect</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {business.socialMedia?.website && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white hover:bg-white/20 p-2 h-auto flex flex-col gap-1"
                    onClick={() => window.open(business.socialMedia!.website, '_blank')}
                  >
                    <Globe className="h-4 w-4" />
                    <span className="text-xs">Website</span>
                  </Button>
                )}
                {business.socialMedia?.instagram && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white hover:bg-white/20 p-2 h-auto flex flex-col gap-1"
                    onClick={() => window.open(business.socialMedia!.instagram, '_blank')}
                  >
                    <Instagram className="h-4 w-4" />
                    <span className="text-xs">Instagram</span>
                  </Button>
                )}
                {business.socialMedia?.facebook && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white hover:bg-white/20 p-2 h-auto flex flex-col gap-1"
                    onClick={() => window.open(business.socialMedia!.facebook, '_blank')}
                  >
                    <Facebook className="h-4 w-4" />
                    <span className="text-xs">Facebook</span>
                  </Button>
                )}
              </div>
              
              {/* Quick Actions */}
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-white hover:bg-white/20 px-2 py-1 h-auto flex-1"
                  onClick={() => setIsLiked(!isLiked)}
                >
                  <Heart className={`mr-1 h-3 w-3 ${isLiked ? 'fill-red-400 text-red-400' : ''}`} />
                  <span className="text-xs">{isLiked ? 'Liked' : 'Like'}</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-white hover:bg-white/20 px-2 py-1 h-auto flex-1"
                >
                  <Share2 className="mr-1 h-3 w-3" />
                  <span className="text-xs">Share</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Business Description - Compact */}
          <div className="mt-6 text-center">
            <p className="text-white/90 max-w-4xl mx-auto leading-relaxed">
              {business.description}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        {/* Gallery Section - Only if enabled in storefront settings */}
        {business.storefrontSettings?.showGallery !== false && business.galleryImages && business.galleryImages.length > 0 && (
          <Card className="overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Camera className="h-6 w-6" />
                Gallery
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {business.galleryImages.length} Photos
                </Badge>
              </CardTitle>
              <CardDescription className="text-white/90">
                See our space and atmosphere
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {business.galleryImages.map((image, index) => (
                  <div 
                    key={index} 
                    className="relative group cursor-pointer overflow-hidden rounded-xl"
                    onClick={() => setViewingImage(image)}
                  >
                    <img 
                      src={image} 
                      alt={`${business.name} - Image ${index + 1}`}
                      className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        // Fallback to a placeholder
                        e.currentTarget.src = `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop&auto=format`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dynamic Content Sections Based on Publishing Settings */}
        
        {/* Menu Section - Restaurant */}
        {business.publishedSections?.includes('menu') && Object.keys(groupedMenuItems).length > 0 && (
          <Card className="overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <ChefHat className="h-6 w-6" />
                Our Menu
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {menuItems.length} Items
                </Badge>
              </CardTitle>
              <CardDescription className="text-white/90">
                Authentic flavors crafted with passion
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {Object.entries(groupedMenuItems).map(([categoryName, items]) => (
                <div key={categoryName} className="mb-12 last:mb-0">
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">{categoryName}</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent"></div>
                    <Badge variant="outline" className="text-gray-600">
                      {items.length} items
                    </Badge>
                  </div>
                  
                  <div className="grid gap-6">
                    {items.map((item) => (
                      <div key={item.id} className="group bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-200">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Item Image */}
                          <div className="md:w-32 md:h-32 w-full h-48 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.src = `https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=300&fit=crop&auto=format`;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ChefHat className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* Item Details */}
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-xl font-semibold text-gray-900">{item.name}</h4>
                                  <div className="flex gap-1">
                                    {item.isVegetarian && (
                                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                                        VEG
                                      </Badge>
                                    )}
                                    {item.isVegan && (
                                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                                        VEGAN
                                      </Badge>
                                    )}
                                    {item.isHalal && (
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                        HALAL
                                      </Badge>
                                    )}
                                    {item.isGlutenFree && (
                                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                        GF
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <p className="text-gray-600 mb-3 leading-relaxed">{item.description}</p>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  {item.preparationTime && (
                                    <div className="flex items-center gap-1">
                                      <Timer className="h-4 w-4" />
                                      <span>{item.preparationTime} min</span>
                                    </div>
                                  )}
                                  {item.spiceLevel && item.spiceLevel > 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-red-500">🌶️</span>
                                      <span>Spice Level {item.spiceLevel}/5</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Price & Action */}
                              <div className="flex flex-col items-end gap-3 md:text-right">
                                <div className="text-3xl font-bold text-gray-900">
                                  ${item.price}
                                </div>
                                <Button 
                                  size="sm"
                                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6"
                                  onClick={() => handleAddToCart(item)}
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  {user ? 'Add to Cart' : 'Sign Up to Order'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Services Section - Salon */}
        {business.publishedSections?.includes('services') && services.length > 0 && (
          <Card className="overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Scissors className="h-6 w-6" />
                Our Services
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {services.length} Services
                </Badge>
              </CardTitle>
              <CardDescription className="text-white/90">
                Professional services tailored to your needs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6">
                {services.map((service: any) => (
                  <div key={service.id} className="group bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-200">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Service Image */}
                      <div className="md:w-32 md:h-32 w-full h-48 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
                        {service.imageUrl ? (
                          <img 
                            src={service.imageUrl} 
                            alt={service.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.src = `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=300&fit=crop&auto=format`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Scissors className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Service Details */}
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h4>
                            <p className="text-gray-600 mb-3 leading-relaxed">{service.description}</p>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {service.duration && (
                                <div className="flex items-center gap-1">
                                  <Timer className="h-4 w-4" />
                                  <span>{service.duration} min</span>
                                </div>
                              )}
                              {service.specialization && (
                                <div className="flex items-center gap-1">
                                  <Sparkles className="h-4 w-4" />
                                  <span>{service.specialization}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Price & Action */}
                          <div className="flex flex-col items-end gap-3 md:text-right">
                            <div className="text-3xl font-bold text-gray-900">
                              ${service.price}
                            </div>
                            <Button 
                              size="sm"
                              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6"
                              onClick={() => handleProtectedAction('book an appointment')}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {user ? 'Book Service' : 'Sign Up to Book'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Staff Section - Removed (Staff information is internal, not public) */}

        {/* Reviews Section - Only if enabled in storefront settings - ALWAYS LAST */}
        {business.storefrontSettings?.showReviews !== false && (
        <Card className="overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Star className="h-6 w-6 fill-current" />
              Customer Reviews
              <Badge variant="secondary" className="bg-white/20 text-white">
                {averageRating.toFixed(1)} ★
              </Badge>
            </CardTitle>
            <CardDescription className="text-white/90">
              What our customers are saying
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {review.customerName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{review.customerName}</h4>
                            {review.isVerified && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Verified Customer
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{new Date(review.reviewDate).toLocaleDateString()}</span>
                    </div>
                    
                    {review.title && (
                      <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
                    )}
                    <p className="text-gray-700 leading-relaxed mb-4">{review.comment}</p>
                    
                    {/* Business Response */}
                    {review.businessResponse && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold">B</span>
                          </div>
                          <span className="font-medium text-blue-900">Business Response</span>
                          {review.respondedAt && (
                            <span className="text-xs text-blue-600">
                              {new Date(review.respondedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-blue-800 text-sm">{review.businessResponse}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
                  <p className="text-gray-600">Be the first to share your experience!</p>
                </div>
              )}
            </div>
            <div className="mt-6 text-center">
              <VerifiedReviewSubmission 
                businessId={businessId}
                businessName={business.name}
                onReviewSubmitted={() => {
                  // Refresh reviews when a new one is submitted
                  // This will be handled by the component's query invalidation
                }}
              />
            </div>
          </CardContent>
        </Card>
        )}

      </div>

      {/* Image Viewer Dialog */}
      {viewingImage && (
        <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
          <DialogContent className="max-w-4xl p-0">
            <img 
              src={viewingImage} 
              alt="Gallery image"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Shopping Cart Components */}
      <CartButton />
      <CartSidebar />
      
      {/* Table Booking Dialog */}
      {business && (
        <UniversalBookingDialog
          isOpen={isBookingDialogOpen}
          onClose={() => setIsBookingDialogOpen(false)}
          business={{
            id: business.id,
            name: business.name,
            industryType: business.industryType,
            slug: business.slug
          }}
          initialIntent={{
            // Parse booking intent from URL if available
            ...(() => {
              const urlParams = new URLSearchParams(window.location.search);
              const query = urlParams.get('q') || '';
              return parseBookingIntent(business, query);
            })()
          }}
        />
      )}
      
      {/* AI Assistant Widget - Available on storefront */}
      {aiStatus?.enabled && <AIAssistantWidgetWrapper />}
    </div>
  );
}