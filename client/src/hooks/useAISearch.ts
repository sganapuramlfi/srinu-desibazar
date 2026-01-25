import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AISearchSuggestion {
  type: 'business' | 'service' | 'location';
  text: string;
  confidence: number;
  businessId?: number;
  industryType?: string;
}

interface AISearchAnalysis {
  intent: 'find_business' | 'book_service' | 'get_info' | 'compare' | 'nearby';
  keywords: string[];
  location?: string;
  serviceType?: string;
  industryType?: string;
  suggestions: AISearchSuggestion[];
  enhancedQuery: string;
}

export const useAISearch = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze search query with AbrakadabraAI
  const analyzeQuery = useCallback(async (query: string): Promise<AISearchAnalysis> => {
    setIsAnalyzing(true);
    
    try {
      // Try AbrakadabraAI first
      const response = await fetch('/api/ai-public-data/genie/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userLocation: 'Melbourne',
          preferences: {}
        })
      });

      if (response.ok) {
        const aiResult = await response.json();
        
        // Convert AI response to our analysis format
        return {
          intent: determineIntentFromAI(aiResult),
          keywords: aiResult.query?.split(' ') || [],
          location: aiResult.location || undefined,
          serviceType: aiResult.serviceType || undefined,
          industryType: aiResult.industryType || undefined,
          suggestions: aiResult.recommendations?.slice(0, 3).map((rec: any) => ({
            type: 'business' as const,
            text: rec.name,
            confidence: rec.rating / 5,
            businessId: rec.id,
            industryType: rec.industryType
          })) || [],
          enhancedQuery: aiResult.enhanced_query || query
        };
      }
      
      // Fallback to basic analysis
      const analysis = performBasicAnalysis(query);
      await new Promise(resolve => setTimeout(resolve, 800));
      return analysis;
    } catch (error) {
      // Fallback to basic analysis on error
      const analysis = performBasicAnalysis(query);
      await new Promise(resolve => setTimeout(resolve, 400));
      return analysis;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Get AI-enhanced search suggestions using AbrakadabraAI
  const { data: searchSuggestions, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['/api/ai-public-data/genie/suggestions'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/ai-public-data/genie/health');
        const healthData = await response.json();
        
        if (healthData.ai_genie_status === 'offline') {
          // Fallback to mock suggestions when AI is offline
          return [
            {
              type: 'service' as const,
              text: 'hair salon with parking',
              confidence: 0.9,
              industryType: 'salon'
            },
            {
              type: 'service' as const,
              text: 'best restaurant for dinner',
              confidence: 0.85,
              industryType: 'restaurant'
            },
            {
              type: 'location' as const,
              text: 'spa near downtown',
              confidence: 0.8,
              industryType: 'salon'
            },
            {
              type: 'business' as const,
              text: 'italian restaurant with reviews',
              confidence: 0.75,
              industryType: 'restaurant'
            }
          ];
        }

        // AI-powered suggestions (when available)
        return [
          {
            type: 'service' as const,
            text: 'trending brunch spots today',
            confidence: 0.95,
            industryType: 'restaurant'
          },
          {
            type: 'service' as const,
            text: 'spa treatments for stress relief',
            confidence: 0.9,
            industryType: 'salon'
          },
          {
            type: 'location' as const,
            text: 'popular CBD restaurants',
            confidence: 0.88,
            industryType: 'restaurant'
          },
          {
            type: 'business' as const,
            text: 'highly rated hair salons',
            confidence: 0.85,
            industryType: 'salon'
          }
        ];
      } catch (error) {
        // Fallback suggestions on error
        return [
          {
            type: 'service' as const,
            text: 'nearby restaurants',
            confidence: 0.7,
            industryType: 'restaurant'
          }
        ];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    analyzeQuery,
    searchSuggestions: searchSuggestions || [],
    isAnalyzing,
    isLoadingSuggestions
  };
};

// Helper function to determine intent from AI response
function determineIntentFromAI(aiResult: any): AISearchAnalysis['intent'] {
  if (aiResult.intent) return aiResult.intent;
  
  const query = aiResult.query?.toLowerCase() || '';
  if (query.includes('book') || query.includes('appointment')) return 'book_service';
  if (query.includes('near') || query.includes('around')) return 'nearby';
  if (query.includes('compare') || query.includes('vs')) return 'compare';
  if (query.includes('info') || query.includes('about')) return 'get_info';
  return 'find_business';
}

// Basic analysis function - fallback when AI is unavailable
function performBasicAnalysis(query: string): AISearchAnalysis {
  const lowerQuery = query.toLowerCase();
  
  // Extract keywords
  const keywords = query.split(' ').filter(word => word.length > 2);
  
  // Detect intent
  let intent: AISearchAnalysis['intent'] = 'find_business';
  if (lowerQuery.includes('book') || lowerQuery.includes('appointment')) {
    intent = 'book_service';
  } else if (lowerQuery.includes('near') || lowerQuery.includes('around')) {
    intent = 'nearby';
  } else if (lowerQuery.includes('compare') || lowerQuery.includes('vs')) {
    intent = 'compare';
  } else if (lowerQuery.includes('info') || lowerQuery.includes('about')) {
    intent = 'get_info';
  }
  
  // Detect industry type
  let industryType: string | undefined;
  if (lowerQuery.includes('salon') || lowerQuery.includes('hair') || lowerQuery.includes('spa')) {
    industryType = 'salon';
  } else if (lowerQuery.includes('restaurant') || lowerQuery.includes('food') || lowerQuery.includes('eat')) {
    industryType = 'restaurant';
  } else if (lowerQuery.includes('event') || lowerQuery.includes('wedding')) {
    industryType = 'event';
  } else if (lowerQuery.includes('house') || lowerQuery.includes('property') || lowerQuery.includes('real estate')) {
    industryType = 'realestate';
  } else if (lowerQuery.includes('store') || lowerQuery.includes('shop')) {
    industryType = 'retail';
  } else if (lowerQuery.includes('lawyer') || lowerQuery.includes('accountant') || lowerQuery.includes('consultant')) {
    industryType = 'professional';
  }
  
  // Detect location
  const locationKeywords = ['near', 'in', 'around', 'close to', 'downtown', 'uptown', 'center'];
  let location: string | undefined;
  for (const locKeyword of locationKeywords) {
    const index = lowerQuery.indexOf(locKeyword);
    if (index !== -1) {
      const afterKeyword = query.substring(index + locKeyword.length).trim();
      if (afterKeyword) {
        location = afterKeyword.split(' ')[0];
        break;
      }
    }
  }
  
  // Generate suggestions
  const suggestions: AISearchSuggestion[] = [];
  
  if (industryType) {
    suggestions.push({
      type: 'business',
      text: `Best ${industryType === 'salon' ? 'salons' : 
               industryType === 'restaurant' ? 'restaurants' : 
               industryType + ' services'} nearby`,
      confidence: 0.8,
      industryType
    });
  }
  
  if (location) {
    suggestions.push({
      type: 'location',
      text: `Popular services in ${location}`,
      confidence: 0.7
    });
  }
  
  // Enhanced query
  let enhancedQuery = query;
  if (industryType && !lowerQuery.includes(industryType)) {
    enhancedQuery = `${query} ${industryType}`;
  }
  
  return {
    intent,
    keywords,
    location,
    industryType,
    suggestions,
    enhancedQuery
  };
}