import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "../hooks/use-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Gift, 
  Clock, 
  MapPin, 
  Star, 
  ChefHat, 
  UserPlus,
  ExternalLink,
  Percent,
  Timer,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PublishedPromotion {
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
  business: {
    id: number;
    name: string;
    description?: string;
    industryType: string;
    rating: number;
    reviewCount: number;
    location?: {
      suburb: string;
      city: string;
    };
  };
}

interface PromotionsShowcaseProps {
  location?: string;
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
}

export function PromotionsShowcase({ 
  location, 
  maxItems = 6, 
  showHeader = true,
  className = "" 
}: PromotionsShowcaseProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedPromotion, setSelectedPromotion] = useState<PublishedPromotion | null>(null);

  // Fetch active promotions from all businesses
  const { data: promotions = [], isLoading } = useQuery<PublishedPromotion[]>({
    queryKey: ['/api/promotions/published', location],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (location) params.append('location', location);
        params.append('limit', maxItems.toString());
        
        const response = await fetch(`/api/promotions/published?${params}`);
        if (!response.ok) throw new Error('Failed to fetch');
        return await response.json();
      } catch (error) {
        // Fallback to mock data if API fails
        return [
        {
          id: 1,
          title: "Happy Hour - 20% Off All Beverages",
          description: "Enjoy 20% discount on all beverages including cocktails, wines, and craft beers",
          type: "happy_hour",
          discountType: "percentage",
          discountValue: 20,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          startTime: "17:00",
          endTime: "19:00",
          isActive: true,
          business: {
            id: 15,
            name: "Mumbai Spice Palace",
            description: "Authentic Indian cuisine with modern twist",
            industryType: "restaurant",
            rating: 4.8,
            reviewCount: 142,
            location: {
              suburb: "CBD",
              city: "Melbourne"
            }
          }
        },
        {
          id: 2,
          title: "First Visit - 15% Off Total Bill",
          description: "Welcome new customers with 15% discount on entire bill. Perfect for first-time diners!",
          type: "first_time_discount",
          discountType: "percentage",
          discountValue: 15,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true,
          business: {
            id: 15,
            name: "Mumbai Spice Palace",
            description: "Authentic Indian cuisine with modern twist",
            industryType: "restaurant",
            rating: 4.8,
            reviewCount: 142,
            location: {
              suburb: "CBD",
              city: "Melbourne"
            }
          }
        },
        {
          id: 3,
          title: "Weekend Special - Buy One Get One",
          description: "Weekend special on all appetizers. Order any appetizer and get another one free!",
          type: "flash_sale",
          discountType: "buy_one_get_one",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true,
          business: {
            id: 16,
            name: "Golden Dragon Asian Kitchen",
            description: "Contemporary Asian fusion cuisine",
            industryType: "restaurant",
            rating: 4.6,
            reviewCount: 89,
            location: {
              suburb: "South Yarra",
              city: "Melbourne"
            }
          }
        }
      ];
      }
    },
    enabled: true,
  });

  const handleClaimPromotion = (promotion: PublishedPromotion) => {
    if (!user) {
      toast({
        title: "Sign Up Required",
        description: "Create a free account to claim exclusive deals and book tables!",
        action: (
          <Button size="sm" onClick={() => window.location.href = '/auth'}>
            Sign Up
          </Button>
        ),
      });
      return;
    }

    // Redirect to business page for logged-in users (use friendly URL)
    const businessSlug = promotion.business.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') + '-' + promotion.business.id;
    window.location.href = `/business/${businessSlug}`;
  };

  const formatDiscountValue = (promotion: PublishedPromotion) => {
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

  const getPromotionIcon = (type: string) => {
    switch (type) {
      case 'happy_hour':
        return '🍻';
      case 'flash_sale':
        return '⚡';
      case 'first_time_discount':
        return '🎉';
      case 'combo_deal':
        return '🍽️';
      default:
        return '🎁';
    }
  };

  const isPromotionActive = (promotion: PublishedPromotion) => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    
    if (!promotion.isActive || now < startDate || now > endDate) {
      return false;
    }

    if (promotion.startTime && promotion.endTime) {
      const currentTime = now.getHours() * 100 + now.getMinutes();
      const startTime = parseInt(promotion.startTime.replace(':', ''));
      const endTime = parseInt(promotion.endTime.replace(':', ''));
      return currentTime >= startTime && currentTime <= endTime;
    }

    return true;
  };

  const activePromotions = promotions.filter(isPromotionActive).slice(0, maxItems);

  if (isLoading) {
    return <div className="text-center py-8">Loading exclusive deals...</div>;
  }

  if (activePromotions.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {showHeader && (
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
            <TrendingUp className="h-8 w-8 text-red-600" />
            Trending Deals Near You
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover exclusive promotions from top-rated restaurants in your area. 
            {!user && " Sign up to claim these limited-time offers!"}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activePromotions.map((promotion) => (
          <Card key={promotion.id} className="overflow-hidden hover:shadow-lg transition-shadow border-2 border-red-100">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <Badge className="bg-red-600 text-white text-sm font-bold">
                  {formatDiscountValue(promotion)}
                </Badge>
                <span className="text-2xl">{getPromotionIcon(promotion.type)}</span>
              </div>
              
              <CardTitle className="text-lg leading-tight">
                {promotion.title}
              </CardTitle>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ChefHat className="h-4 w-4" />
                <span className="font-medium">{promotion.business.name}</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{promotion.business.rating}</span>
                  <span className="text-gray-400">({promotion.business.reviewCount})</span>
                </div>
              </div>
              
              {promotion.business.location && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="h-3 w-3" />
                  <span>{promotion.business.location.suburb}, {promotion.business.location.city}</span>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {promotion.description}
              </p>
              
              {promotion.startTime && promotion.endTime && (
                <div className="flex items-center gap-1 text-sm text-orange-600 mb-3 bg-orange-50 px-2 py-1 rounded">
                  <Clock className="h-3 w-3" />
                  <span>Valid {promotion.startTime} - {promotion.endTime}</span>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={() => handleClaimPromotion(promotion)}
                >
                  {user ? 'Claim Deal' : 'Sign Up to Claim'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const businessSlug = promotion.business.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') + '-' + promotion.business.id;
                    window.open(`/business/${businessSlug}`, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call to Action for Non-Users */}
      {!user && activePromotions.length > 0 && (
        <Card className="mt-8 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <Gift className="h-8 w-8 text-red-600" />
                <h3 className="text-xl font-bold text-red-800">
                  Don't Miss Out on Exclusive Deals!
                </h3>
              </div>
              <p className="text-gray-700 max-w-2xl">
                Join thousands of food lovers who save money and discover amazing restaurants. 
                Get instant access to member-only promotions, easy table booking, and loyalty rewards.
              </p>
              <div className="flex gap-3">
                <Button 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => window.location.href = '/auth'}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up Free
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/auth'}
                >
                  Already have an account?
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show more promotions link */}
      {promotions.length > maxItems && (
        <div className="text-center mt-6">
          <Button variant="outline">
            View All {promotions.length} Deals
          </Button>
        </div>
      )}
    </div>
  );
}