import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MessageCircle, Heart, User } from "lucide-react";
import BookingsPage from "./BookingsPage";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";


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

      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
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
    </div>
  );
}