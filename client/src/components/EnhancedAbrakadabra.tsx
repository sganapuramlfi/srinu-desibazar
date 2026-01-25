import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Send, 
  User, 
  Bot, 
  MapPin, 
  Star, 
  Clock, 
  Users, 
  Calendar,
  ArrowRight,
  Loader2,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { TableBookingDialog } from './TableBookingDialog';
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ConversationalAction[];
  businessContext?: BusinessResult;
}

interface ConversationalAction {
  type: 'book_table' | 'view_business' | 'search_similar' | 'get_directions' | 'call_business';
  label: string;
  data: any;
  primary?: boolean;
}

interface BusinessResult {
  id: number;
  name: string;
  description: string;
  industryType: string;
  slug: string;
  rating: number;
  reviewCount: number;
  address: string;
  availability?: {
    nextAvailable: string;
    popularTimes: string[];
  };
}

interface EnhancedAbrakadabraProps {
  onBusinessSelect?: (business: BusinessResult) => void;
  initialQuery?: string;
  context?: 'landing' | 'search' | 'business';
}

export function EnhancedAbrakadabra({ 
  onBusinessSelect, 
  initialQuery = "",
  context = 'landing' 
}: EnhancedAbrakadabraProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Process initial query if provided
  useEffect(() => {
    if (initialQuery.trim()) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  const handleSendMessage = async (message?: string) => {
    const queryText = message || inputValue.trim();
    if (!queryText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: queryText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Enhanced AI query with conversational context
      const response = await fetch('/api/ai-genie/conversational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          context: {
            userLocation: 'Melbourne CBD',
            conversationHistory: messages.slice(-3), // Last 3 messages for context
            searchContext: context,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error('AI service unavailable');
      }

      const aiResult = await response.json();
      
      // Create assistant response with actions
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResult.response,
        timestamp: new Date(),
        actions: generateActionsFromAI(aiResult),
        businessContext: aiResult.businessResults?.[0]
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-select business if AI has high confidence
      if (aiResult.businessResults?.length === 1 && aiResult.confidence > 0.8) {
        setSelectedBusiness(aiResult.businessResults[0]);
      }

    } catch (error) {
      console.error('AI Genie error:', error);
      
      // Fallback to enhanced search
      await handleFallbackSearch(queryText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFallbackSearch = async (query: string) => {
    try {
      // Use enhanced search with business intelligence
      const searchResponse = await fetch(`/api/businesses/search?q=${encodeURIComponent(query)}&location=melbourne&aiEnhanced=true`);
      const searchResults = await searchResponse.json();

      let fallbackResponse = "";
      let actions: ConversationalAction[] = [];

      if (searchResults.businesses?.length > 0) {
        const business = searchResults.businesses[0];
        fallbackResponse = `I found **${business.name}**! ${business.description || ''} 
        
Located at ${business.contactInfo?.address || 'Melbourne'} with ${business.averageRating || 4.5}⭐ rating.

Would you like me to help you book a table or find out more?`;
        
        actions = [
          {
            type: 'book_table',
            label: 'Book Table',
            data: { businessId: business.id, businessName: business.name },
            primary: true
          },
          {
            type: 'view_business',
            label: 'View Details',
            data: { slug: business.slug }
          }
        ];

        setSelectedBusiness({
          id: business.id,
          name: business.name,
          description: business.description || '',
          industryType: business.industryType,
          slug: business.slug || '',
          rating: business.averageRating || 4.5,
          reviewCount: business.reviewCount || 0,
          address: business.contactInfo?.address || 'Melbourne'
        });
      } else {
        fallbackResponse = `I couldn't find an exact match for "${query}". Let me help you search for something similar. 

Could you tell me:
- What type of business are you looking for?
- What area in Melbourne?
- Any specific preferences?`;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: fallbackResponse,
        timestamp: new Date(),
        actions: actions,
        businessContext: selectedBusiness
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Fallback search error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm having trouble processing your request right now. Please try again or use the search above.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const generateActionsFromAI = (aiResult: any): ConversationalAction[] => {
    const actions: ConversationalAction[] = [];

    if (aiResult.intent === 'book_table' && aiResult.businessResults?.length > 0) {
      const business = aiResult.businessResults[0];
      actions.push({
        type: 'book_table',
        label: '🍽️ Book Table',
        data: { businessId: business.id, businessName: business.name },
        primary: true
      });
    }

    if (aiResult.businessResults?.length > 0) {
      actions.push({
        type: 'view_business',
        label: '👀 View Details',
        data: { slug: aiResult.businessResults[0].slug }
      });
    }

    if (aiResult.intent === 'find_similar') {
      actions.push({
        type: 'search_similar',
        label: '🔍 Find Similar',
        data: { query: aiResult.enhancedQuery }
      });
    }

    return actions;
  };

  const handleAction = async (action: ConversationalAction) => {
    switch (action.type) {
      case 'book_table':
        if (selectedBusiness?.industryType === 'restaurant') {
          setIsBookingDialogOpen(true);
        } else {
          toast({
            title: "Booking Available",
            description: "This will open the booking system for this business.",
          });
        }
        break;
        
      case 'view_business':
        window.open(`/storefront/${action.data.slug}`, '_blank');
        break;
        
      case 'search_similar':
        // Add a new AI message for similar search
        const searchMessage = `Show me similar businesses to what I was looking for`;
        handleSendMessage(searchMessage);
        break;
        
      case 'get_directions':
        const address = selectedBusiness?.address || action.data.address;
        window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
        break;
        
      case 'call_business':
        if (action.data.phone) {
          window.open(`tel:${action.data.phone}`, '_self');
        }
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            Abrakadabra AI Assistant
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Enhanced
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                <p className="text-lg font-medium mb-2">Hi! I'm your magical food assistant 🧞‍♂️</p>
                <p className="text-sm">Try asking me:</p>
                <div className="mt-3 space-y-1 text-xs">
                  <p>"I want to book a table at Spice Pavilion CBD"</p>
                  <p>"Find me the best Italian restaurant for tonight"</p>
                  <p>"Show me restaurants with live music"</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' ? 'bg-blue-500' : 'bg-purple-500'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>
                  
                  <div className={`rounded-lg p-3 ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-muted border'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm">
                      {message.content}
                    </div>
                    
                    {/* Business Context Card */}
                    {message.businessContext && (
                      <Card className="mt-2 border-purple-200">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium">{message.businessContext.name}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {message.businessContext.address}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs">{message.businessContext.rating}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{message.businessContext.description}</p>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Action Buttons */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {message.actions.map((action, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant={action.primary ? "default" : "outline"}
                            onClick={() => handleAction(action)}
                            className={action.primary ? "bg-purple-600 hover:bg-purple-700" : ""}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-muted border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything about booking, restaurants, or local services..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Booking Dialog */}
      {selectedBusiness && (
        <TableBookingDialog
          isOpen={isBookingDialogOpen}
          onClose={() => setIsBookingDialogOpen(false)}
          businessId={selectedBusiness.id}
          businessName={selectedBusiness.name}
        />
      )}
    </div>
  );
}