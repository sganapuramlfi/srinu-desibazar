import { BookingService } from '../../shared/booking-core/BookingService.js';
import { SalonBooking, SalonBookingRequest, SalonStaff, StaffSkill, SalonService } from '../types.js';
import { BookingValidation, BookingSlot, BookingRules } from '../../shared/booking-core/types.js';

export class SalonBookingService extends BookingService {
  
  constructor(businessId: number) {
    // Salon-specific booking rules
    const salonRules: BookingRules = {
      advanceBookingHours: 2,
      maxAdvanceBookingDays: 60,
      cancellationHours: 24,
      bufferMinutes: 15,
      allowDoubleBooking: false,
      requireDeposit: false,
    };
    
    super(businessId, salonRules);
  }

  // Salon-specific booking validation
  validateSalonBooking(request: SalonBookingRequest, staff: SalonStaff[], services: SalonService[]): BookingValidation {
    const baseValidation = this.validateBooking(request);
    const errors = [...baseValidation.errors];
    const warnings = [...baseValidation.warnings];

    const service = services.find(s => s.id === request.serviceId);
    if (!service) {
      errors.push('Service not found');
      return { isValid: false, errors, warnings };
    }

    // Check staff availability and skills
    if (request.staffId) {
      const selectedStaff = staff.find(s => s.id === request.staffId);
      if (!selectedStaff) {
        errors.push('Selected staff member not found');
      } else if (selectedStaff.status !== 'active') {
        errors.push('Selected staff member is not available');
      }
    }

    // Check staff gender preference
    if (request.staffGender && request.staffGender !== 'any') {
      const availableStaff = staff.filter(s => 
        s.status === 'active' && 
        s.gender === request.staffGender
      );
      
      if (availableStaff.length === 0) {
        warnings.push(`No ${request.staffGender} staff available, showing all available staff`);
      }
    }

    // Validate service duration matches request
    const requestDuration = (new Date(request.endTime).getTime() - new Date(request.startTime).getTime()) / (1000 * 60);
    if (Math.abs(requestDuration - service.duration) > 15) { // Allow 15 minute tolerance
      warnings.push(`Service duration (${service.duration} min) doesn't match booking duration (${requestDuration} min)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Find available staff for a service at a specific time
  async findAvailableStaff(
    serviceId: number,
    startTime: Date,
    endTime: Date,
    staffSkills: StaffSkill[],
    allStaff: SalonStaff[],
    existingBookings: SalonBooking[] = [],
    preferredGender?: 'male' | 'female' | 'any'
  ): Promise<SalonStaff[]> {
    
    // Get staff who can perform this service
    const qualifiedStaffIds = staffSkills
      .filter(skill => skill.serviceId === serviceId)
      .map(skill => skill.staffId);

    let availableStaff = allStaff.filter(staff => 
      staff.status === 'active' && 
      qualifiedStaffIds.includes(staff.id)
    );

    // Filter by gender preference
    if (preferredGender && preferredGender !== 'any') {
      const genderFilteredStaff = availableStaff.filter(staff => staff.gender === preferredGender);
      if (genderFilteredStaff.length > 0) {
        availableStaff = genderFilteredStaff;
      }
    }

    // Check working hours
    const dayOfWeek = startTime.getDay().toString();
    availableStaff = availableStaff.filter(staff => {
      const workingDay = staff.workingHours[dayOfWeek];
      if (!workingDay?.isWorking) return false;

      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      const endHour = endTime.getHours();
      const endMinute = endTime.getMinutes();

      const [workStartHour, workStartMinute] = workingDay.startTime.split(':').map(Number);
      const [workEndHour, workEndMinute] = workingDay.endTime.split(':').map(Number);

      const requestStartMinutes = startHour * 60 + startMinute;
      const requestEndMinutes = endHour * 60 + endMinute;
      const workStartMinutes = workStartHour * 60 + workStartMinute;
      const workEndMinutes = workEndHour * 60 + workEndMinute;

      return requestStartMinutes >= workStartMinutes && requestEndMinutes <= workEndMinutes;
    });

    // Check for conflicting bookings
    availableStaff = availableStaff.filter(staff => {
      const staffBookings = existingBookings.filter(booking => 
        booking.staffId === staff.id && 
        booking.status !== 'cancelled'
      );

      return !this.hasStaffConflict(startTime, endTime, staffBookings);
    });

    // Sort by skill level and availability
    return availableStaff.sort((a, b) => {
      // Get skill levels for this service
      const aSkill = staffSkills.find(s => s.staffId === a.id && s.serviceId === serviceId);
      const bSkill = staffSkills.find(s => s.staffId === b.id && s.serviceId === serviceId);
      
      const skillOrder = { 'expert': 4, 'senior': 3, 'junior': 2, 'trainee': 1 };
      const aLevel = aSkill ? skillOrder[aSkill.proficiencyLevel] : 0;
      const bLevel = bSkill ? skillOrder[bSkill.proficiencyLevel] : 0;
      
      return bLevel - aLevel; // Higher skill first
    });
  }

  // Check if staff has conflicting bookings
  private hasStaffConflict(
    startTime: Date,
    endTime: Date,
    staffBookings: SalonBooking[]
  ): boolean {
    return staffBookings.some(booking => {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      
      return (
        (startTime >= bookingStart && startTime < bookingEnd) ||
        (endTime > bookingStart && endTime <= bookingEnd) ||
        (startTime <= bookingStart && endTime >= bookingEnd)
      );
    });
  }

  // Generate salon-specific booking slots with staff assignments
  async generateSalonBookingSlots(
    serviceId: number,
    date: Date,
    staffSkills: StaffSkill[],
    allStaff: SalonStaff[],
    existingBookings: SalonBooking[] = [],
    service: SalonService
  ): Promise<Array<BookingSlot & { staffId?: number; staffName?: string }>> {
    const duration = service.duration;
    const baseSlots = this.generateAvailableSlots(
      date, 
      duration, 
      this.getSalonWorkingHours(), 
      existingBookings
    );

    const salonSlots = [];

    for (const slot of baseSlots) {
      if (!slot.available) {
        salonSlots.push({ ...slot, staffId: undefined, staffName: undefined });
        continue;
      }

      // Find available staff for this slot
      const availableStaff = await this.findAvailableStaff(
        serviceId,
        slot.startTime,
        slot.endTime,
        staffSkills,
        allStaff,
        existingBookings
      );

      if (availableStaff.length > 0) {
        // Assign the best available staff
        const assignedStaff = availableStaff[0];
        salonSlots.push({
          ...slot,
          available: true,
          staffId: assignedStaff.id,
          staffName: assignedStaff.name,
          price: parseFloat(service.price.toString())
        });
      } else {
        salonSlots.push({
          ...slot,
          available: false,
          staffId: undefined,
          staffName: undefined
        });
      }
    }

    return salonSlots;
  }

  // Calculate salon-specific pricing (with staff level multipliers)
  calculateSalonPrice(
    service: SalonService,
    staffSkill?: StaffSkill,
    clientTier?: 'bronze' | 'silver' | 'gold' | 'platinum'
  ): number {
    let basePrice = parseFloat(service.price.toString());

    // Staff skill level multiplier
    if (staffSkill) {
      const multipliers = {
        'trainee': 0.8,
        'junior': 1.0,
        'senior': 1.2,
        'expert': 1.5
      };
      basePrice *= multipliers[staffSkill.proficiencyLevel];
    }

    // Loyalty discount
    if (clientTier) {
      const discounts = {
        'bronze': 0.95,
        'silver': 0.90,
        'gold': 0.85,
        'platinum': 0.80
      };
      basePrice *= discounts[clientTier];
    }

    return Math.round(basePrice * 100) / 100; // Round to 2 decimal places
  }

  // Get salon working hours (would be fetched from business settings)
  private getSalonWorkingHours() {
    return {
      '1': { isOpen: true, openTime: '09:00', closeTime: '19:00' }, // Monday
      '2': { isOpen: true, openTime: '09:00', closeTime: '19:00' }, // Tuesday
      '3': { isOpen: true, openTime: '09:00', closeTime: '19:00' }, // Wednesday
      '4': { isOpen: true, openTime: '09:00', closeTime: '19:00' }, // Thursday
      '5': { isOpen: true, openTime: '09:00', closeTime: '19:00' }, // Friday
      '6': { isOpen: true, openTime: '10:00', closeTime: '18:00' }, // Saturday
      '0': { isOpen: true, openTime: '11:00', closeTime: '17:00' }  // Sunday
    };
  }
}