// This file integrates the AI Genie module into the main application
// It imports from the ai-genie package and re-exports for easy use

import React from 'react';

// Check if AI module is available
let AISearchBox: React.FC<any> | null = null;
let AIAssistantWidget: React.FC<any> | null = null;
let AIInsightsDashboard: React.FC<any> | null = null;
let useAISearch: any = null;
let useAIBooking: any = null;
let useAIInsights: any = null;
let useAIStatus: any = null;

try {
  // Try to import from the AI module - this will work if ai-genie is installed
  const aiModule = require('../../../ai-genie/src/client/components');
  const aiHooks = require('../../../ai-genie/src/client/hooks');
  
  AISearchBox = aiModule.AISearchBox;
  AIAssistantWidget = aiModule.AIAssistantWidget;
  AIInsightsDashboard = aiModule.AIInsightsDashboard;
  
  useAISearch = aiHooks.useAISearch;
  useAIBooking = aiHooks.useAIBooking;
  useAIInsights = aiHooks.useAIInsights;
  useAIStatus = aiHooks.useAIStatus;
} catch (error) {
  // AI module not available - create placeholder components
  console.log('AI Genie module not loaded - AI features disabled');
}

// Wrapper components that gracefully handle when AI is not available
export const AISearchBoxWrapper: React.FC<{
  placeholder?: string;
  onResultSelect?: (result: any) => void;
  industry?: string;
}> = (props) => {
  if (!AISearchBox) {
    return null; // AI not available, render nothing
  }
  return <AISearchBox {...props} />;
};

export const AIAssistantWidgetWrapper: React.FC = () => {
  if (!AIAssistantWidget) {
    return null; // AI not available, render nothing
  }
  return <AIAssistantWidget />;
};

export const AIInsightsDashboardWrapper: React.FC<{ businessId: number }> = (props) => {
  if (!AIInsightsDashboard) {
    return null; // AI not available, render nothing
  }
  return <AIInsightsDashboard {...props} />;
};

// Export hooks with fallbacks
export const useAISearchWrapper = () => {
  if (!useAISearch) {
    return {
      search: async () => null,
      loading: false,
      error: null,
      result: null
    };
  }
  return useAISearch();
};

export const useAIStatusWrapper = () => {
  if (!useAIStatus) {
    return {
      status: { enabled: false, features: {} },
      loading: false,
      checkStatus: async () => {}
    };
  }
  return useAIStatus();
};