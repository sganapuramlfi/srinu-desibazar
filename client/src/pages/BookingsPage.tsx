import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  CalendarIcon,
  Clock,
  User,
  XCircle,
  Calendar as CalendarCheck,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";

interface Customer {
  id: number;
  username: string;
  email: string;
}

interface ServiceSlot {
  id: number;
  startTime: string;
  endTime: string;
  displayTime: string;
}

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
}

interface Staff {
  id: number;
  name: string;
  businessId?: string; //Added businessId to Staff interface
}

interface Booking {
  id: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "rescheduled";
  notes?: string;
  customer: Customer;
  slot: ServiceSlot;
  service: Service;
  staff: Staff;
}

interface BookingResponse {
  booking: Booking;
  service: Service;
  slot: ServiceSlot;
  staff: Staff;
}


export default function BookingsPage({ businessId }: { businessId?: string }) {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancellationNote, setCancellationNote] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>();

  // Fetch bookings based on user role
  const { data: bookings = [], isLoading } = useQuery<BookingResponse[]>({
    queryKey: [businessId ? `/api/businesses/${businessId}/bookings` : `/api/bookings`],
    enabled: !!user,
  });

  // Generate time slots client-side for reschedule (same logic as availability endpoint)
  const rescheduleTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const now = new Date();
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    const currentTotalMinutes = isToday ? now.getHours() * 60 + now.getMinutes() + 30 : 0;
    const slots: string[] = [];
    for (let h = 9; h < 18; h++) {
      for (const m of [0, 30]) {
        if (h === 17 && m === 30) break;
        if (isToday && h * 60 + m < currentTotalMinutes) continue;
        const hour12 = h % 12 || 12;
        const ampm = h < 12 ? 'AM' : 'PM';
        slots.push(`${hour12}:${m === 0 ? '00' : '30'} ${ampm}`);
      }
    }
    return slots;
  }, [selectedDate]);

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async ({ bookingId, reason, bookingBusinessId }: { bookingId: number; reason: string; bookingBusinessId: number }) => {
      const response = await fetch(`/api/businesses/${bookingBusinessId}/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings`] });
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been successfully cancelled. You will receive a confirmation email shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel booking. Please try again or contact support.",
      });
    },
  });

  const rescheduleBookingMutation = useMutation({
    mutationFn: async ({
      bookingId,
      businessId,
      newDate,
      newTime,
    }: {
      bookingId: number;
      businessId: number;
      newDate: string;
      newTime: string;
    }) => {
      const response = await fetch(`/api/businesses/${businessId}/bookings/${bookingId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newDate, newTime }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to reschedule booking');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Booking Rescheduled",
        description: "Your appointment has been successfully rescheduled.",
      });
      setSelectedBooking(null);
      setSelectedDate(undefined);
      setSelectedTimeSlot(undefined);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Rescheduling Failed",
        description: error.message || "Failed to reschedule. Please try again.",
      });
    },
  });

  const handleCancelBooking = async (bookingId: number) => {
    if (!cancellationNote.trim()) {
      toast({
        variant: "destructive",
        title: "Note Required",
        description: "Please provide a reason for cancellation.",
      });
      return;
    }

    try {
      await cancelBookingMutation.mutateAsync({
        bookingId,
        reason: cancellationNote.trim(),
        bookingBusinessId: selectedBooking.businessId,
      });
      setSelectedBooking(null);
      setCancellationNote("");
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    }
  };

  const handleRescheduleBooking = async () => {
    if (!selectedBooking || !selectedDate || !selectedTimeSlot) {
      toast({
        variant: "destructive",
        title: "Invalid Selection",
        description: "Please select a new date and time for your appointment.",
      });
      return;
    }

    const businessId = (selectedBooking as any).businessId;
    if (!businessId) {
      toast({ variant: "destructive", title: "Error", description: "Cannot identify the business for this booking." });
      return;
    }

    try {
      await rescheduleBookingMutation.mutateAsync({
        bookingId: selectedBooking.id,
        businessId,
        newDate: format(selectedDate, 'yyyy-MM-dd'),
        newTime: selectedTimeSlot,
      });
    } catch (error) {
      console.error('Failed to reschedule booking:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'cancelled':
        return 'bg-red-500 text-white';
      case 'completed':
        return 'bg-blue-500 text-white';
      case 'rescheduled':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return <CalendarCheck className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      case 'rescheduled':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          {businessId ? 'Business Bookings' : 'My Appointments'}
        </h1>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="rescheduled">Rescheduled</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        {['all', 'confirmed', 'pending', 'rescheduled', 'cancelled'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {bookings.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No bookings found.
                </CardContent>
              </Card>
            ) : (
              bookings
                .filter(({ booking }) => tab === 'all' || booking.status.toLowerCase() === tab)
                .map(({ booking, service, slot, staff }) => (
                  <Card key={booking.id}>
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">
                            {service?.name || booking.specialRequests || `Booking #${booking.id}`}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {staff?.name ? `with ${staff.name}` : 'Table Reservation'}
                          </p>
                          {businessId && booking.customer && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Booked by: {booking.customer.username} ({booking.customer.email})
                            </p>
                          )}
                        </div>
                        <Badge className={`flex items-center gap-1 ${getStatusColor(booking.status)}`}>
                          {getStatusIcon(booking.status)}
                          {booking.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {slot?.startTime 
                              ? format(parseISO(slot.startTime), 'MMMM d, yyyy')
                              : booking.startTime 
                                ? format(parseISO(booking.startTime), 'MMMM d, yyyy')
                                : 'Date not available'
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>
                            {slot?.displayTime 
                              || (booking.startTime 
                                ? format(parseISO(booking.startTime), 'h:mm a')
                                : 'Time not available')
                            }
                          </span>
                        </div>
                        {service?.duration && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4" />
                            <span>Duration: {service.duration} minutes</span>
                          </div>
                        )}

                        {booking.notes && (
                          <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                            <p className="font-medium">Notes:</p>
                            <p className="text-muted-foreground">{booking.notes}</p>
                          </div>
                        )}

                        {/* Action buttons based on booking status */}
                        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                          <div className="flex gap-2 mt-4">
                            {/* Cancel Dialog */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => setSelectedBooking(booking)}
                                >
                                  Cancel Booking
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Cancel Booking</DialogTitle>
                                  <DialogDescription>
                                    Please provide a reason for cancelling this booking. This will help us improve our services.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <Textarea
                                    placeholder="Reason for cancellation..."
                                    value={cancellationNote}
                                    onChange={(e) => setCancellationNote(e.target.value)}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedBooking(null);
                                        setCancellationNote("");
                                      }}
                                    >
                                      Keep Booking
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => {
                                        if (selectedBooking) {
                                          handleCancelBooking(selectedBooking.id);
                                        }
                                      }}
                                    >
                                      Yes, Cancel
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* Reschedule Dialog */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => setSelectedBooking(booking)}
                                >
                                  Reschedule
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reschedule Appointment</DialogTitle>
                                  <DialogDescription>
                                    Choose a new date and time for your appointment.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Select Date</label>
                                    <Calendar
                                      mode="single"
                                      selected={selectedDate}
                                      onSelect={setSelectedDate}
                                      className="rounded-md border"
                                      disabled={(date) => date < startOfDay(new Date())}
                                    />
                                  </div>
                                  {selectedDate && (
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Select Time</label>
                                      {rescheduleTimeSlots.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-2">No available times for this date. Try another day.</p>
                                      ) : (
                                        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                          {rescheduleTimeSlots.map((time) => (
                                            <Button
                                              key={time}
                                              variant={selectedTimeSlot === time ? "default" : "outline"}
                                              size="sm"
                                              onClick={() => setSelectedTimeSlot(time)}
                                              className="text-xs"
                                            >
                                              {time}
                                            </Button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex justify-end gap-2 mt-4">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedBooking(null);
                                        setSelectedDate(undefined);
                                        setSelectedTimeSlot(undefined);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={handleRescheduleBooking}
                                      disabled={!selectedDate || !selectedTimeSlot}
                                    >
                                      Confirm Reschedule
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}