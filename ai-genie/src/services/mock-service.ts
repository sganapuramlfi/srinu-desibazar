import { 
  IAIService, 
  AISearchRequest, 
  AISearchResult, 
  AIBookingRequest, 
  AIBookingResponse,
  AIInsightsRequest,
  AIInsightsResponse 
} from '../types.js';

export class MockAIService implements IAIService {
  isEnabled(): boolean {
    return true;
  }

  async search(request: AISearchRequest): Promise<AISearchResult> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock intelligent responses based on query
    const query = request.query.toLowerCase();
    const suggestions = [];

    if (query.includes('salon') || query.includes('hair')) {
      suggestions.push({
        id: 1,
        name: 'Glamour Salon & Spa',
        matchReason: 'Specializes in hair styling and highlights',
        confidence: 0.9,
        aiSummary: 'Top-rated salon with excellent reviews for highlights and styling',
        relevanceScore: 0.9
      });
    }

    if (query.includes('restaurant') || query.includes('dinner') || query.includes('food')) {
      suggestions.push({
        id: 2,
        name: 'Spice Garden Restaurant',
        matchReason: 'Highly rated Indian cuisine',
        confidence: 0.85,
        aiSummary: 'Popular restaurant with authentic flavors and great ambiance',
        relevanceScore: 0.85
      });
    }

    return {
      suggestions,
      aiSummary: `🧞‍♂️ Found ${suggestions.length} great matches for "${request.query}"`,
      confidence: 0.8
    };
  }

  async booking(request: AIBookingRequest): Promise<AIBookingResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const message = request.message.toLowerCase();
    
    if (message.includes('book') || message.includes('appointment')) {
      return {
        action: 'book',
        message: '✨ I can help you book! Let me find the best available time slot.',
        bookingData: {
          serviceType: 'haircut',
          preferredTime: 'afternoon',
          duration: 60
        }
      };
    }

    if (message.includes('cancel') || message.includes('reschedule')) {
      return {
        action: 'suggest',
        message: 'I can help you reschedule. Here are some alternative times:',
        suggestions: ['Tomorrow 2:00 PM', 'Friday 10:00 AM', 'Next week Tuesday 3:00 PM']
      };
    }

    return {
      action: 'clarify',
      message: 'I can help you with bookings! Try saying "book a haircut for tomorrow" or "reschedule my appointment"',
      suggestions: ['Book an appointment', 'Check availability', 'Reschedule booking']
    };
  }

  async insights(request: AIInsightsRequest): Promise<AIInsightsResponse> {
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      recommendation: 'Consider offering evening appointments - 40% of users search after 6 PM',
      priority: 'high',
      bookingTrend: '+15% vs last month',
      optimalHours: [
        { time: '2:00 PM - 4:00 PM', demand: 'High' },
        { time: '6:00 PM - 8:00 PM', demand: 'Peak' },
        { time: '10:00 AM - 12:00 PM', demand: 'Medium' }
      ],
      insights: [
        'Weekend bookings increased by 25%',
        'Customer retention rate is 85%',
        'Most popular service: Hair styling & coloring'
      ]
    };
  }
}