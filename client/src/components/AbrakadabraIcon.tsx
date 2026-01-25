import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageCircle, X, Send, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";

interface AbrakadabraIconProps {
  context?: 'directory' | 'booking' | 'business-profile';
}

export function AbrakadabraIcon({ context = 'directory' }: AbrakadabraIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversation, setConversation] = useState<Array<{
    type: 'user' | 'abra';
    content: string;
    suggestions?: string[];
    restaurants?: any[];
  }>>([]);
  
  // Refs for scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Navigation and user hooks
  const [, setLocation] = useLocation();
  const { user } = useUser();

  // Context-aware welcome messages
  const getWelcomeMessage = () => {
    switch (context) {
      case 'booking':
        return "I can help you find the perfect time and place for your visit! 📅";
      case 'business-profile':
        return "Looking for something similar or want to explore more options? ✨";
      default:
        return "What can I help you discover today? I'll find something magical! ✨";
    }
  };

  // Smart suggestions based on context
  const getSmartSuggestions = () => {
    switch (context) {
      case 'booking':
        return ["Best time to visit?", "Similar places nearby", "Add to my favorites"];
      case 'business-profile':
        return ["More like this", "Compare options", "Book for tonight"];
      default:
        return ["Italian restaurants", "Hair salons", "Spice pavilion", "Best rated"];
    }
  };

  const handleSend = async () => {
    if (!query.trim()) return;

    // Store query before clearing it
    const userQuery = query;
    
    // Add user message
    setConversation(prev => [...prev, { type: 'user', content: userQuery }]);
    setIsTyping(true);
    setQuery('');

    try {
      console.log('[AbrakadabraIcon] Making API call with query:', userQuery);
      
      // Call AI Genie with original working format  
      const response = await fetch('/api/ai-genie/genie/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userQuery,
          userLocation: 'Melbourne',
          context: context,
          preferences: {}
        })
      });

      console.log('[AbrakadabraIcon] Response status:', response.status);

      if (!response.ok) {
        console.error('[AbrakadabraIcon] Response not OK:', response.status);
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('[AbrakadabraIcon] API Response data:', data);
      console.log('[AbrakadabraIcon] Recommendations:', data.recommendations);
      console.log('[AbrakadabraIcon] Understanding:', data.understanding);

      // Simulate magical response delay
      setTimeout(() => {
        setConversation(prev => [...prev, {
          type: 'abra',
          content: data.understanding || "✨ Let me work some magic and find perfect options for you!",
          restaurants: data.recommendations?.slice(0, 3),
          suggestions: ["Book now", "More options", "Change preferences"]
        }]);
        setIsTyping(false);
        // Auto-scroll to bottom
        setTimeout(() => scrollToBottom(), 100);
      }, 1200);

    } catch (error) {
      console.error('[AbrakadabraIcon] API Error:', error);
      
      // Try to use fallback businesses from local data
      const fallbackBusinesses = [
        { id: 1, name: "Hair & Beauty Studio", rating: 4.8, description: "Premium hair and beauty services in the heart of Melbourne" },
        { id: 2, name: "Italian Flavors Restaurant", rating: 4.2, description: "Authentic Italian cuisine with a modern twist" }
      ];
      
      setTimeout(() => {
        setConversation(prev => [...prev, {
          type: 'abra',
          content: "My magic wand needs a moment... but I can still help! 🪄",
          restaurants: fallbackBusinesses,
          suggestions: ["Browse categories", "Search restaurants"]
        }]);
        setIsTyping(false);
        // Auto-scroll to bottom
        setTimeout(() => scrollToBottom(), 100);
      }, 800);
    }
  };

  // Auto-scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll to bottom when conversation changes
  useEffect(() => {
    scrollToBottom();
  }, [conversation, isTyping]);

  // Clean floating button - always the same
  const FloatingButton = () => (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {/* Pulse animation for attention */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-ping opacity-20"></div>
        
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group"
          title="Ask Abrakadabra"
        >
          <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          
          {/* Smart notification badge */}
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
            ✨
          </div>
        </button>
      </div>
    </div>
  );

  const ChatPopup = () => (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg h-[85vh] sm:h-[700px] flex flex-col animate-slideUp shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-full">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Abrakadabra</h3>
              <p className="text-xs opacity-90">Your magical business assistant</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20 p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Chat Area */}
        <CardContent className="flex-1 flex flex-col p-0">
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[500px] scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-100"
            style={{ scrollBehavior: 'smooth' }}
          >
            {/* Welcome message */}
            <div className="flex justify-start">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 max-w-[85%] border-l-4 border-purple-400">
                <p className="text-sm">{getWelcomeMessage()}</p>
              </div>
            </div>

            {/* Quick suggestions */}
            {conversation.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 text-center">Try asking:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {getSmartSuggestions().map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(suggestion)}
                      className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation */}
            {conversation.map((message, idx) => (
              <div key={idx} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 ${
                  message.type === 'user' 
                    ? 'bg-blue-500 text-white'
                    : 'bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-400'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  
                  {/* Restaurant recommendations */}
                  {message.restaurants && (
                    <div className="mt-3 space-y-2">
                      {message.restaurants.map((restaurant, restIdx) => (
                        <div key={restaurant.id} className="bg-white rounded-lg p-3 border">
                          <div className="flex justify-between items-start mb-1">
                            <h5 className="font-medium text-gray-800 text-sm">{restaurant.name}</h5>
                            <span className="text-xs text-yellow-600 flex items-center gap-1">
                              ⭐ {restaurant.rating.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{restaurant.description}</p>
                          
                          {/* AI Enhancement Display */}
                          {restaurant.aiRecommendation && (
                            <div className="text-xs bg-purple-50 text-purple-700 rounded px-2 py-1 mb-2">
                              🤖 {restaurant.aiRecommendation}
                            </div>
                          )}
                          {restaurant.bookingInsight && (
                            <div className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-1 mb-2">
                              💡 {restaurant.bookingInsight}
                            </div>
                          )}
                          {restaurant.availability && restaurant.availability !== 'moderate' && (
                            <div className={`text-xs rounded px-2 py-1 mb-2 ${
                              restaurant.availability === 'good' 
                                ? 'bg-green-50 text-green-700' 
                                : 'bg-orange-50 text-orange-700'
                            }`}>
                              🕒 Availability: {restaurant.availability}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="flex-1 text-xs py-1"
                              onClick={() => {
                                if (user) {
                                  // If logged in, go to storefront with booking intent
                                  const slug = restaurant.slug;
                                  setLocation(`/storefront/${slug}?action=book`);
                                } else {
                                  // If not logged in, go to sign-in with return URL to storefront
                                  const slug = restaurant.slug;
                                  setLocation('/auth?mode=signin&return=' + encodeURIComponent(`/storefront/${slug}?action=book`));
                                }
                              }}
                            >
                              Book Now
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs py-1"
                              onClick={() => {
                                // View public storefront using slug for SEO
                                const slug = restaurant.slug || `${restaurant.name.toLowerCase().replace(/\s+/g, '-')}`;
                                setLocation(`/storefront/${slug}`);
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action suggestions */}
                  {message.suggestions && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.suggestions.map((suggestion, suggIdx) => (
                        <button
                          key={suggIdx}
                          className="text-xs bg-white/50 hover:bg-white/80 px-2 py-1 rounded transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border-l-4 border-purple-400">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-xs text-purple-600">Abra is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Invisible div for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isTyping}
                autoFocus
              />
              <Button 
                onClick={handleSend}
                disabled={!query.trim() || isTyping}
                size="sm"
                className="px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <FloatingButton />
      {isOpen && <ChatPopup />}
    </>
  );
}

// Animation styles
const additionalStyles = `
@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(100%); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

.animate-slideUp {
  animation: slideUp 0.3s ease-out;
}
`;