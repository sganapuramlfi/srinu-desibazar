import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Heart, Star, MapPin, Clock, Eye, X, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import "./SidebarAd.css";

interface AdCampaign {
  id: number;
  businessId: number;
  title: string;
  content: string;
  imageUrl?: string;
  clickUrl?: string;
  adType: "sidebar_left" | "sidebar_right";
  size: "small" | "medium" | "large" | "full";
  animationType: "static" | "slide" | "fade" | "flash" | "bounce";
  priority: number;
  business?: {
    name: string;
    industryType: string;
    contactInfo?: {
      address?: string;
    };
  };
}

interface SidebarAdProps {
  position: "sidebar_left" | "sidebar_right";
  maxAds?: number;
}

const sizeClasses = {
  small: "h-32 text-xs",
  medium: "h-48 text-sm", 
  large: "h-64 text-base",
  full: "h-80 text-base",
};

const animationClasses = {
  static: "",
  slide: "animate-[slideIn_0.8s_ease-out] hover:scale-105 transition-all duration-300",
  fade: "animate-[fadeIn_1.2s_ease-out] hover:brightness-110 transition-all duration-500",
  flash: "animate-[flash_2s_ease-in-out_infinite] shadow-lg shadow-primary/50",
  bounce: "animate-[bounce_1s_ease-in-out_infinite] hover:animate-[wiggle_0.5s_ease-in-out]",
};

export function SidebarAd({ position, maxAds = 3 }: SidebarAdProps) {
  const [visibleAds, setVisibleAds] = useState<Set<number>>(new Set());
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const trackedImpressions = useRef<Set<number>>(new Set());

  const adType = position;

  const { data: ads } = useQuery<AdCampaign[]>({
    queryKey: [`/api/advertising/targeted-ads`, adType],
    enabled: false, // Disabled until server API is working
    refetchInterval: 60000, // Refresh every minute
  });

  // Mock ads for development when no real ads exist
  const mockAds: AdCampaign[] = position === "sidebar_left" ? [
    {
      id: 1,
      businessId: 16,
      title: "🍛 Dosa Hut Special!",
      content: "Authentic South Indian dosas. Fresh ingredients, traditional recipes. Book your table now!",
      adType: "sidebar_left",
      size: "medium",
      animationType: "fade",
      priority: 5,
      business: {
        name: "Dosa Hut",
        industryType: "restaurant",
        contactInfo: { address: "Richmond" }
      }
    },
    {
      id: 2,
      businessId: 18,
      title: "🥙 Kebab Station",
      content: "Authentic Turkish kebabs & mezze. Halal certified. Order online now!",
      adType: "sidebar_left", 
      size: "small",
      animationType: "bounce",
      priority: 4,
      business: {
        name: "Kebab Station",
        industryType: "restaurant",
        contactInfo: { address: "Brunswick" }
      }
    }
  ] : [
    {
      id: 3,
      businessId: 19,
      title: "🍜 Thai Smile",
      content: "Beachside Thai restaurant. Fresh ingredients, Bangkok recipes. Dine-in special!",
      adType: "sidebar_right",
      size: "medium", 
      animationType: "slide",
      priority: 5,
      business: {
        name: "Thai Smile",
        industryType: "restaurant",
        contactInfo: { address: "St Kilda" }
      }
    },
    {
      id: 4,
      businessId: 20,
      title: "🍛 Punjabi Dhaba",
      content: "Highway-style Punjabi food. Tandoor specialties & fresh lassi bar!",
      adType: "sidebar_right",
      size: "small",
      animationType: "fade",
      priority: 4,
      business: {
        name: "Punjabi Dhaba",
        industryType: "restaurant",
        contactInfo: { address: "Dandenong" }
      }
    }
  ];

  // Use real ads if available, otherwise use mock ads for development
  const displayAds = ads && ads.length > 0 ? ads : mockAds;

  const activeAds = displayAds?.filter(ad => !visibleAds.has(ad.id)) || [];

  // Rotate ads every 15 seconds
  useEffect(() => {
    if (activeAds.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % activeAds.length);
    }, 15000);

    return () => clearInterval(timer);
  }, [activeAds.length]);

  const handleAdClick = async (ad: AdCampaign) => {
    // Track click analytics
    try {
      const response = await fetch('/api/advertising/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: ad.id,
          action: 'click',
          metadata: { position, timestamp: Date.now() }
        })
      });

      if (!response.ok) {
        console.warn(`Ad click tracking failed with status: ${response.status}`);
      }

      // Open ad URL even if tracking fails
      if (ad.clickUrl) {
        window.open(ad.clickUrl, '_blank');
      }
    } catch (error) {
      console.debug('Ad click tracking unavailable:', error);
      
      // Still allow the click action even if tracking fails
      if (ad.clickUrl) {
        window.open(ad.clickUrl, '_blank');
      }
    }
  };

  const handleAdImpression = async (adId: number) => {
    try {
      const response = await fetch('/api/advertising/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: adId,
          action: 'impression',
          metadata: { position, timestamp: Date.now() }
        })
      });
      
      if (!response.ok) {
        console.warn(`Ad impression tracking failed with status: ${response.status}`);
      }
    } catch (error) {
      // Silently fail in development to avoid spam
      console.debug('Ad impression tracking unavailable:', error);
    }
  };

  const hideAd = (adId: number) => {
    setVisibleAds(prev => new Set([...prev, adId]));
  };

  // Clamp index so closing an ad never leaves currentAdIndex out of bounds
  const safeIndex = activeAds.length > 0 ? currentAdIndex % activeAds.length : 0;
  const currentAds = activeAds.slice(safeIndex, safeIndex + maxAds);

  const positionClass = position === "sidebar_left" ? "left-4" : "right-4";

  // Track impressions for ads only once when they first become visible.
  // MUST be above the early return so hooks are always called in the same order.
  useEffect(() => {
    currentAds.forEach(ad => {
      if (!trackedImpressions.current.has(ad.id)) {
        handleAdImpression(ad.id);
        trackedImpressions.current.add(ad.id);
      }
    });
  }, [currentAds.map(ad => ad.id).join(',')]);

  if (activeAds.length === 0) {
    return null;
  }

  return (
    <div className={`fixed ${positionClass} top-24 w-64 space-y-4 z-30 hidden lg:block`}>
      {currentAds.map((ad, index) => {
        const sizeClass = sizeClasses[ad.size];
        const animationClass = animationClasses[ad.animationType];

        const isFlash = ad.animationType === 'flash';
        const isBounce = ad.animationType === 'bounce';
        const specialEffectClass = isFlash ? 'ad-glow ad-sparkles' : isBounce ? 'ad-premium-pulse' : '';

        return (
          <Card
            key={ad.id}
            className={`${sizeClass} ${animationClass} ${specialEffectClass} cursor-pointer hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 group relative backdrop-blur-sm bg-gradient-to-br from-background/90 to-background/70 border-2 hover:border-primary/50`}
            onClick={() => handleAdClick(ad)}
            style={{
              animationDelay: `${index * 200}ms`
            }}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/20 hover:bg-black/40"
              onClick={(e) => {
                e.stopPropagation();
                hideAd(ad.id);
              }}
            >
              <X className="h-3 w-3 text-white" />
            </Button>

            <CardContent className="p-0 h-full relative overflow-hidden rounded-[inherit]">
              {/* Background Image */}
              {ad.imageUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${ad.imageUrl})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
              )}

              {/* Magic sparkle overlay for flash ads */}
              {isFlash && (
                <div className="absolute inset-0 pointer-events-none">
                  <Sparkles className="absolute top-2 right-2 h-4 w-4 text-primary animate-pulse" />
                  <Zap className="absolute bottom-2 left-2 h-3 w-3 text-yellow-400 animate-bounce" />
                </div>
              )}

              {/* Content */}
              <div className={`relative h-full p-3 flex flex-col justify-between ${ad.imageUrl ? 'text-white' : 'text-foreground'}`}>
                <div>
                  {/* Premium Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs bg-gradient-to-r from-primary/30 to-primary/20 text-primary border border-primary/30 ${isFlash ? 'animate-pulse' : ''}`}
                    >
                      <Star className="h-2 w-2 mr-1 animate-spin" style={{ animationDuration: '3s' }} />
                      Premium
                    </Badge>
                    <div className="flex items-center gap-1 text-xs opacity-70">
                      <Eye className="h-2 w-2" />
                      <span>Ad</span>
                    </div>
                  </div>

                  {/* Business Info */}
                  <div className="mb-2">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                      {ad.title}
                    </h3>
                    {ad.business && (
                      <div className="text-xs opacity-90">
                        <div className="font-medium">{ad.business.name}</div>
                        {ad.business.contactInfo?.address && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-2 w-2" />
                            <span className="truncate">{ad.business.contactInfo.address}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ad Content */}
                  <p className="text-xs opacity-80 line-clamp-3 mb-2">
                    {ad.content}
                  </p>
                </div>

                {/* Call to Action */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="h-2 w-2" />
                    <span>Book Now</span>
                  </div>
                  <Button 
                    size="sm" 
                    className={`h-6 px-2 text-xs bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-primary/50 transition-all duration-300 ${isBounce ? 'animate-pulse' : ''}`}
                  >
                    <ExternalLink className="h-2 w-2 mr-1" />
                    Visit
                  </Button>
                </div>
              </div>

              {/* Animated border for flash ads */}
              {ad.animationType === 'flash' && (
                <div className="absolute inset-0 border-2 border-primary animate-pulse pointer-events-none" />
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Ad rotation indicator */}
      {activeAds.length > maxAds && (
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: Math.ceil(activeAds.length / maxAds) }).map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                Math.floor(currentAdIndex / maxAds) === index 
                  ? 'bg-primary' 
                  : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}