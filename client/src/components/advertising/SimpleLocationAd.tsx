import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Navigation, ExternalLink } from "lucide-react";

interface SimpleLocationAdProps {
  position: "sidebar_left" | "sidebar_right";
  className?: string;
}

// Simplified mock data for testing
const mockAds = [
  {
    id: 1,
    title: "🍛 Spice Paradise - Melbourne CBD",
    content: "Authentic Indian cuisine in the heart of Melbourne. 50% off first visit!",
    business: "Spice Paradise",
    location: "Melbourne CBD",
    distance: "2.3km",
    type: "Premium Restaurant",
    isLocal: true
  },
  {
    id: 2,
    title: "✨ Glamour Studio - South Yarra", 
    content: "Celebrity stylists, luxury treatments. Book your transformation today!",
    business: "Glamour Studio",
    location: "South Yarra",
    distance: "4.1km", 
    type: "Enterprise Salon",
    isLocal: true
  }
];

export function SimpleLocationAd({ position, className = "" }: SimpleLocationAdProps) {
  const [currentAd, setCurrentAd] = useState(0);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  // Simple location detection
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // For demo, assume Melbourne CBD area
          setUserLocation("Melbourne CBD");
        },
        (error) => {
          console.log("Location not available, showing global ads");
        }
      );
    }
  }, []);

  // Rotate ads every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAd(prev => (prev + 1) % mockAds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const positionClass = position === "sidebar_left" ? "left-4" : "right-4";
  const ad = mockAds[currentAd];

  return (
    <div className={`fixed ${positionClass} top-24 w-64 space-y-3 z-30 hidden xl:block ${className}`}>
      {/* Location Indicator */}
      <div className="text-xs text-center text-muted-foreground mb-2 flex items-center justify-center gap-1">
        {userLocation ? (
          <>
            <Navigation className="h-3 w-3 text-green-500" />
            <span>📍 {userLocation}</span>
          </>
        ) : (
          <>
            <MapPin className="h-3 w-3" />
            <span>Global Ads</span>
          </>
        )}
      </div>

      <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 bg-gradient-to-br from-background/95 to-background/85">
        {/* Premium Badge */}
        <div className="absolute -top-2 -right-2 z-20">
          {ad.isLocal && (
            <Badge className="bg-green-500 text-white text-xs animate-pulse">
              <Navigation className="h-2 w-2 mr-1" />
              {ad.distance}
            </Badge>
          )}
        </div>

        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Business Info */}
            <div>
              <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                {ad.title}
              </h3>
              <div className="text-xs text-muted-foreground">
                <div className="font-medium">{ad.business}</div>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className={`h-2 w-2 ${ad.isLocal ? 'text-green-400' : ''}`} />
                  <span>{ad.location}</span>
                  {ad.isLocal && <span className="text-green-400 ml-1">• {ad.distance} away</span>}
                </div>
              </div>
            </div>

            {/* Ad Content */}
            <p className="text-xs opacity-80 line-clamp-3">
              {ad.content}
            </p>

            {/* Premium Badge */}
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs bg-gradient-to-r from-primary/30 to-primary/20 text-primary">
                <Star className="h-2 w-2 mr-1" />
                {ad.type}
              </Badge>
              <Button size="sm" className="h-6 px-2 text-xs">
                <ExternalLink className="h-2 w-2 mr-1" />
                Visit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ad Rotation Indicator */}
      <div className="flex justify-center gap-1">
        {mockAds.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
              currentAd === index ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
            onClick={() => setCurrentAd(index)}
          />
        ))}
      </div>
    </div>
  );
}