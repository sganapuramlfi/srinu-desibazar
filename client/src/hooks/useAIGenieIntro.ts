import { useState, useEffect } from 'react';

interface AIGenieIntroState {
  hasSeenIntro: boolean;
  isSubscribed: boolean;
  email?: string;
}

export function useAIGenieIntro() {
  const [showPopup, setShowPopup] = useState(false);
  const [introState, setIntroState] = useState<AIGenieIntroState>({
    hasSeenIntro: false,
    isSubscribed: false
  });

  useEffect(() => {
    // Check if user has already seen the intro
    const savedState = localStorage.getItem('ai-genie-intro');
    if (savedState) {
      const state = JSON.parse(savedState);
      setIntroState(state);
    } else {
      // Show popup after a short delay for new users
      const timer = setTimeout(() => {
        setShowPopup(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClosePopup = () => {
    setShowPopup(false);
    const newState = { ...introState, hasSeenIntro: true };
    setIntroState(newState);
    localStorage.setItem('ai-genie-intro', JSON.stringify(newState));
  };

  const handleSubscribe = async (email: string) => {
    try {
      // API call to subscribe user
      const response = await fetch('/api/ai/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          features: ['smartSearch', 'bookingAssistant', 'businessInsights'],
          notifyOnLaunch: true
        })
      });

      if (response.ok) {
        const newState = { 
          hasSeenIntro: true, 
          isSubscribed: true, 
          email 
        };
        setIntroState(newState);
        localStorage.setItem('ai-genie-intro', JSON.stringify(newState));
        
        // Track subscription for analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'ai_genie_subscribe', {
            event_category: 'engagement',
            event_label: 'ai_features'
          });
        }
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  };

  const triggerPopup = () => {
    if (!introState.hasSeenIntro) {
      setShowPopup(true);
    }
  };

  const resetIntro = () => {
    localStorage.removeItem('ai-genie-intro');
    setIntroState({ hasSeenIntro: false, isSubscribed: false });
  };

  return {
    showPopup,
    introState,
    handleClosePopup,
    handleSubscribe,
    triggerPopup,
    resetIntro
  };
}