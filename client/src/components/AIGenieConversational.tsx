import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Star, Clock, Users } from 'lucide-react';

interface Restaurant {
  id: number;
  name: string;
  slug: string;
  description: string;
  rating: number;
  current_demand: string;
  wait_time_minutes: number;
  intelligenceScore: number;
  contextualReasons: string[];
  suggestedActions: string[];
}

interface AIGenieResponse {
  success: boolean;
  understanding: string;
  recommendations: Restaurant[];
  proactiveInsights: string[];
}

export function AIGenieConversational() {
  const [query, setQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [conversation, setConversation] = useState<Array<{
    type: 'user' | 'ai';
    content: string;
    restaurants?: Restaurant[];
    insights?: string[];
  }>>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    // Add user message
    setConversation(prev => [...prev, {
      type: 'user',
      content: query
    }]);

    setIsThinking(true);
    setQuery('');

    try {
      const response = await fetch('/api/ai/public/genie/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userLocation: 'Melbourne', // Could get from user location
          preferences: {}
        })
      });

      const data: AIGenieResponse = await response.json();

      // Add AI response with natural delay
      setTimeout(() => {
        setConversation(prev => [...prev, {
          type: 'ai',
          content: data.understanding,
          restaurants: data.recommendations?.slice(0, 3), // Show top 3
          insights: data.proactiveInsights
        }]);
        setIsThinking(false);
      }, 1500); // Natural conversation pause

    } catch (error) {
      console.error('AI Genie error:', error);
      setConversation(prev => [...prev, {
        type: 'ai',
        content: "I'm having trouble right now, but I can still help you browse restaurants manually. What type of food are you interested in?"
      }]);
      setIsThinking(false);
    }
  };

  const TypingIndicator = () => (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg max-w-xs">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
      </div>
      <span className="text-sm text-gray-600">Finding perfect matches...</span>
    </div>
  );

  const RestaurantCard = ({ restaurant, index }: { restaurant: Restaurant; index: number }) => (
    <Card 
      className="overflow-hidden animate-fadeIn border-l-4 border-l-orange-400"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-gray-800">{restaurant.name}</h4>
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{restaurant.rating.toFixed(1)}</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">{restaurant.description}</p>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{restaurant.wait_time_minutes} min wait</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span className="capitalize">{restaurant.current_demand} demand</span>
          </div>
        </div>

        {restaurant.contextualReasons && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Why this matches:</p>
            <div className="flex flex-wrap gap-1">
              {restaurant.contextualReasons.slice(0, 2).map((reason, idx) => (
                <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {reason}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            View Menu
          </Button>
          <Button size="sm" className="flex-1">
            Reserve Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Conversation Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          What are you in the mood for? 🍽️
        </h2>
        <p className="text-gray-600">
          Tell me your craving, and I'll find the perfect place for you
        </p>
      </div>

      {/* Conversation Thread */}
      <div className="space-y-4 mb-6 min-h-[200px]">
        {conversation.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Try something like:</p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {[
                "Family Italian dinner",
                "Quick sushi lunch", 
                "Vegetarian options near me",
                "Romantic dinner for two"
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(suggestion)}
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {conversation.map((message, idx) => (
          <div key={idx} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white rounded-lg px-4 py-2'
                : 'space-y-4'
            }`}>
              {message.type === 'user' ? (
                <p>{message.content}</p>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-l-blue-400">
                    <p className="text-gray-700 leading-relaxed">{message.content}</p>
                  </div>
                  
                  {message.insights && message.insights.length > 0 && (
                    <div className="bg-amber-50 rounded-lg p-3 border-l-4 border-l-amber-400">
                      <p className="text-sm text-amber-800">💡 {message.insights[0]}</p>
                    </div>
                  )}
                  
                  {message.restaurants && (
                    <div className="space-y-3">
                      {message.restaurants.map((restaurant, restIdx) => (
                        <RestaurantCard key={restaurant.id} restaurant={restaurant} index={restIdx} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <TypingIndicator />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex gap-2 bg-white border rounded-lg p-2 shadow-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., Family Indian dinner with kids..."
          className="border-0 shadow-none focus-visible:ring-0"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          disabled={isThinking}
        />
        <Button 
          onClick={handleSearch} 
          disabled={!query.trim() || isThinking}
          className="px-6"
        >
          {isThinking ? 'Finding...' : 'Search'}
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center gap-2 mt-4">
        <Button variant="ghost" size="sm" className="text-xs">
          <MapPin className="w-3 h-3 mr-1" />
          Use my location
        </Button>
      </div>
    </div>
  );
}

// Add to global CSS
const styles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-out forwards;
}
`;