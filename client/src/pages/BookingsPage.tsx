import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarIcon, Clock, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useUser } from "@/hooks/use-user";

interface ServiceSlot {
  id: number;
  startTime: string;
  endTime: string;
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
}

interface Booking {
  id: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
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

  // Fetch bookings based on user role
  const { data: bookings, isLoading } = useQuery<BookingResponse[]>({
    queryKey: [businessId ? `/api/businesses/${businessId}/bookings` : `/api/bookings`],
    enabled: !!user,
  });

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
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Helper function to safely format dates
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Invalid date';
      const date = parseISO(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  // Helper function to safely format times
  const formatTime = (timeString: string) => {
    try {
      if (!timeString) return 'Invalid time';
      const date = parseISO(timeString);
      return format(date, 'HH:mm');
    } catch (error) {
      console.error('Error formatting time:', timeString, error);
      return 'Invalid time';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          {businessId ? 'Business Bookings' : 'My Appointments'}
        </h1>
      </div>

      <div className="grid gap-4">
        {bookings?.map(({ booking, service, slot, staff }) => (
          <Card key={booking.id} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{service.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    with {staff.name}
                  </p>
                </div>
                <Badge className={getStatusColor(booking.status)}>
                  {booking.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{formatDate(slot.startTime)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </span>
                </div>
                {user?.role === 'business' && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span>Duration: {service.duration} minutes</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {(!bookings || bookings.length === 0) && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No bookings found.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}