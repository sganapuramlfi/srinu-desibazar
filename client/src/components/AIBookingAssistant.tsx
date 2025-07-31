import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Clock, CheckCircle, AlertCircle, User } from 'lucide-react';
import { useAIStatusWrapper } from './AIIntegration';

interface AIBookingAssistantProps {
  businessId: number;
  services: any[];
  onBookingComplete?: (bookingData: any) => void;
}

// Mock hook since we don't have the real one available in this context
const useAIBooking = () => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const sendMessage = async (request: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      const data = await res.json();
      setResponse(data);
      return data;
    } catch (error) {
      return { action: 'error', message: 'AI assistant unavailable' };
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, loading, response };
};

export function AIBookingAssistant({ businessId, services, onBookingComplete }: AIBookingAssistantProps) {
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string, timestamp: Date}>>([]);
  const [input, setInput] = useState('');
  const [bookingStep, setBookingStep] = useState<'chat' | 'confirm' | 'completed'>('chat');
  const [proposedBooking, setProposedBooking] = useState<any>(null);
  
  const { status: aiStatus } = useAIStatusWrapper();
  const { sendMessage, loading, response } = useAIBooking();

  // Initialize with welcome message
  useEffect(() => {
    if (aiStatus?.enabled && aiStatus?.features?.bookingAssistant) {
      setMessages([{
        role: 'assistant',
        content: `Hi! I'm your AI booking assistant. I can help you book services, check availability, or answer questions about our offerings. What would you like to do today?`,
        timestamp: new Date()
      }]);
    }
  }, [aiStatus]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage, 
      timestamp: new Date() 
    }]);

    // Send to AI
    const aiResponse = await sendMessage({
      message: userMessage,
      businessId,
      userId: 1, // This would come from auth context
      availableServices: services,
      userHistory: [] // This would come from user's booking history
    });

    if (aiResponse) {
      // Add AI response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: aiResponse.message, 
        timestamp: new Date() 
      }]);

      // Handle different AI actions
      switch (aiResponse.action) {
        case 'book':
          setProposedBooking(aiResponse.bookingData);
          setBookingStep('confirm');
          break;
        case 'suggest':
          // AI provided suggestions, stay in chat mode
          break;
        case 'clarify':
          // AI needs more information, stay in chat mode
          break;
        case 'error':
          // Handle error case
          break;
      }
    }
  };

  const confirmBooking = async () => {
    if (!proposedBooking) return;

    try {
      // Make actual booking API call
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposedBooking)
      });

      if (response.ok) {
        setBookingStep('completed');
        onBookingComplete?.(proposedBooking);
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Great! Your booking has been confirmed. You should receive a confirmation email shortly.',
          timestamp: new Date()
        }]);
      } else {
        throw new Error('Booking failed');
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an issue confirming your booking. Please try again or contact us directly.',
        timestamp: new Date()
      }]);
    }
  };

  if (!aiStatus?.enabled || !aiStatus?.features?.bookingAssistant) {
    return null;
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
        <CardTitle className="flex items-center gap-2 text-purple-800">
          <Sparkles className="w-5 h-5" />
          AI Booking Assistant
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Online
          </Badge>
        </CardTitle>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start gap-3 max-w-[80%] ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-purple-100 text-purple-600'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {message.content}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Booking Confirmation Panel */}
      {bookingStep === 'confirm' && proposedBooking && (
        <div className="border-t bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-2">Confirm Your Booking</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Service:</strong> {proposedBooking.service}</p>
                <p><strong>Date:</strong> {proposedBooking.date}</p>
                <p><strong>Time:</strong> {proposedBooking.time}</p>
                <p><strong>Duration:</strong> {proposedBooking.duration}</p>
                <p><strong>Price:</strong> ${proposedBooking.price}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <Button onClick={confirmBooking} size="sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Booking
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setBookingStep('chat')} 
                  size="sm"
                >
                  Modify
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      {bookingStep === 'chat' && (
        <div className="border-t p-4">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about services, availability, or say 'book appointment'..."
              disabled={loading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={loading || !input.trim()}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              AI Assistant Active
            </span>
            <span>Try: "Book haircut tomorrow 2pm" or "What services do you offer?"</span>
          </div>
        </div>
      )}
    </Card>
  );
}