import { BookingRequest, BookingSlot, AvailabilityQuery, BookingValidation, BookingRules, TimeSlot, WorkingHours } from './types.js';
import { BaseBooking, BookingStatus } from '../../core/types.js';

export class BookingService {
  private businessId: number;
  private rules: BookingRules;

  constructor(businessId: number, rules: BookingRules) {
    this.businessId = businessId;
    this.rules = rules;
  }

  // Validate booking request
  validateBooking(request: BookingRequest): BookingValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    const startTime = new Date(request.startTime);
    const endTime = new Date(request.endTime);
    const now = new Date();

    // Check advance booking rules
    const hoursUntilBooking = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilBooking < this.rules.advanceBookingHours) {
      errors.push(`Booking must be made at least ${this.rules.advanceBookingHours} hours in advance`);
    }

    if (hoursUntilBooking > (this.rules.maxAdvanceBookingDays * 24)) {
      errors.push(`Booking cannot be made more than ${this.rules.maxAdvanceBookingDays} days in advance`);
    }

    // Check time validity
    if (startTime >= endTime) {
      errors.push('End time must be after start time');
    }

    // Check business hours
    if (!this.isWithinBusinessHours(startTime, endTime)) {
      errors.push('Booking time is outside business hours');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Generate available time slots
  generateAvailableSlots(
    date: Date, 
    duration: number, 
    workingHours: WorkingHours,
    existingBookings: BaseBooking[] = []
  ): BookingSlot[] {
    const slots: BookingSlot[] = [];
    const dayKey = date.getDay().toString();
    const dayHours = workingHours[dayKey];

    if (!dayHours?.isOpen) {
      return slots;
    }

    const [openHour, openMinute] = dayHours.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = dayHours.closeTime.split(':').map(Number);

    let currentTime = new Date(date);
    currentTime.setHours(openHour, openMinute, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(closeHour, closeMinute, 0, 0);

    while (currentTime.getTime() + (duration * 60 * 1000) <= endOfDay.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + (duration * 60 * 1000));
      
      const isAvailable = !this.hasConflictingBooking(
        currentTime, 
        slotEnd, 
        existingBookings
      );

      const isInBreak = this.isTimeInBreak(currentTime, dayHours.breaks || []);

      slots.push({
        startTime: new Date(currentTime),
        endTime: slotEnd,
        available: isAvailable && !isInBreak
      });

      // Move to next slot (15-minute intervals)
      currentTime.setMinutes(currentTime.getMinutes() + 15);
    }

    return slots;
  }

  // Check for conflicting bookings
  private hasConflictingBooking(
    startTime: Date, 
    endTime: Date, 
    existingBookings: BaseBooking[]
  ): boolean {
    return existingBookings.some(booking => {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      
      // Add buffer time
      bookingStart.setMinutes(bookingStart.getMinutes() - this.rules.bufferMinutes);
      bookingEnd.setMinutes(bookingEnd.getMinutes() + this.rules.bufferMinutes);

      return (
        booking.status !== 'cancelled' &&
        (
          (startTime >= bookingStart && startTime < bookingEnd) ||
          (endTime > bookingStart && endTime <= bookingEnd) ||
          (startTime <= bookingStart && endTime >= bookingEnd)
        )
      );
    });
  }

  // Check if time is within business hours
  private isWithinBusinessHours(startTime: Date, endTime: Date): boolean {
    const dayKey = startTime.getDay().toString();
    const workingHours = this.getWorkingHours(); // This would come from business settings
    const dayHours = workingHours[dayKey];

    if (!dayHours?.isOpen) {
      return false;
    }

    const [openHour, openMinute] = dayHours.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = dayHours.closeTime.split(':').map(Number);

    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    const openTimeMinutes = openHour * 60 + openMinute;
    const closeTimeMinutes = closeHour * 60 + closeMinute;

    return startTimeMinutes >= openTimeMinutes && endTimeMinutes <= closeTimeMinutes;
  }

  // Check if time is during a break
  private isTimeInBreak(time: Date, breaks: Array<{startTime: string, endTime: string}>): boolean {
    const timeMinutes = time.getHours() * 60 + time.getMinutes();
    
    return breaks.some(breakPeriod => {
      const [breakStartHour, breakStartMinute] = breakPeriod.startTime.split(':').map(Number);
      const [breakEndHour, breakEndMinute] = breakPeriod.endTime.split(':').map(Number);
      
      const breakStartMinutes = breakStartHour * 60 + breakStartMinute;
      const breakEndMinutes = breakEndHour * 60 + breakEndMinute;
      
      return timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes;
    });
  }

  // Calculate pricing for booking
  calculatePrice(serviceId: number, startTime: Date, endTime: Date): number {
    // This would fetch service pricing and apply any time-based modifiers
    // For now, return base price
    return 0; // Would be implemented based on service pricing rules
  }

  // Get optimal booking suggestions
  getSuggestedBookings(
    serviceId: number, 
    preferredDate: Date, 
    duration: number,
    count: number = 3
  ): BookingSlot[] {
    const suggestions: BookingSlot[] = [];
    const workingHours = this.getWorkingHours();
    
    // Try the preferred date first, then next few days
    for (let dayOffset = 0; dayOffset < 7 && suggestions.length < count; dayOffset++) {
      const checkDate = new Date(preferredDate);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      
      const daySlots = this.generateAvailableSlots(checkDate, duration, workingHours);
      const availableSlots = daySlots.filter(slot => slot.available);
      
      suggestions.push(...availableSlots.slice(0, count - suggestions.length));
    }
    
    return suggestions;
  }

  // Mock method - would be implemented to fetch from business settings
  private getWorkingHours(): WorkingHours {
    return {
      '1': { isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Monday
      '2': { isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Tuesday  
      '3': { isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Wednesday
      '4': { isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Thursday
      '5': { isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Friday
      '6': { isOpen: true, openTime: '10:00', closeTime: '16:00' }, // Saturday
      '0': { isOpen: false, openTime: '00:00', closeTime: '00:00' } // Sunday
    };
  }
}