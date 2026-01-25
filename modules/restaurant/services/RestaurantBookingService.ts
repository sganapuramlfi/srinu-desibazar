import { BookingService } from '../../shared/booking-core/BookingService.js';
import { RestaurantReservation, RestaurantBookingRequest, RestaurantTable, RestaurantStaff, WaitlistEntry } from '../types.js';
import { BookingValidation, BookingSlot, BookingRules } from '../../shared/booking-core/types.js';

export class RestaurantBookingService extends BookingService {
  
  constructor(businessId: number) {
    // Restaurant-specific booking rules
    const restaurantRules: BookingRules = {
      advanceBookingHours: 1,
      maxAdvanceBookingDays: 30,
      cancellationHours: 2,
      bufferMinutes: 30, // Table turnover time
      allowDoubleBooking: true, // Multiple parties can book same time (different tables)
      requireDeposit: false,
    };
    
    super(businessId, restaurantRules);
  }

  // Restaurant-specific reservation validation
  validateRestaurantReservation(
    request: RestaurantBookingRequest, 
    tables: RestaurantTable[], 
    staff: RestaurantStaff[]
  ): BookingValidation {
    const baseValidation = this.validateBooking(request);
    const errors = [...baseValidation.errors];
    const warnings = [...baseValidation.warnings];

    // Validate party size
    if (request.partySize < 1) {
      errors.push('Party size must be at least 1');
    }
    if (request.partySize > 20) {
      errors.push('Party size cannot exceed 20 people');
    }

    // Check table availability and capacity
    if (request.tableId) {
      const selectedTable = tables.find(t => t.id === request.tableId);
      if (!selectedTable) {
        errors.push('Selected table not found');
      } else if (!selectedTable.isActive) {
        errors.push('Selected table is not available');
      } else if (request.partySize < selectedTable.minParty || request.partySize > selectedTable.maxParty) {
        errors.push(`Table ${selectedTable.tableNumber} accommodates ${selectedTable.minParty}-${selectedTable.maxParty} people`);
      }
    }

    // Check if restaurant is open
    const requestTime = new Date(request.startTime);
    if (!this.isRestaurantOpen(requestTime)) {
      errors.push('Restaurant is closed at the requested time');
    }

    // Validate phone number
    if (!request.contactPhone || request.contactPhone.length < 10) {
      errors.push('Valid contact phone number is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Find available tables for a reservation
  async findAvailableTables(
    partySize: number,
    startTime: Date,
    endTime: Date,
    existingReservations: RestaurantReservation[] = [],
    seatingPreference?: 'indoor' | 'outdoor' | 'no-preference',
    allTables: RestaurantTable[] = []
  ): Promise<RestaurantTable[]> {
    
    // Filter tables by capacity and preference
    let availableTables = allTables.filter(table => 
      table.isActive &&
      partySize >= table.minParty &&
      partySize <= table.maxParty
    );

    // Apply seating preference
    if (seatingPreference && seatingPreference !== 'no-preference') {
      const preferredTables = availableTables.filter(table => table.location === seatingPreference);
      if (preferredTables.length > 0) {
        availableTables = preferredTables;
      }
    }

    // Check for conflicting reservations
    availableTables = availableTables.filter(table => {
      const tableReservations = existingReservations.filter(reservation => 
        reservation.tableId === table.id && 
        reservation.status !== 'cancelled'
      );

      return !this.hasTableConflict(startTime, endTime, tableReservations);
    });

    // Sort by preference: exact capacity first, then larger tables
    return availableTables.sort((a, b) => {
      const aCapacityDiff = a.seats - partySize;
      const bCapacityDiff = b.seats - partySize;
      
      // Prefer tables that exactly fit the party size
      if (aCapacityDiff >= 0 && bCapacityDiff >= 0) {
        return aCapacityDiff - bCapacityDiff;
      }
      
      return b.seats - a.seats;
    });
  }

  // Check if table has conflicting reservations
  private hasTableConflict(
    startTime: Date,
    endTime: Date,
    tableReservations: RestaurantReservation[]
  ): boolean {
    return tableReservations.some(reservation => {
      const reservationStart = new Date(reservation.startTime);
      const reservationEnd = new Date(reservation.endTime);
      
      // Add buffer time for table turnover
      reservationStart.setMinutes(reservationStart.getMinutes() - this.rules.bufferMinutes);
      reservationEnd.setMinutes(reservationEnd.getMinutes() + this.rules.bufferMinutes);

      return (
        (startTime >= reservationStart && startTime < reservationEnd) ||
        (endTime > reservationStart && endTime <= reservationEnd) ||
        (startTime <= reservationStart && endTime >= reservationEnd)
      );
    });
  }

  // Generate restaurant booking slots with table assignments
  async generateRestaurantBookingSlots(
    partySize: number,
    date: Date,
    duration: number = 120, // 2 hours default
    allTables: RestaurantTable[],
    existingReservations: RestaurantReservation[] = [],
    seatingPreference?: 'indoor' | 'outdoor' | 'no-preference'
  ): Promise<Array<BookingSlot & { tableId?: number; tableNumber?: string }>> {
    
    const workingHours = this.getRestaurantHours();
    const baseSlots = this.generateAvailableSlots(date, duration, workingHours, existingReservations);
    
    const restaurantSlots = [];

    for (const slot of baseSlots) {
      if (!slot.available) {
        restaurantSlots.push({ ...slot, tableId: undefined, tableNumber: undefined });
        continue;
      }

      // Find available tables for this slot
      const availableTables = await this.findAvailableTables(
        partySize,
        slot.startTime,
        slot.endTime,
        existingReservations,
        seatingPreference,
        allTables
      );

      if (availableTables.length > 0) {
        // Assign the best available table
        const assignedTable = availableTables[0];
        restaurantSlots.push({
          ...slot,
          available: true,
          tableId: assignedTable.id,
          tableNumber: assignedTable.tableNumber,
          price: this.calculateRestaurantPrice(partySize, slot.startTime)
        });
      } else {
        restaurantSlots.push({
          ...slot,
          available: false,
          tableId: undefined,
          tableNumber: undefined
        });
      }
    }

    return restaurantSlots;
  }

  // Calculate restaurant-specific pricing
  calculateRestaurantPrice(partySize: number, reservationTime: Date): number {
    let basePrice = 0; // Restaurants typically don't charge for reservations
    
    // Peak hour pricing (if applicable)
    const hour = reservationTime.getHours();
    const isPeakHour = (hour >= 18 && hour <= 21); // 6-9 PM
    
    if (isPeakHour) {
      basePrice = 10 * partySize; // Small reservation fee during peak hours
    }

    return basePrice;
  }

  // Waitlist management
  async addToWaitlist(
    businessId: number,
    customerName: string,
    contactPhone: string,
    partySize: number,
    seatingPreference?: 'indoor' | 'outdoor' | 'no-preference',
    specialRequests?: string
  ): Promise<WaitlistEntry> {
    // Calculate estimated wait time based on current reservations
    const estimatedWait = this.calculateWaitTime(partySize);

    const waitlistEntry: WaitlistEntry = {
      id: Date.now(), // This would be generated by database
      businessId,
      customerName,
      contactPhone,
      partySize,
      estimatedWait,
      seatingPreference,
      specialRequests,
      status: 'waiting',
      createdAt: new Date()
    };

    return waitlistEntry;
  }

  // Calculate estimated wait time
  private calculateWaitTime(partySize: number): number {
    // Simple estimation: 15 minutes base + 5 minutes per person
    return 15 + (partySize * 5);
  }

  // Check if restaurant is open
  private isRestaurantOpen(dateTime: Date): boolean {
    const dayOfWeek = dateTime.getDay().toString();
    const hours = this.getRestaurantHours();
    const dayHours = hours[dayOfWeek];

    if (!dayHours?.isOpen) {
      return false;
    }

    const timeMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();
    const [openHour, openMinute] = dayHours.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = dayHours.closeTime.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    return timeMinutes >= openMinutes && timeMinutes <= closeMinutes;
  }

  // Get restaurant operating hours
  private getRestaurantHours() {
    return {
      '1': { isOpen: true, openTime: '11:00', closeTime: '22:00' }, // Monday
      '2': { isOpen: true, openTime: '11:00', closeTime: '22:00' }, // Tuesday
      '3': { isOpen: true, openTime: '11:00', closeTime: '22:00' }, // Wednesday
      '4': { isOpen: true, openTime: '11:00', closeTime: '22:00' }, // Thursday
      '5': { isOpen: true, openTime: '11:00', closeTime: '23:00' }, // Friday
      '6': { isOpen: true, openTime: '10:00', closeTime: '23:00' }, // Saturday
      '0': { isOpen: true, openTime: '10:00', closeTime: '21:00' }  // Sunday
    };
  }

  // Table turnover optimization
  async optimizeTableTurnover(
    tables: RestaurantTable[],
    reservations: RestaurantReservation[],
    targetDate: Date
  ): Promise<{ 
    recommendations: string[];
    optimalSlots: Array<{
      tableId: number;
      timeSlot: string;
      expectedRevenue: number;
    }>;
  }> {
    const recommendations: string[] = [];
    const optimalSlots: Array<{
      tableId: number;
      timeSlot: string;
      expectedRevenue: number;
    }> = [];

    // Analyze current booking patterns
    const dayReservations = reservations.filter(r => {
      const resDate = new Date(r.startTime);
      return resDate.toDateString() === targetDate.toDateString();
    });

    // Identify underutilized tables
    const tableUtilization = tables.map(table => {
      const tableReservations = dayReservations.filter(r => r.tableId === table.id);
      const utilizationRate = (tableReservations.length * 2) / 12; // Assuming 12-hour operation
      
      return { table, utilizationRate, reservations: tableReservations.length };
    });

    // Generate recommendations
    tableUtilization.forEach(({ table, utilizationRate }) => {
      if (utilizationRate < 0.6) {
        recommendations.push(
          `Table ${table.tableNumber} (${table.seats} seats) is underutilized. Consider promoting it for ${table.location} dining.`
        );
      }
    });

    // Suggest optimal time slots
    const peakHours = [12, 13, 18, 19, 20]; // Lunch and dinner peaks
    peakHours.forEach(hour => {
      tableUtilization.forEach(({ table }) => {
        const hasReservation = dayReservations.some(r => {
          const resHour = new Date(r.startTime).getHours();
          return r.tableId === table.id && resHour === hour;
        });

        if (!hasReservation) {
          optimalSlots.push({
            tableId: table.id,
            timeSlot: `${hour}:00`,
            expectedRevenue: table.seats * 25 // Estimated revenue per seat
          });
        }
      });
    });

    return { recommendations, optimalSlots };
  }
}