import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  suburb?: string;
  state?: string;
  accuracy?: number;
}

interface LocationContextType {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => void;
  reverseGeocode: (lat: number, lng: number) => Promise<LocationData>;
  clearError: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reverse geocoding using a free service
  const reverseGeocode = async (lat: number, lng: number): Promise<LocationData> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      return {
        latitude: lat,
        longitude: lng,
        city: data.address?.city || data.address?.town || data.address?.village,
        suburb: data.address?.suburb || data.address?.neighbourhood,
        state: data.address?.state,
        country: data.address?.country,
      };
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return { latitude: lat, longitude: lng };
    }
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    // Check if running in secure context (HTTPS or localhost)
    if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
      setError('Geolocation requires HTTPS. Please use a secure connection.');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        try {
          const locationData = await reverseGeocode(latitude, longitude);
          locationData.accuracy = accuracy;

          setLocation(locationData);

          // Store in localStorage for persistence
          localStorage.setItem('userLocation', JSON.stringify(locationData));
        } catch (error) {
          console.error('Error processing location:', error);
          setLocation({ latitude, longitude, accuracy });
        }

        setIsLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Failed to get location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your device location settings.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }

        setError(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased to 15 seconds
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  // Try to load location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation);
        // Check if location is not too old (24 hours)
        const locationAge = Date.now() - (parsedLocation.timestamp || 0);
        if (locationAge < 24 * 60 * 60 * 1000) {
          setLocation(parsedLocation);
          return;
        }
      } catch (error) {
        console.error('Error parsing saved location:', error);
      }
    }

    // Don't auto-request - let user click the button for better UX
    // Auto-requesting can be intrusive and might fail silently
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        isLoading,
        error,
        requestLocation,
        reverseGeocode,
        clearError,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}