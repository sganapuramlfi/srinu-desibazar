import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface AdTargetingState {
  currentPage: string;
  currentCategory: string | null;
  currentModule: string | null;
  userInterests: string[];
  searchHistory: string[];
  viewedBusinesses: number[];
  sessionDuration: number;
  adPreferences: {
    maxAdsPerSide: number;
    preferredSizes: ('small' | 'medium' | 'large' | 'full')[];
    autoScroll: boolean;
    scrollInterval: number;
    showPremiumOnly: boolean;
  };
}

interface AdTargetingContextType extends AdTargetingState {
  updateCategory: (category: string) => void;
  updateModule: (module: string) => void;
  addInterest: (interest: string) => void;
  addSearch: (query: string) => void;
  addViewedBusiness: (businessId: number) => void;
  updateAdPreferences: (prefs: Partial<AdTargetingState['adPreferences']>) => void;
  getTargetedAdRules: () => AdTargetingRules;
}

interface AdTargetingRules {
  category: string | null;
  module: string | null;
  interests: string[];
  priorityBoost: number;
  maxAds: number;
  preferredSizes: string[];
  animationStyle: string;
}

const defaultState: AdTargetingState = {
  currentPage: '/',
  currentCategory: null,
  currentModule: null,
  userInterests: [],
  searchHistory: [],
  viewedBusinesses: [],
  sessionDuration: 0,
  adPreferences: {
    maxAdsPerSide: 3,
    preferredSizes: ['medium', 'large'],
    autoScroll: true,
    scrollInterval: 8000, // 8 seconds
    showPremiumOnly: false,
  }
};

const AdTargetingContext = createContext<AdTargetingContextType | undefined>(undefined);

export function AdTargetingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdTargetingState>(defaultState);
  const [location] = useLocation();

  // Track session duration
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        sessionDuration: Date.now() - startTime
      }));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Update current page when location changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      currentPage: location
    }));

    // Auto-detect category and module from URL
    const pathSegments = location.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      const firstSegment = pathSegments[0];
      
      // Detect module
      if (['business', 'dashboard', 'advertising', 'admin'].includes(firstSegment)) {
        setState(prev => ({ ...prev, currentModule: firstSegment }));
      }

      // Detect category from business URL
      if (firstSegment === 'business' && pathSegments.length > 1) {
        // Could fetch business info to get category
        setState(prev => ({ ...prev, currentCategory: 'business-view' }));
      }
    }
  }, [location]);

  const updateCategory = (category: string) => {
    setState(prev => ({ ...prev, currentCategory: category }));
    
    // Add to interests if not already present
    if (!state.userInterests.includes(category)) {
      addInterest(category);
    }
  };

  const updateModule = (module: string) => {
    setState(prev => ({ ...prev, currentModule: module }));
  };

  const addInterest = (interest: string) => {
    setState(prev => ({
      ...prev,
      userInterests: [...new Set([...prev.userInterests, interest])].slice(-10) // Keep last 10
    }));
  };

  const addSearch = (query: string) => {
    setState(prev => ({
      ...prev,
      searchHistory: [...prev.searchHistory, query].slice(-20) // Keep last 20
    }));
  };

  const addViewedBusiness = (businessId: number) => {
    setState(prev => ({
      ...prev,
      viewedBusinesses: [...new Set([...prev.viewedBusinesses, businessId])].slice(-50) // Keep last 50
    }));
  };

  const updateAdPreferences = (prefs: Partial<AdTargetingState['adPreferences']>) => {
    setState(prev => ({
      ...prev,
      adPreferences: { ...prev.adPreferences, ...prefs }
    }));
  };

  const getTargetedAdRules = (): AdTargetingRules => {
    const { currentCategory, currentModule, userInterests, sessionDuration, adPreferences } = state;
    
    // Smart targeting logic
    let priorityBoost = 1;
    let maxAds = adPreferences.maxAdsPerSide;
    let animationStyle = 'fade';

    // Category-based targeting
    if (currentCategory) {
      priorityBoost += 2; // Boost category-relevant ads
      animationStyle = 'flash'; // More attention-grabbing for category browsing
    }

    // Module-based targeting
    if (currentModule === 'business') {
      maxAds = Math.min(maxAds + 1, 4); // Show more ads on business pages
      animationStyle = 'bounce'; // Premium feel for business pages
    }

    // Session duration based optimization
    if (sessionDuration > 60000) { // User engaged for > 1 minute
      priorityBoost += 1;
      maxAds = Math.max(maxAds, 2); // Ensure at least 2 ads for engaged users
    }

    // Interest-based optimization
    if (userInterests.length > 3) {
      priorityBoost += 0.5; // Slight boost for users with clear interests
    }

    return {
      category: currentCategory,
      module: currentModule,
      interests: userInterests,
      priorityBoost,
      maxAds,
      preferredSizes: adPreferences.preferredSizes,
      animationStyle
    };
  };

  const contextValue: AdTargetingContextType = {
    ...state,
    updateCategory,
    updateModule,
    addInterest,
    addSearch,
    addViewedBusiness,
    updateAdPreferences,
    getTargetedAdRules
  };

  return (
    <AdTargetingContext.Provider value={contextValue}>
      {children}
    </AdTargetingContext.Provider>
  );
}

export function useAdTargeting() {
  const context = useContext(AdTargetingContext);
  if (context === undefined) {
    throw new Error('useAdTargeting must be used within an AdTargetingProvider');
  }
  return context;
}

// Helper hook for category changes
export function useCategoryTracking() {
  const { updateCategory, addInterest } = useAdTargeting();
  
  const trackCategoryView = (category: string) => {
    updateCategory(category);
    addInterest(category);
  };

  const trackBusinessView = (businessId: number, category: string) => {
    const { addViewedBusiness } = useAdTargeting();
    addViewedBusiness(businessId);
    trackCategoryView(category);
  };

  return { trackCategoryView, trackBusinessView };
}