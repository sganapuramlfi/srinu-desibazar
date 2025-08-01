import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Star, MapPin, Clock, Eye, X, Sparkles, Zap, TrendingUp, Target, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdTargeting } from "@/contexts/AdTargetingContext";
import { useLocation } from "@/hooks/use-location";
import { getLocationAwareAds } from "@/data/mockLocationAds";
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
  targetingRules?: {
    categories?: string[];
    industries?: string[];
    keywords?: string[];
    location?: {
      city?: string;
      suburb?: string;
      state?: string;
      radius?: number; // km radius for targeting
      coordinates?: { lat: number; lng: number };
    };
    targeting: "local" | "global" | "both";
  };
  business?: {
    name: string;
    industryType: string;
    subscriptionTier: "free" | "premium" | "enterprise";
    contactInfo?: {
      address?: string;
      city?: string;
      suburb?: string;
      state?: string;
      coordinates?: { lat: number; lng: number };
    };
  };
  distance?: number; // Distance from user in km
  isLocal?: boolean; // Whether this is a local business ad
}

interface SmartSidebarAdProps {
  position: "sidebar_left" | "sidebar_right";
  className?: string;
}

const sizeClasses = {
  small: "h-32 text-xs min-h-[8rem]",
  medium: "h-48 text-sm min-h-[12rem]", 
  large: "h-64 text-base min-h-[16rem]",
  full: "h-80 text-base min-h-[20rem]",
};

const smartAnimationClasses = {
  static: "",
  slide: "animate-[slideIn_0.8s_ease-out] hover:scale-105 transition-all duration-300",
  fade: "animate-[fadeIn_1.2s_ease-out] hover:brightness-110 transition-all duration-500",
  flash: "animate-[flash_2s_ease-in-out_infinite] shadow-lg shadow-primary/50",
  bounce: "animate-[bounce_1s_ease-in-out_infinite] hover:animate-[wiggle_0.5s_ease-in-out]",
};

export function SmartSidebarAd({ position, className = "" }: SmartSidebarAdProps) {
  const [visibleAds, setVisibleAds] = useState<Set<number>>(new Set());
  const [currentScrollIndex, setCurrentScrollIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const { 
    getTargetedAdRules, 
    addViewedBusiness, 
    currentCategory, 
    currentModule,
    adPreferences 
  } = useAdTargeting();

  const { location, isLoading: locationLoading } = useLocation();
  const targetingRules = getTargetedAdRules();

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Smart ad fetching with location-aware targeting (with mock data fallback)
  const { data: allAds, isLoading } = useQuery<AdCampaign[]>({
    queryKey: [`/api/advertising/targeted-ads`, position, currentCategory, currentModule, location?.city, location?.suburb],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          adType: position,
          category: currentCategory || '',
          module: currentModule || '',
          interests: targetingRules.interests.join(','),
          priorityBoost: targetingRules.priorityBoost.toString(),
          // Location-based targeting
          ...(location && {
            userLat: location.latitude.toString(),
            userLng: location.longitude.toString(),
            userCity: location.city || '',
            userSuburb: location.suburb || '',
            userState: location.state || ''
          })
        });
        
        const response = await fetch(`/api/advertising/location-aware-ads?${params}`);
        if (!response.ok) throw new Error('API not available');
        return await response.json();
      } catch (error) {
        // Fallback to mock data for demonstration
        console.log('Using mock location-aware ads for demonstration');
        return getLocationAwareAds(location, currentCategory, position);
      }
    },
    enabled: true,
    refetchInterval: 30000, // Refresh every 30 seconds for dynamic content
  });

  // Smart location-aware ad filtering and sorting
  const smartFilteredAds = allAds
    ?.filter(ad => !visibleAds.has(ad.id))
    ?.filter(ad => {
      // Category relevance filtering
      if (currentCategory && ad.business?.industryType) {
        return ad.business.industryType === currentCategory;
      }
      return true;
    })
    ?.filter(ad => {
      // Subscription tier filtering - Free users only show in global, Premium can target local/global/both
      if (ad.business?.subscriptionTier === 'free') {
        return ad.targetingRules?.targeting === 'global';
      }
      return true; // Premium and enterprise can show everywhere
    })
    ?.sort((a, b) => {
      // Smart priority sorting with location awareness
      let aScore = a.priority * targetingRules.priorityBoost;
      let bScore = b.priority * targetingRules.priorityBoost;
      
      // MAJOR boost for local businesses (suburban market focus)
      if (a.isLocal && location) aScore += 10;
      if (b.isLocal && location) bScore += 10;
      
      // Extra boost for same city/suburb
      if (location && a.business?.contactInfo?.city === location.city) aScore += 5;
      if (location && b.business?.contactInfo?.city === location.city) bScore += 5;
      if (location && a.business?.contactInfo?.suburb === location.suburb) aScore += 3;
      if (location && b.business?.contactInfo?.suburb === location.suburb) bScore += 3;
      
      // Subscription tier prioritization - Premium > Free
      if (a.business?.subscriptionTier === 'premium') aScore += 8;
      if (b.business?.subscriptionTier === 'premium') bScore += 8;
      if (a.business?.subscriptionTier === 'enterprise') aScore += 12;
      if (b.business?.subscriptionTier === 'enterprise') bScore += 12;
      
      // Distance-based scoring (closer = better)
      if (a.distance !== undefined) aScore += Math.max(0, 10 - a.distance);
      if (b.distance !== undefined) bScore += Math.max(0, 10 - b.distance);
      
      // Category match bonus (Melbourne CBD + Indian restaurant example)
      if (currentCategory && a.business?.industryType === currentCategory) aScore += 6;
      if (currentCategory && b.business?.industryType === currentCategory) bScore += 6;
      
      // Boost ads that match preferred sizes
      if (targetingRules.preferredSizes.includes(a.size)) aScore += 1;
      if (targetingRules.preferredSizes.includes(b.size)) bScore += 1;
      
      // Boost flash/bounce ads for engaged users
      if (targetingRules.animationStyle === 'flash' && a.animationType === 'flash') aScore += 2;
      if (targetingRules.animationStyle === 'bounce' && a.animationType === 'bounce') aScore += 2;
      
      return bScore - aScore;
    }) || [];

  // Smart scrolling logic - show 2-3 ads and rotate
  const maxAdsToShow = Math.min(targetingRules.maxAds, 3);
  const totalAds = smartFilteredAds.length;
  const adsToShow = smartFilteredAds.slice(currentScrollIndex, currentScrollIndex + maxAdsToShow);

  // Auto-scroll functionality
  useEffect(() => {
    if (!adPreferences.autoScroll || isPaused || totalAds <= maxAdsToShow) return;

    const interval = setInterval(() => {
      setCurrentScrollIndex(prev => {
        const nextIndex = prev + 1;
        return nextIndex + maxAdsToShow > totalAds ? 0 : nextIndex;
      });
    }, adPreferences.scrollInterval);

    return () => clearInterval(interval);
  }, [adPreferences.autoScroll, adPreferences.scrollInterval, isPaused, totalAds, maxAdsToShow]);

  const handleAdClick = async (ad: AdCampaign) => {
    // Track click analytics with smart targeting data
    try {
      await fetch('/api/advertising/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: ad.id,
          action: 'click',
          metadata: { 
            position, 
            timestamp: Date.now(),
            category: currentCategory,
            module: currentModule,
            targetingScore: targetingRules.priorityBoost,
            scrollIndex: currentScrollIndex
          }
        })
      });

      // Track business view
      if (ad.business) {
        addViewedBusiness(ad.businessId);
      }

      // Open ad URL
      if (ad.clickUrl) {
        window.open(ad.clickUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to track ad click:', error);
    }
  };

  const handleAdImpression = async (adId: number, ad: AdCampaign) => {
    try {
      await fetch('/api/advertising/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: adId,
          action: 'impression',
          metadata: { 
            position, 
            timestamp: Date.now(),
            category: currentCategory,
            module: currentModule,
            targetingScore: targetingRules.priorityBoost,
            isSmartTargeted: true
          }
        })
      });
    } catch (error) {
      console.error('Failed to track ad impression:', error);
    }
  };

  const hideAd = (adId: number) => {
    setVisibleAds(prev => new Set([...prev, adId]));
  };

  // Handle mouse interactions for auto-scroll
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  if (isLoading || adsToShow.length === 0) {
    return null;
  }

  const positionClass = position === "sidebar_left" ? "left-4" : "right-4";
  
  return (
    <div 
      className={`fixed ${positionClass} top-24 w-64 space-y-3 z-30 hidden xl:block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Smart Location-Aware Targeting Indicator */}
      <div className="text-xs text-center text-muted-foreground mb-2 flex items-center justify-center gap-1">
        {location ? (
          <>
            <Navigation className="h-3 w-3 text-green-500" />
            <span>📍 {location.suburb || location.city || 'Your Area'}</span>
            {currentCategory && <span> • {currentCategory}</span>}
          </>
        ) : locationLoading ? (
          <>
            <Target className="h-3 w-3 animate-spin" />
            <span>Getting location...</span>
          </>
        ) : (
          <>
            <Target className="h-3 w-3" />
            <span>Global Ads {currentCategory && `• ${currentCategory}`}</span>
          </>
        )}
      </div>

      {adsToShow.map((ad, index) => {
        // Track impression when ad becomes visible
        useEffect(() => {
          const timer = setTimeout(() => {
            handleAdImpression(ad.id, ad);
          }, 1000); // Delay to ensure ad is actually viewed
          
          return () => clearTimeout(timer);
        }, [ad.id]);

        const sizeClass = sizeClasses[ad.size];
        const animationClass = smartAnimationClasses[ad.animationType];
        
        // Smart animation override based on context
        const smartAnimation = targetingRules.animationStyle === ad.animationType 
          ? smartAnimationClasses[ad.animationType]
          : animationClass;

        const isFlash = ad.animationType === 'flash';
        const isBounce = ad.animationType === 'bounce';
        const isTargeted = currentCategory === ad.business?.industryType;
        const isPremium = ad.business?.subscriptionTier === 'premium' || ad.business?.subscriptionTier === 'enterprise';
        const isLocalBusiness = ad.isLocal && location;
        
        const specialEffectClass = `
          ${isFlash ? 'ad-glow ad-sparkles' : ''} 
          ${isBounce ? 'ad-premium-pulse' : ''} 
          ${isTargeted ? 'ring-2 ring-primary/30' : ''}
          ${isLocalBusiness ? 'ring-2 ring-green-400/40 shadow-lg shadow-green-400/20' : ''}
          ${isPremium ? 'border-l-4 border-l-gold/60' : ''}
        `.trim();

        return (
          <Card 
            key={`${ad.id}-${currentScrollIndex}`}
            className={`${sizeClass} ${smartAnimation} ${specialEffectClass} cursor-pointer hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 overflow-visible group relative backdrop-blur-sm bg-gradient-to-br from-background/95 to-background/85 border-2 hover:border-primary/50`}
            onClick={() => handleAdClick(ad)}
            style={{
              animationDelay: `${index * 150}ms`,
              transform: `translateY(${index * 2}px)` // Slight stagger effect
            }}
          >
            {/* Smart Multi-Badge System */}
            <div className="absolute -top-2 -right-2 z-20 flex flex-col gap-1">
              {/* Local Business Badge - Highest Priority */}
              {isLocalBusiness && (
                <Badge className="bg-green-500 text-white text-xs animate-pulse">
                  <Navigation className="h-2 w-2 mr-1" />
                  {ad.distance ? `${ad.distance.toFixed(1)}km` : 'Local'}
                </Badge>
              )}
              
              {/* Premium Tier Badge */}
              {isPremium && (
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                  <Star className="h-2 w-2 mr-1 animate-spin" style={{ animationDuration: '3s' }} />
                  {ad.business?.subscriptionTier === 'enterprise' ? 'Enterprise' : 'Premium'}
                </Badge>
              )}
              
              {/* Category Targeting Badge */}
              {isTargeted && (
                <Badge className="bg-blue-500 text-white text-xs">
                  <TrendingUp className="h-2 w-2 mr-1" />
                  Match
                </Badge>
              )}
            </div>

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

            <CardContent className="p-0 h-full relative">
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
                      <span>Smart Ad</span>
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
                        <div className="text-xs text-primary/80 capitalize">
                          {ad.business.industryType}
                        </div>
                        {/* Enhanced Location Display */}
                        {ad.business.contactInfo && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className={`h-2 w-2 ${isLocalBusiness ? 'text-green-400 animate-pulse' : ''}`} />
                            <span className="truncate">
                              {isLocalBusiness ? (
                                <>
                                  <span className="text-green-400 font-medium">
                                    {ad.business.contactInfo.suburb || ad.business.contactInfo.city}
                                  </span>
                                  {ad.distance && (
                                    <span className="text-green-300 ml-1">
                                      • {ad.distance.toFixed(1)}km away
                                    </span>
                                  )}
                                </>
                              ) : (
                                ad.business.contactInfo.address || ad.business.contactInfo.city
                              )}
                            </span>
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
              {isFlash && (
                <div className="absolute inset-0 border-2 border-primary animate-pulse pointer-events-none" />
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Smart scroll indicators */}
      {totalAds > maxAdsToShow && (
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: Math.ceil(totalAds / maxAdsToShow) }).map((_, pageIndex) => (
            <div
              key={pageIndex}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                Math.floor(currentScrollIndex / maxAdsToShow) === pageIndex 
                  ? 'bg-primary scale-110' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              onClick={() => setCurrentScrollIndex(pageIndex * maxAdsToShow)}
            />
          ))}
        </div>
      )}

      {/* Auto-scroll status indicator */}
      {adPreferences.autoScroll && totalAds > maxAdsToShow && (
        <div className="text-center">
          <div className={`text-xs text-muted-foreground ${isPaused ? 'opacity-100' : 'opacity-60'}`}>
            {isPaused ? '⏸️ Paused' : '▶️ Auto-scrolling'}
          </div>
        </div>
      )}
    </div>
  );
}