import { Router } from 'express';
import { AIServiceFactory } from '../ai-service-factory.js';

export function createAIRoutes() {
  const router = Router();

  // AI Search endpoint
  router.post('/search', async (req, res) => {
    try {
      if (!AIServiceFactory.isFeatureEnabled('smartSearch')) {
        return res.json({ 
          suggestions: [], 
          aiSummary: 'AI search is currently disabled',
          confidence: 0 
        });
      }

      const aiService = AIServiceFactory.getInstance();
      const result = await aiService.search(req.body);
      
      res.json(result);
    } catch (error) {
      console.error('AI Search error:', error);
      res.status(500).json({ 
        error: 'AI search temporarily unavailable',
        suggestions: [],
        aiSummary: 'Please try regular search',
        confidence: 0
      });
    }
  });

  // AI Booking Assistant endpoint
  router.post('/booking', async (req, res) => {
    try {
      if (!AIServiceFactory.isFeatureEnabled('bookingAssistant')) {
        return res.json({
          action: 'error',
          message: 'AI booking assistant is currently disabled'
        });
      }

      const aiService = AIServiceFactory.getInstance();
      const result = await aiService.booking(req.body);
      
      res.json(result);
    } catch (error) {
      console.error('AI Booking error:', error);
      res.status(500).json({
        action: 'error',
        message: 'AI booking assistant temporarily unavailable. Please book manually.'
      });
    }
  });

  // AI Business Insights endpoint
  router.get('/insights/:businessId', async (req, res) => {
    try {
      if (!AIServiceFactory.isFeatureEnabled('businessInsights')) {
        return res.json({
          recommendation: 'AI insights are currently disabled',
          priority: 'low',
          bookingTrend: 'N/A',
          optimalHours: [],
          insights: []
        });
      }

      const aiService = AIServiceFactory.getInstance();
      const result = await aiService.insights({
        businessId: parseInt(req.params.businessId),
        timeframe: (req.query.timeframe as any) || 'month'
      });
      
      res.json(result);
    } catch (error) {
      console.error('AI Insights error:', error);
      res.status(500).json({
        recommendation: 'AI insights temporarily unavailable',
        priority: 'low',
        bookingTrend: 'Error',
        optimalHours: [],
        insights: ['Service temporarily unavailable']
      });
    }
  });

  // Health check endpoint
  router.get('/health', (req, res) => {
    const aiService = AIServiceFactory.getInstance();
    res.json({
      enabled: aiService.isEnabled(),
      features: {
        smartSearch: AIServiceFactory.isFeatureEnabled('smartSearch'),
        bookingAssistant: AIServiceFactory.isFeatureEnabled('bookingAssistant'),
        businessInsights: AIServiceFactory.isFeatureEnabled('businessInsights'),
        messageAI: AIServiceFactory.isFeatureEnabled('messageAI')
      },
      status: 'healthy'
    });
  });

  return router;
}