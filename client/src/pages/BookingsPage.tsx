import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarIcon, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { useUser } from "@/hooks/use-user";

interface Booking {
  booking: {
    id: number;
    status: string;
    date: string;
  };
  service: {
    name: string;
    duration: number;
    price: number;
  };
  slot: {
    startTime: string;
    endTime: string;
  };
  staff: {
    name: string;
  };
}

export default function BookingsPage({ businessId }: { businessId?: string }) {
  const { user } = useUser();

  // Fetch bookings based on user role
  const { data: bookings, isLoading } = useQuery<Booking[]>({
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
      default:
        return 'bg-gray-500 text-white';
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
                  <span>
                    {format(new Date(booking.date), 'MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(new Date(slot.startTime), 'HH:mm')} - {format(new Date(slot.endTime), 'HH:mm')}
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