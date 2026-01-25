import { useState, useEffect, useContext, createContext } from 'react';

interface UserContext {
  searchHistory: string[];
  preferences: {
    cuisines: string[];
    priceRange: string;
    occasions: string[];
  };
  currentSession: {
    pageVisits: string[];
    timeSpent: number;
    interactionCount: number;
  };
}

interface AbrakadabraContextType {
  userContext: UserContext;
  updateContext: (update: Partial<UserContext>) => void;
  getSmartSuggestions: (currentPage: string) => string[];
  shouldShowProactivePrompt: () => boolean;
}

const AbrakadabraContext = createContext<AbrakadabraContextType | null>(null);

export const useAbrakadabraContext = () => {
  const context = useContext(AbrakadabraContext);
  if (!context) {
    throw new Error('useAbrakadabraContext must be used within AbrakadabraProvider');
  }
  return context;
};

export const AbrakadabraProvider = ({ children }: { children: React.ReactNode }) => {
  const [userContext, setUserContext] = useState<UserContext>({
    searchHistory: [],
    preferences: {
      cuisines: [],
      priceRange: '',
      occasions: []
    },
    currentSession: {
      pageVisits: [],
      timeSpent: 0,
      interactionCount: 0
    }
  });

  const updateContext = (update: Partial<UserContext>) => {
    setUserContext(prev => ({ ...prev, ...update }));
  };

  const getSmartSuggestions = (currentPage: string): string[] => {
    const { searchHistory, preferences } = userContext;
    
    // Smart suggestions based on context
    if (currentPage === 'directory') {
      if (searchHistory.length === 0) {
        return ["Quick lunch", "Date night", "Family dinner", "Surprise me!"];
      }
      
      // Personalized based on history
      if (searchHistory.some(s => s.includes('Italian'))) {
        return ["More Italian options", "Similar cuisines", "Italian + romantic"];
      }
      
      return ["Based on your taste", "Try something new", "Popular choices"];
    }
    
    if (currentPage === 'business-profile') {
      return ["More like this", "Nearby alternatives", "Different price range"];
    }
    
    if (currentPage === 'booking') {
      return ["Best time to visit?", "Similar places", "Special requests"];
    }
    
    return ["How can I help?"];
  };

  const shouldShowProactivePrompt = (): boolean => {
    const { pageVisits, timeSpent, interactionCount } = userContext.currentSession;
    
    // Show proactive prompt if:
    // - User has browsed 3+ pages without interaction
    // - Spent more than 2 minutes without booking
    // - Returned user with previous preferences
    
    return (
      pageVisits.length >= 3 && interactionCount === 0 ||
      timeSpent > 120 && interactionCount === 0 ||
      userContext.preferences.cuisines.length > 0
    );
  };

  // Track page visits and time
  useEffect(() => {
    const startTime = Date.now();
    
    return () => {
      const timeOnPage = Date.now() - startTime;
      setUserContext(prev => ({
        ...prev,
        currentSession: {
          ...prev.currentSession,
          timeSpent: prev.currentSession.timeSpent + timeOnPage
        }
      }));
    };
  }, []);

  return (
    <AbrakadabraContext.Provider value={{
      userContext,
      updateContext,
      getSmartSuggestions,
      shouldShowProactivePrompt
    }}>
      {children}
    </AbrakadabraContext.Provider>
  );
};

// Smart engagement triggers
export const useSmartEngagement = () => {
  const { userContext, shouldShowProactivePrompt } = useAbrakadabraContext();
  
  const triggerProactiveHelp = (trigger: string) => {
    const messages = {
      'browsing_long': "Finding what you're looking for? I can help narrow down options! 🎯",
      'exit_intent': "Wait! Let me suggest something perfect before you go! ✨",
      'return_user': "Welcome back! Based on your taste, I have some new suggestions! 🌟",
      'comparison_mode': "Comparing options? I can highlight what makes each special! 💫"
    };
    
    return messages[trigger] || "How can I help make this easier? 🤝";
  };
  
  return {
    shouldShowProactivePrompt,
    triggerProactiveHelp,
    userContext
  };
};