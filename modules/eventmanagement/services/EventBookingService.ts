import { BookingService } from '../../shared/booking-core/BookingService.js';
import { EventBooking, EventBookingRequest, EventVenue, EventStaff, CateringPackage, EventEquipment } from '../types.js';
import { BookingValidation, BookingSlot, BookingRules } from '../../shared/booking-core/types.js';

export class EventBookingService extends BookingService {
  
  constructor(businessId: number) {
    // Event-specific booking rules
    const eventRules: BookingRules = {
      advanceBookingHours: 48,
      maxAdvanceBookingDays: 365, // Events can be booked a year in advance
      cancellationHours: 72,
      bufferMinutes: 120, // 2-hour buffer between events for setup/teardown
      allowDoubleBooking: false, // Venues are exclusive
      requireDeposit: true,
    };
    
    super(businessId, eventRules);
  }

  // Event-specific booking validation
  validateEventBooking(
    request: EventBookingRequest, 
    venue: EventVenue, 
    staff: EventStaff[],
    equipment?: EventEquipment[]
  ): BookingValidation {
    const baseValidation = this.validateBooking(request);
    const errors = [...baseValidation.errors];
    const warnings = [...baseValidation.warnings];

    // Validate venue availability and capacity
    if (!venue) {
      errors.push('Venue not found');
    } else if (!venue.isActive) {
      errors.push('Venue is not available');
    } else {
      // Check capacity based on setup type
      const maxCapacity = this.getVenueCapacityForSetup(venue, request.setupType);
      if (request.guestCount > maxCapacity) {
        errors.push(`Venue capacity (${maxCapacity}) exceeded for ${request.setupType} setup`);
      }
    }

    // Validate guest count
    if (request.guestCount < 1) {
      errors.push('Guest count must be at least 1');
    }
    if (request.guestCount > 10000) {
      errors.push('Maximum 10,000 guests allowed');
    }

    // Validate event duration (minimum based on venue requirements)
    const eventDuration = this.calculateDuration(new Date(request.startTime), new Date(request.endTime));
    if (venue && eventDuration < venue.minimumHours) {
      errors.push(`Minimum booking duration is ${venue.minimumHours} hours`);
    }

    // Check venue restrictions
    if (venue && venue.restrictions) {
      if (request.alcohol && venue.restrictions.includes('no-alcohol')) {
        errors.push('Alcohol is not permitted at this venue');
      }
      
      const eventEndTime = new Date(request.endTime);
      if (eventEndTime.getHours() >= 22 && venue.restrictions.includes('no-music-after-10pm')) {
        warnings.push('Venue has noise restrictions after 10 PM');
      }
    }

    // Validate contact information
    if (!request.contactPhone || request.contactPhone.length < 10) {
      errors.push('Valid contact phone number is required');
    }

    // Check coordinator availability
    if (request.preferredCoordinator) {
      const coordinator = staff.find(s => s.id === request.preferredCoordinator && s.role === 'coordinator');
      if (!coordinator) {
        warnings.push('Preferred coordinator not found, will assign available coordinator');
      } else if (coordinator.status !== 'active') {
        warnings.push('Preferred coordinator is not available, will assign alternative');
      }
    }

    // Validate required equipment availability
    if (request.avEquipment && request.avEquipment.length > 0 && equipment) {
      const unavailableEquipment = request.avEquipment.filter(equipName => {
        const equip = equipment.find(e => e.name.toLowerCase().includes(equipName.toLowerCase()));
        return !equip || equip.available === 0;
      });
      
      if (unavailableEquipment.length > 0) {
        warnings.push(`Some requested equipment may not be available: ${unavailableEquipment.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Get venue capacity based on setup type
  private getVenueCapacityForSetup(venue: EventVenue, setupType: string): number {
    switch (setupType) {
      case 'theater':
      case 'classroom':
        return venue.capacity.seated;
      case 'cocktail':
        return venue.capacity.standing;
      case 'banquet':
        return Math.floor(venue.capacity.seated * 0.8); // Account for table spacing
      case 'u-shape':
      case 'boardroom':
        return Math.min(venue.capacity.seated, 50); // Limited by setup constraints
      default:
        return venue.capacity.maximum;
    }
  }

  // Find available coordinators for an event
  async findAvailableCoordinators(
    startTime: Date,
    endTime: Date,
    eventType: string,
    existingBookings: EventBooking[] = [],
    coordinators: EventStaff[] = [],
    preferredCoordinator?: number
  ): Promise<EventStaff[]> {
    
    // Filter active coordinators with relevant specializations
    let availableCoordinators = coordinators.filter(coordinator => 
      coordinator.status === 'active' &&
      coordinator.role === 'coordinator' &&
      (coordinator.specializations.includes(eventType) || coordinator.specializations.includes('all'))
    );

    // Prioritize preferred coordinator if available
    if (preferredCoordinator) {
      const preferred = availableCoordinators.find(c => c.id === preferredCoordinator);
      if (preferred && this.isCoordinatorAvailable(preferred, startTime, endTime, existingBookings)) {
        return [preferred, ...availableCoordinators.filter(c => c.id !== preferredCoordinator)];
      }
    }

    // Check coordinator availability
    availableCoordinators = availableCoordinators.filter(coordinator => 
      this.isCoordinatorAvailable(coordinator, startTime, endTime, existingBookings)
    );

    // Sort by experience and rating
    return availableCoordinators.sort((a, b) => {
      const aScore = (a.rating * 0.6) + (a.experience * 0.4);
      const bScore = (b.rating * 0.6) + (b.experience * 0.4);
      return bScore - aScore;
    });
  }

  // Check if coordinator is available
  private isCoordinatorAvailable(
    coordinator: EventStaff,
    startTime: Date,
    endTime: Date,
    existingBookings: EventBooking[]
  ): boolean {
    // Check working hours
    const dayOfWeek = startTime.getDay().toString();
    const workingDay = coordinator.workingHours[dayOfWeek];
    
    if (!workingDay?.isWorking) {
      return false;
    }

    // Check current workload
    const concurrentEvents = existingBookings.filter(booking => 
      booking.eventCoordinator === coordinator.id && 
      booking.status !== 'cancelled' &&
      this.hasTimeOverlap(startTime, endTime, new Date(booking.startTime), new Date(booking.endTime))
    ).length;

    return concurrentEvents < coordinator.maxConcurrentEvents;
  }

  // Check for time overlap
  private hasTimeOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  // Generate event booking slots with venue assignments
  async generateEventBookingSlots(
    venueId: number,
    date: Date,
    duration: number,
    venue: EventVenue,
    coordinators: EventStaff[],
    existingBookings: EventBooking[] = [],
    eventType: string = 'corporate'
  ): Promise<Array<BookingSlot & { coordinatorId?: number; coordinatorName?: string }>> {
    
    const workingHours = this.getBusinessHours();
    
    // Calculate slots considering venue minimum hours and setup/teardown
    const adjustedDuration = Math.max(duration, venue.minimumHours);
    const totalDuration = adjustedDuration + 2; // Add 2 hours for setup/teardown
    
    const baseSlots = this.generateAvailableSlots(date, totalDuration, workingHours, existingBookings);
    
    const eventSlots = [];

    for (const slot of baseSlots) {
      if (!slot.available) {
        eventSlots.push({ ...slot, coordinatorId: undefined, coordinatorName: undefined });
        continue;
      }

      // Find available coordinators for this slot
      const availableCoordinators = await this.findAvailableCoordinators(
        slot.startTime,
        slot.endTime,
        eventType,
        existingBookings,
        coordinators
      );

      if (availableCoordinators.length > 0) {
        // Assign the best available coordinator
        const assignedCoordinator = availableCoordinators[0];
        eventSlots.push({
          ...slot,
          available: true,
          coordinatorId: assignedCoordinator.id,
          coordinatorName: assignedCoordinator.name,
          price: this.calculateEventPrice(venue, adjustedDuration, eventType, date)
        });
      } else {
        eventSlots.push({
          ...slot,
          available: false,
          coordinatorId: undefined,
          coordinatorName: undefined
        });
      }
    }

    return eventSlots;
  }

  // Calculate event pricing
  calculateEventPrice(venue: EventVenue, duration: number, eventType: string, eventDate: Date): number {
    let basePrice = venue.pricePerHour * duration;
    
    // Event type multipliers
    const eventMultipliers: Record<string, number> = {
      'wedding': 1.5,
      'corporate': 1.2,
      'conference': 1.1,
      'birthday': 1.0,
      'exhibition': 1.3,
      'party': 1.0,
      'other': 1.0
    };
    
    basePrice *= eventMultipliers[eventType] || 1.0;
    
    // Weekend pricing
    const isWeekend = eventDate.getDay() === 0 || eventDate.getDay() === 6;
    if (isWeekend) {
      basePrice *= 1.25;
    }
    
    // Peak season pricing (spring/summer for weddings)
    const month = eventDate.getMonth();
    const isPeakSeason = month >= 3 && month <= 8; // April to September
    if (isPeakSeason && eventType === 'wedding') {
      basePrice *= 1.2;
    }
    
    return Math.round(basePrice);
  }

  // Equipment availability checker
  async checkEquipmentAvailability(
    equipmentRequests: string[],
    startDate: Date,
    endDate: Date,
    allEquipment: EventEquipment[] = [],
    existingBookings: EventBooking[] = []
  ): Promise<{
    available: Array<{ name: string; equipment: EventEquipment; quantity: number }>;
    unavailable: Array<{ name: string; reason: string }>;
  }> {
    const available = [];
    const unavailable = [];

    for (const requestedItem of equipmentRequests) {
      const equipment = allEquipment.find(e => 
        e.name.toLowerCase().includes(requestedItem.toLowerCase()) && 
        e.status === 'available'
      );

      if (!equipment) {
        unavailable.push({ name: requestedItem, reason: 'Equipment not found' });
        continue;
      }

      // Check if equipment is available during the requested time
      const conflictingBookings = existingBookings.filter(booking => 
        booking.avEquipment?.includes(requestedItem) &&
        this.hasTimeOverlap(startDate, endDate, new Date(booking.startTime), new Date(booking.endTime))
      );

      const quantityInUse = conflictingBookings.length;
      const availableQuantity = equipment.available - quantityInUse;

      if (availableQuantity > 0) {
        available.push({ 
          name: requestedItem, 
          equipment, 
          quantity: availableQuantity 
        });
      } else {
        unavailable.push({ 
          name: requestedItem, 
          reason: 'All units currently booked' 
        });
      }
    }

    return { available, unavailable };
  }

  // Catering cost calculator
  calculateCateringCost(
    guestCount: number,
    cateringPackages: CateringPackage[],
    selectedPackageIds: number[]
  ): {
    totalCost: number;
    breakdown: Array<{
      packageId: number;
      name: string;
      costPerPerson: number;
      totalCost: number;
    }>;
    staffRequired: number;
  } {
    let totalCost = 0;
    let totalStaffRequired = 0;
    const breakdown = [];

    for (const packageId of selectedPackageIds) {
      const cateringPackage = cateringPackages.find(p => p.id === packageId);
      
      if (!cateringPackage || !cateringPackage.isActive) {
        continue;
      }

      // Check guest count limits
      if (guestCount < cateringPackage.minimumGuests || guestCount > cateringPackage.maximumGuests) {
        continue;
      }

      const packageCost = cateringPackage.pricePerPerson * guestCount;
      totalCost += packageCost;
      totalStaffRequired += cateringPackage.staffRequired;

      breakdown.push({
        packageId,
        name: cateringPackage.name,
        costPerPerson: cateringPackage.pricePerPerson,
        totalCost: packageCost
      });
    }

    return {
      totalCost,
      breakdown,
      staffRequired: totalStaffRequired
    };
  }

  // Event timeline generator
  generateEventTimeline(
    booking: EventBooking,
    venue: EventVenue
  ): Array<{ time: string; activity: string; responsible: string; duration: number }> {
    const timeline = [];
    const eventStart = new Date(booking.startTime);
    const eventEnd = new Date(booking.endTime);
    
    // Setup phase (2 hours before event)
    const setupStart = new Date(eventStart.getTime() - (2 * 60 * 60 * 1000));
    timeline.push({
      time: setupStart.toTimeString().substring(0, 5),
      activity: 'Venue setup begins',
      responsible: 'Setup crew',
      duration: 60
    });

    // Equipment setup
    if (booking.avEquipment && booking.avEquipment.length > 0) {
      const avSetupTime = new Date(setupStart.getTime() + (30 * 60 * 1000));
      timeline.push({
        time: avSetupTime.toTimeString().substring(0, 5),
        activity: 'AV equipment setup',
        responsible: 'AV technician',
        duration: 90
      });
    }

    // Catering setup
    if (booking.cateringRequired) {
      const cateringSetupTime = new Date(eventStart.getTime() - (60 * 60 * 1000));
      timeline.push({
        time: cateringSetupTime.toTimeString().substring(0, 5),
        activity: 'Catering setup',
        responsible: 'Catering team',
        duration: 60
      });
    }

    // Event phases
    timeline.push({
      time: eventStart.toTimeString().substring(0, 5),
      activity: `${booking.eventName} begins`,
      responsible: 'Event coordinator',
      duration: (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60)
    });

    // Event-specific timeline based on type
    if (booking.eventType === 'wedding') {
      this.addWeddingTimeline(timeline, eventStart, eventEnd);
    } else if (booking.eventType === 'corporate' || booking.eventType === 'conference') {
      this.addCorporateTimeline(timeline, eventStart, eventEnd);
    }

    // Teardown
    timeline.push({
      time: eventEnd.toTimeString().substring(0, 5),
      activity: 'Event teardown begins',
      responsible: 'Setup crew',
      duration: 120
    });

    return timeline.sort((a, b) => a.time.localeCompare(b.time));
  }

  // Add wedding-specific timeline items
  private addWeddingTimeline(timeline: any[], eventStart: Date, eventEnd: Date) {
    const ceremonyTime = new Date(eventStart.getTime() + (30 * 60 * 1000));
    const cocktailTime = new Date(ceremonyTime.getTime() + (45 * 60 * 1000));
    const dinnerTime = new Date(cocktailTime.getTime() + (90 * 60 * 1000));
    const dancingTime = new Date(dinnerTime.getTime() + (90 * 60 * 1000));

    timeline.push(
      {
        time: ceremonyTime.toTimeString().substring(0, 5),
        activity: 'Wedding ceremony',
        responsible: 'Event coordinator',
        duration: 45
      },
      {
        time: cocktailTime.toTimeString().substring(0, 5),
        activity: 'Cocktail hour',
        responsible: 'Catering team',
        duration: 90
      },
      {
        time: dinnerTime.toTimeString().substring(0, 5),
        activity: 'Dinner service',
        responsible: 'Catering team',
        duration: 90
      },
      {
        time: dancingTime.toTimeString().substring(0, 5),
        activity: 'Dancing and entertainment',
        responsible: 'DJ/Band',
        duration: 180
      }
    );
  }

  // Add corporate event timeline items
  private addCorporateTimeline(timeline: any[], eventStart: Date, eventEnd: Date) {
    const registrationTime = eventStart;
    const presentationTime = new Date(eventStart.getTime() + (30 * 60 * 1000));
    const breakTime = new Date(presentationTime.getTime() + (90 * 60 * 1000));
    const networkingTime = new Date(breakTime.getTime() + (15 * 60 * 1000));

    timeline.push(
      {
        time: registrationTime.toTimeString().substring(0, 5),
        activity: 'Registration and welcome',
        responsible: 'Event coordinator',
        duration: 30
      },
      {
        time: presentationTime.toTimeString().substring(0, 5),
        activity: 'Main presentation',
        responsible: 'AV technician',
        duration: 90
      },
      {
        time: breakTime.toTimeString().substring(0, 5),
        activity: 'Coffee break',
        responsible: 'Catering team',
        duration: 15
      },
      {
        time: networkingTime.toTimeString().substring(0, 5),
        activity: 'Networking session',
        responsible: 'Event coordinator',
        duration: 60
      }
    );
  }

  // Calculate duration in hours
  private calculateDuration(startTime: Date, endTime: Date): number {
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  }

  // Get business hours for events
  private getBusinessHours() {
    return {
      '1': { isOpen: true, openTime: '08:00', closeTime: '23:00' }, // Monday
      '2': { isOpen: true, openTime: '08:00', closeTime: '23:00' }, // Tuesday
      '3': { isOpen: true, openTime: '08:00', closeTime: '23:00' }, // Wednesday
      '4': { isOpen: true, openTime: '08:00', closeTime: '23:00' }, // Thursday
      '5': { isOpen: true, openTime: '08:00', closeTime: '24:00' }, // Friday
      '6': { isOpen: true, openTime: '08:00', closeTime: '24:00' }, // Saturday
      '0': { isOpen: true, openTime: '10:00', closeTime: '23:00' }  // Sunday
    };
  }
}