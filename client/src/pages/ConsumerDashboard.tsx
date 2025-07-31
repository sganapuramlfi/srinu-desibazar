import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MessageCircle, Heart, User, Sparkles, Zap, Brain, TrendingUp } from "lucide-react";
import BookingsPage from "./BookingsPage";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AIAssistantWidgetWrapper, useAIStatusWrapper } from "@/components/AIIntegration";


interface Message {
  id: number;
  bookingId: number;
  fromUser: string;
  content: string;
  createdAt: string;
}

interface FavoriteBusiness {
  id: number;
  name: string;
  description: string;
  category: string;
}

export default function ConsumerDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  
  // Check AI availability
  const { status: aiStatus } = useAIStatusWrapper();

  // Fetch messages
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
    enabled: true,
  });

  // Fetch favorite businesses
  const { data: favorites = [] } = useQuery<FavoriteBusiness[]>({
    queryKey: ['/api/favorites'],
    enabled: true,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ bookingId, content }: { bookingId: number; content: string }) => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bookingId, content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      setMessageContent("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to Send",
        description: "Could not send your message. Please try again.",
      });
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (businessId: number) => {
      const response = await fetch(`/api/favorites/${businessId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update favorites');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      toast({
        title: "Favorites Updated",
        description: "Your favorites list has been updated.",
      });
    },
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
      </div>

      {/* AI Features Banner */}
      {aiStatus?.enabled && (
        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Sparkles className="w-6 h-6" />
              ABRAKADABRA AI Assistant
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-purple-100">
                <div className="flex items-center gap-3 mb-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-900">Smart Recommendations</span>
                </div>
                <p className="text-sm text-gray-600">Get personalized business suggestions based on your preferences</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-purple-100">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Instant Booking</span>
                </div>
                <p className="text-sm text-gray-600">Book appointments using natural language commands</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-purple-100">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-900">Smart Insights</span>
                </div>
                <p className="text-sm text-gray-600">Track your booking patterns and get optimization tips</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            My Bookings
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="ai-assistant" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <BookingsPage />
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground">
                    No messages yet. Messages related to your bookings will appear here.
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{message.fromUser}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites">
          <Card>
            <CardHeader>
              <CardTitle>Favorite Businesses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {favorites.length === 0 ? (
                  <div className="text-center text-muted-foreground col-span-full">
                    No favorites yet. Add businesses to your favorites list for quick access.
                  </div>
                ) : (
                  favorites.map((business) => (
                    <Card key={business.id}>
                      <CardHeader>
                        <CardTitle>{business.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {business.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge>{business.category}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleFavoriteMutation.mutate(business.id)}
                          >
                            <Heart className="h-4 w-4 mr-2 fill-current" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-assistant">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Assistant Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiStatus?.enabled ? (
                <div className="space-y-6">
                  {/* AI Features Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-600" />
                        Personal AI Insights
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Your AI assistant has analyzed your booking patterns and preferences.
                      </p>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Favorite Services:</span> Hair styling, Massage therapy
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Preferred Times:</span> Weekday afternoons
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Booking Pattern:</span> Monthly regular appointments
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-600" />
                        Quick AI Actions
                      </h4>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Sparkles className="w-4 h-4 mr-2" />
                          Find similar businesses
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Calendar className="w-4 h-4 mr-2" />
                          Suggest next appointment
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Optimize my schedule
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendations */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI Recommendations for You
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-white p-3 rounded border border-purple-100">
                        <p className="text-sm text-gray-800">
                          🎯 <strong>Perfect Match:</strong> "Serenity Spa" has 95% compatibility with your preferences - they offer the massage therapy you love with weekend availability.
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded border border-purple-100">
                        <p className="text-sm text-gray-800">
                          ⏰ <strong>Optimal Timing:</strong> Based on your history, booking Tuesday 2-4 PM gives you the best service availability and shorter wait times.
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded border border-purple-100">
                        <p className="text-sm text-gray-800">
                          💡 <strong>Smart Tip:</strong> Your favorite stylist Sarah is typically less busy on Wednesday mornings - perfect for your monthly hair appointment.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Usage Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">12</div>
                      <div className="text-sm text-gray-600">AI Bookings Made</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">89%</div>
                      <div className="text-sm text-gray-600">Accuracy Rate</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">3.2s</div>
                      <div className="text-sm text-gray-600">Avg Response Time</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">AI Assistant Coming Soon!</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Our ABRAKADABRA AI Assistant is being prepared to make your booking experience magical. 
                    Get ready for personalized recommendations, smart scheduling, and instant booking assistance.
                  </p>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    🚀 Launching Soon
                  </Badge>
                  
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <Brain className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <h4 className="font-medium text-sm mb-1">Smart Recommendations</h4>
                      <p className="text-xs text-gray-600">AI-powered business suggestions</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <Zap className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <h4 className="font-medium text-sm mb-1">Natural Language Booking</h4>
                      <p className="text-xs text-gray-600">Book with simple conversation</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <h4 className="font-medium text-sm mb-1">Personal Insights</h4>
                      <p className="text-xs text-gray-600">Track and optimize your preferences</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground">
                Coming soon: Update your profile information and preferences
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Assistant Widget - Available on all pages */}
      {aiStatus?.enabled && <AIAssistantWidgetWrapper />}
    </div>
  );
}