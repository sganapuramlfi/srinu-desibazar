import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, X, Navigation, Zap, Target, Star } from "lucide-react";
import { useLocation } from "@/hooks/use-location";

export function LocationPermissionDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const [hasAskedBefore, setHasAskedBefore] = useState(false);
  const { location, isLoading, error, requestLocation } = useLocation();

  useEffect(() => {
    // Check if we've asked before
    const previouslyAsked = localStorage.getItem('locationPermissionAsked');
    if (previouslyAsked) {
      setHasAskedBefore(true);
      return;
    }

    // Show dialog after a short delay if no location and not loading
    const timer = setTimeout(() => {
      if (!location && !isLoading && !error) {
        setShowDialog(true);
      }
    }, 3000); // Wait 3 seconds after page load

    return () => clearTimeout(timer);
  }, [location, isLoading, error]);

  const handleEnableLocation = () => {
    requestLocation();
    localStorage.setItem('locationPermissionAsked', 'true');
    setShowDialog(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('locationPermissionAsked', 'true');
    setShowDialog(false);
  };

  // Don't show if we have location, are loading, or have asked before
  if (location || isLoading || hasAskedBefore || !showDialog) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl border-2 border-primary/20">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Navigation className="h-8 w-8 text-primary animate-pulse" />
              <div className="absolute -top-1 -right-1">
                <Star className="h-4 w-4 text-yellow-500 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
          </div>
          <CardTitle className="text-xl mb-2">
            🎯 Get Personalized Local Ads
          </CardTitle>
          <CardDescription className="text-center">
            Enable location to see businesses and offers in your area. Experience Melbourne CBD restaurants, nearby salons, and local services tailored just for you!
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Benefits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <Target className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <div className="text-xs font-medium">Local Businesses</div>
              <div className="text-xs text-muted-foreground">Find nearby services</div>
            </div>
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <Zap className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <div className="text-xs font-medium">Smart Offers</div>
              <div className="text-xs text-muted-foreground">Location-based deals</div>
            </div>
          </div>

          {/* Example locations */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-2">Popular areas we serve:</div>
            <div className="flex flex-wrap justify-center gap-1">
              <Badge variant="outline" className="text-xs">Melbourne CBD</Badge>
              <Badge variant="outline" className="text-xs">South Yarra</Badge>
              <Badge variant="outline" className="text-xs">Carlton</Badge>
              <Badge variant="outline" className="text-xs">Richmond</Badge>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleEnableLocation}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
              size="sm"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Enable Location
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              size="sm"
              className="px-3"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            🔒 Your location is private and only used for better ad targeting
          </div>
        </CardContent>
      </Card>
    </div>
  );
}