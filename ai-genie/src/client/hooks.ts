import { useState, useCallback } from 'react';
import { AISearchRequest, AISearchResult, AIBookingRequest, AIBookingResponse } from '../types.js';

// Custom hook for AI search
export function useAISearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AISearchResult | null>(null);

  const search = useCallback(async (request: AISearchRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { search, loading, error, result };
}

// Custom hook for AI booking assistant
export function useAIBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AIBookingResponse | null>(null);

  const sendMessage = useCallback(async (request: AIBookingRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/ai/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!res.ok) {
        throw new Error('Booking assistant unavailable');
      }

      const data = await res.json();
      setResponse(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendMessage, loading, error, response };
}

// Custom hook for AI insights
export function useAIInsights(businessId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<any>(null);

  const fetchInsights = useCallback(async (timeframe: 'week' | 'month' | 'quarter' = 'month') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ai/insights/${businessId}?timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error('Insights unavailable');
      }

      const data = await response.json();
      setInsights(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
      return null;
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  return { fetchInsights, loading, error, insights };
}

// Hook to check AI availability
export function useAIStatus() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/health');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('AI status check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check status on mount
  useState(() => {
    checkStatus();
  });

  return { status, loading, checkStatus };
}