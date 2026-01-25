import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Scissors, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Star,
  DollarSign
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { bookingService } from "@/services/bookingService";

interface ServiceBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: number;
  businessName: string;
  industryType: string;
  initialService?: string;
  initialDateTime?: string;
  initialPreferences?: any;
}

interface Service {
  id: number;
  name: string;
  description?: string;
  category: string;
  durationMinutes: number;
  price: string;
  requiresConsultation?: boolean;
}

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  specializations?: string[];
  yearsExperience?: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
  staffId?: number;
  staffName?: string;
}

/**
 * Service Booking Dialog - Handles salon, spa, wellness, fitness bookings
 * 
 * Features:
 * - Service selection with categories
 * - Staff selection and scheduling
 * - Date/time picker with availability
 * - Industry-specific customizations
 * - Integration with universal booking system
 */
export function ServiceBookingDialog({
  isOpen,
  onClose,
  businessId,
  businessName,
  industryType,
  initialService,
  initialDateTime,
  initialPreferences = {}
}: ServiceBookingDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'service' | 'staff' | 'datetime' | 'confirm'>('service');

  // Fetch services for this business
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: [`business-services-${businessId}-${industryType}`],
    queryFn: () => bookingService.getBusinessServices(businessId, industryType),
    enabled: isOpen && !!businessId,
  });

  // Fetch staff for selected service
  const { data: availableStaff = [], isLoading: staffLoading } = useQuery({
    queryKey: [`business-staff-${businessId}-${industryType}-${selectedService?.id}`],
    queryFn: () => bookingService.getBusinessStaff(businessId, industryType, selectedService?.id),
    enabled: !!selectedService,
  });

  // Fetch available time slots
  const { data: timeSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: [
      `availability-${businessId}-${industryType}`, 
      selectedService?.id, 
      selectedStaff?.id, 
      format(selectedDate, 'yyyy-MM-dd')
    ],
    queryFn: () => bookingService.getAvailableSlots({
      businessId,
      industryType,
      serviceId: selectedService?.id,
      staffId: selectedStaff?.id,
      date: format(selectedDate, 'yyyy-MM-dd')
    }),
    enabled: !!selectedService && !!selectedStaff && !!selectedDate,
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      if (!user) throw new Error('User not authenticated');
      
      return bookingService.createBooking({
        businessId,
        industryType,
        customerId: user.id,
        bookingData
      });
    },
    onSuccess: () => {
      toast({
        title: "Booking Confirmed! 🎉",
        description: `Your appointment at ${businessName} has been booked successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/bookings`] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Please try again or contact the business directly.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedDate(new Date());
    setSelectedTime('');
    setNotes('');
    setStep('service');
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep('staff');
  };

  const handleStaffSelect = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setStep('datetime');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('confirm');
  };

  const handleConfirmBooking = () => {
    if (!selectedService || !selectedStaff || !selectedTime) return;

    const bookingData = {
      serviceId: selectedService.id,
      staffId: selectedStaff.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedTime,
      durationMinutes: selectedService.durationMinutes,
      notes: notes,
      industryType: industryType,
      // Add industry-specific data
      ...(industryType === 'salon' && {
        requiresConsultation: selectedService.requiresConsultation
      })
    };

    createBookingMutation.mutate(bookingData);
  };

  // Group services by category
  const servicesByCategory = services.reduce((acc: any, service: Service) => {
    const category = service.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {});

  const renderServiceSelection = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Choose Your Service</h3>
        <p className="text-gray-600">What would you like to book today?</p>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {Object.entries(servicesByCategory).map(([category, categoryServices]: [string, any]) => (
          <div key={category}>
            <h4 className="font-medium text-sm text-gray-800 mb-2 uppercase tracking-wide">
              {category}
            </h4>
            <div className="space-y-2">
              {categoryServices.map((service: Service) => (
                <Card 
                  key={service.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleServiceSelect(service)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium">{service.name}</h5>
                        {service.description && (
                          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {service.durationMinutes}min
                          </Badge>
                          {service.requiresConsultation && (
                            <Badge variant="outline" className="text-xs">
                              Consultation Required
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">${service.price}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStaffSelection = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Choose Your Specialist</h3>
        <p className="text-gray-600">Select your preferred {industryType} professional</p>
      </div>

      {staffLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {availableStaff.map((staff: StaffMember) => (
            <Card 
              key={staff.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleStaffSelect(staff)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                    {staff.firstName[0]}{staff.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium">
                      {staff.displayName || `${staff.firstName} ${staff.lastName}`}
                    </h5>
                    {staff.bio && (
                      <p className="text-sm text-gray-600">{staff.bio}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {staff.yearsExperience && (
                        <Badge variant="secondary" className="text-xs">
                          {staff.yearsExperience} years
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-600">4.9</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button variant="outline" onClick={() => setStep('service')} className="w-full">
        ← Back to Services
      </Button>
    </div>
  );

  const renderDateTimeSelection = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Pick Date & Time</h3>
        <p className="text-gray-600">When would you like your appointment?</p>
      </div>

      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          disabled={(date) => date < startOfDay(new Date())}
          className="rounded-md border"
        />
      </div>

      {slotsLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div>
          <h4 className="font-medium mb-3">Available Times</h4>
          <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
            {timeSlots
              .filter((slot: TimeSlot) => slot.available)
              .map((slot: TimeSlot) => (
                <Button
                  key={slot.time}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTimeSelect(slot.time)}
                  className="text-center"
                >
                  {slot.time}
                </Button>
              ))}
          </div>
        </div>
      )}

      <Button variant="outline" onClick={() => setStep('staff')} className="w-full">
        ← Back to Staff
      </Button>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-4">
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
        <h3 className="text-lg font-semibold">Confirm Your Booking</h3>
        <p className="text-gray-600">Review your appointment details</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Service:</span>
            <span className="font-medium">{selectedService?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Staff:</span>
            <span className="font-medium">
              {selectedStaff?.displayName || `${selectedStaff?.firstName} ${selectedStaff?.lastName}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Time:</span>
            <span className="font-medium">{selectedTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium">{selectedService?.durationMinutes} minutes</span>
          </div>
          <hr />
          <div className="flex justify-between text-lg font-semibold">
            <span>Total:</span>
            <span>${selectedService?.price}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="booking-notes">Special Requests (Optional)</Label>
        <Textarea
          id="booking-notes"
          placeholder="Any special requests or notes for your appointment..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('datetime')} className="flex-1">
          ← Back
        </Button>
        <Button 
          onClick={handleConfirmBooking}
          disabled={createBookingMutation.isPending}
          className="flex-1"
        >
          {createBookingMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Confirm Booking
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-purple-600" />
            Book at {businessName}
          </DialogTitle>
          <DialogDescription>
            Step {step === 'service' ? 1 : step === 'staff' ? 2 : step === 'datetime' ? 3 : 4} of 4
          </DialogDescription>
        </DialogHeader>

        {step === 'service' && renderServiceSelection()}
        {step === 'staff' && renderStaffSelection()}
        {step === 'datetime' && renderDateTimeSelection()}
        {step === 'confirm' && renderConfirmation()}
      </DialogContent>
    </Dialog>
  );
}