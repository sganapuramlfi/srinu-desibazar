import { db } from "../../db/index.js";
import { 
  bookings, 
  bookableItems, 
  businessTenants,
  bookingOperations,
  bookingConstraints,
  businessConstraintOverrides,
  bookingPolicies 
} from "../../db/index.js";
import { eq, and, sql, gte, lte, between } from "drizzle-orm";

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface BookingRequest {
  businessId: number;
  bookableItemId: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  bookingDate: string;
  startTime: Date;
  endTime: Date;
  partySize: number;
  specialRequests?: string;
  metadata?: Record<string, any>;
}

export interface BookingOperation {
  bookingId: number;
  operationType: 'create' | 'confirm' | 'cancel' | 'reschedule' | 'no_show' | 'complete' | 'modify';
  operationData: Record<string, any>;
  performedByUserId?: number;
  performedByRole: 'customer' | 'staff' | 'system' | 'admin';
}

export interface ValidationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
  warnings: ConstraintViolation[];
  constraintsChecked: number;
  processingTimeMs: number;
  metadata?: Record<string, any>;
}

export interface ConstraintViolation {
  constraintName: string;
  violationType: string;
  message: string;
  priority: number;
  isMandatory: boolean;
  suggestedAction?: string;
  financialImpact?: {
    type: 'charge' | 'refund' | 'hold';
    amount: number;
    reason: string;
  };
}

export interface IndustryConstraints {
  [key: string]: {
    rules: Record<string, any>;
    priority: number;
    isMandatory: boolean;
    constraintType: string;
  };
}

// =============================================================================
// CONSTRAINT VALIDATOR CLASS
// =============================================================================

export class ConstraintValidator {
  private industryConstraints: Map<string, IndustryConstraints> = new Map();
  
  constructor() {
    this.initializeIndustryConstraints();
  }

  // =============================================================================
  // MAIN VALIDATION METHODS
  // =============================================================================

  async validateBookingOperation(
    operation: BookingOperation
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Get booking and business details
      const bookingDetails = await this.getBookingDetails(operation.bookingId);
      if (!bookingDetails) {
        return this.createErrorResult('Booking not found', startTime);
      }

      // Get industry-specific constraints
      const constraints = await this.getApplicableConstraints(
        bookingDetails.business.industryType,
        bookingDetails.business.id
      );

      // Validate operation against constraints
      const violations: ConstraintViolation[] = [];
      const warnings: ConstraintViolation[] = [];

      for (const constraint of constraints) {
        const result = await this.validateSingleConstraint(
          constraint,
          operation,
          bookingDetails
        );
        
        if (result.violations.length > 0) {
          violations.push(...result.violations);
        }
        if (result.warnings.length > 0) {
          warnings.push(...result.warnings);
        }
      }

      // Log the validation operation
      await this.logBookingOperation(operation, violations, warnings);

      return {
        isValid: violations.filter(v => v.isMandatory).length === 0,
        violations,
        warnings,
        constraintsChecked: constraints.length,
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      console.error('Constraint validation error:', error);
      return this.createErrorResult('Validation system error', startTime);
    }
  }

  async validateBookingRequest(request: BookingRequest): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Get business details
      const [business] = await db
        .select()
        .from(businessTenants)
        .where(eq(businessTenants.id, request.businessId))
        .limit(1);

      if (!business) {
        return this.createErrorResult('Business not found', startTime);
      }

      // Create mock operation for validation
      const mockOperation: BookingOperation = {
        bookingId: 0, // New booking
        operationType: 'create',
        operationData: request,
        performedByRole: 'customer'
      };

      // Get applicable constraints
      const constraints = await this.getApplicableConstraints(
        business.industryType,
        business.id
      );

      // Validate against constraints
      const violations: ConstraintViolation[] = [];
      const warnings: ConstraintViolation[] = [];

      // Check availability constraints first (critical)
      const availabilityResult = await this.validateAvailability(request, business);
      violations.push(...availabilityResult.violations);
      warnings.push(...availabilityResult.warnings);

      // Check other constraints
      for (const constraint of constraints) {
        if (constraint.constraintType === 'availability') continue; // Already checked
        
        const result = await this.validateConstraintForNewBooking(
          constraint,
          request,
          business
        );
        
        violations.push(...result.violations);
        warnings.push(...result.warnings);
      }

      return {
        isValid: violations.filter(v => v.isMandatory).length === 0,
        violations,
        warnings,
        constraintsChecked: constraints.length + 1, // +1 for availability
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      console.error('Booking request validation error:', error);
      return this.createErrorResult('Validation system error', startTime);
    }
  }

  // =============================================================================
  // CONSTRAINT-SPECIFIC VALIDATION
  // =============================================================================

  private async validateAvailability(
    request: BookingRequest, 
    business: any
  ): Promise<{ violations: ConstraintViolation[], warnings: ConstraintViolation[] }> {
    const violations: ConstraintViolation[] = [];
    const warnings: ConstraintViolation[] = [];

    try {
      // Check if bookable item exists and is active
      const [bookableItem] = await db
        .select()
        .from(bookableItems)
        .where(and(
          eq(bookableItems.id, request.bookableItemId),
          eq(bookableItems.businessId, request.businessId),
          eq(bookableItems.isActive, true)
        ));

      if (!bookableItem) {
        violations.push({
          constraintName: 'bookable_item_availability',
          violationType: 'item_not_available',
          message: 'The requested item is not available for booking',
          priority: 1,
          isMandatory: true
        });
        return { violations, warnings };
      }

      // Check for conflicting bookings
      const conflictingBookings = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.bookableItemId, request.bookableItemId),
          lte(bookings.startTime, request.endTime),
          gte(bookings.endTime, request.startTime),
          sql`${bookings.status} IN ('pending', 'confirmed', 'in_progress')`
        ));

      if (conflictingBookings.length > 0) {
        violations.push({
          constraintName: 'time_slot_availability',
          violationType: 'booking_conflict',
          message: 'The requested time slot is already booked',
          priority: 1,
          isMandatory: true,
          suggestedAction: 'Please select a different time slot'
        });
      }

      // Industry-specific availability checks
      if (business.industryType === 'restaurant') {
        await this.validateRestaurantAvailability(request, violations, warnings);
      } else if (business.industryType === 'salon') {
        await this.validateSalonAvailability(request, violations, warnings);
      }

    } catch (error) {
      console.error('Availability validation error:', error);
      violations.push({
        constraintName: 'availability_check',
        violationType: 'system_error',
        message: 'Unable to verify availability',
        priority: 1,
        isMandatory: true
      });
    }

    return { violations, warnings };
  }

  private async validateRestaurantAvailability(
    request: BookingRequest,
    violations: ConstraintViolation[],
    warnings: ConstraintViolation[]
  ): Promise<void> {
    // Get the actual restaurant table details for more accurate capacity checking
    const bookableItem = await db
      .select({
        bookableItem: bookableItems,
        restaurantTable: {
          id: sql`rt.id`,
          tableNumber: sql`rt.table_number`,
          minCapacity: sql`rt.min_capacity`,
          maxCapacity: sql`rt.max_capacity`,
          isActive: sql`rt.is_active`,
          isReservable: sql`rt.is_reservable`
        }
      })
      .from(bookableItems)
      .leftJoin(sql`restaurant_tables rt`, sql`rt.id = ${bookableItems.itemId} AND ${bookableItems.itemType} = 'restaurant_table'`)
      .where(eq(bookableItems.id, request.bookableItemId))
      .limit(1);

    if (bookableItem.length > 0) {
      const item = bookableItem[0];
      
      // Check if table is active and reservable
      if (item.restaurantTable?.isActive === false) {
        violations.push({
          constraintName: 'table_availability',
          violationType: 'table_inactive',
          message: 'Selected table is not currently available',
          priority: 1,
          isMandatory: true,
          suggestedAction: 'Please select a different table'
        });
        return;
      }
      
      if (item.restaurantTable?.isReservable === false) {
        violations.push({
          constraintName: 'table_availability',
          violationType: 'table_not_reservable',
          message: 'Selected table is not available for reservations',
          priority: 1,
          isMandatory: true,
          suggestedAction: 'Please select a different table'
        });
        return;
      }

      // Enhanced capacity checking with real table data
      if (item.restaurantTable?.minCapacity && item.restaurantTable?.maxCapacity) {
        const minCapacity = parseInt(item.restaurantTable.minCapacity.toString());
        const maxCapacity = parseInt(item.restaurantTable.maxCapacity.toString());
        
        // Strict capacity validation
        if (request.partySize > maxCapacity) {
          violations.push({
            constraintName: 'table_capacity',
            violationType: 'party_size_exceeds_capacity',
            message: `Party size (${request.partySize}) exceeds table capacity (${maxCapacity})`,
            priority: 1,
            isMandatory: true,
            suggestedAction: `Please select a larger table or reduce party size to ${maxCapacity} or fewer`,
            financialImpact: {
              type: 'charge',
              amount: 0,
              reason: 'No additional charge for capacity violation'
            }
          });
        } else if (request.partySize < minCapacity) {
          // Allow but warn about underutilization
          warnings.push({
            constraintName: 'table_efficiency',
            violationType: 'underutilized_table',
            message: `Table is designed for ${minCapacity}-${maxCapacity} guests, you're booking for ${request.partySize}`,
            priority: 3,
            isMandatory: false,
            suggestedAction: 'Consider a smaller table for better efficiency, or this table works fine for your party'
          });
        }
        
        // Additional validation for very large parties
        if (request.partySize > 12) {
          violations.push({
            constraintName: 'restaurant_policy',
            violationType: 'large_party_restriction',
            message: `Large parties (${request.partySize} guests) require special arrangements`,
            priority: 2,
            isMandatory: true,
            suggestedAction: 'Please call the restaurant directly to arrange seating for large parties'
          });
        }
      } else {
        // Fallback to parsing from bookableItem name if restaurant table data not available
        const itemName = item.bookableItem.name;
        const capacityMatch = itemName.match(/Seats (\d+)(-(\d+))?/);
        
        if (capacityMatch) {
          const minCapacity = parseInt(capacityMatch[1]);
          const maxCapacity = capacityMatch[3] ? parseInt(capacityMatch[3]) : minCapacity;
          
          if (request.partySize > maxCapacity) {
            violations.push({
              constraintName: 'table_capacity',
              violationType: 'party_size_exceeds_capacity',
              message: `Party size (${request.partySize}) exceeds table capacity (${maxCapacity})`,
              priority: 1,
              isMandatory: true,
              suggestedAction: 'Please select a larger table or reduce party size'
            });
          }
        }
      }
    } else {
      violations.push({
        constraintName: 'table_availability',
        violationType: 'table_not_found',
        message: 'Selected table is not available for booking',
        priority: 1,
        isMandatory: true,
        suggestedAction: 'Please select a different table'
      });
    }

    // Enhanced operating hours validation
    await this.validateOperatingHours(request, violations, warnings);
  }

  private async validateOperatingHours(
    request: BookingRequest,
    violations: ConstraintViolation[],
    warnings: ConstraintViolation[]
  ): Promise<void> {
    try {
      // Get business operating hours
      const [business] = await db
        .select({
          id: businessTenants.id,
          name: businessTenants.name,
          industryType: businessTenants.industryType,
          operatingHours: businessTenants.operatingHours
        })
        .from(businessTenants)
        .where(eq(businessTenants.id, request.businessId))
        .limit(1);

      if (!business) {
        violations.push({
          constraintName: 'business_validation',
          violationType: 'business_not_found',
          message: 'Business not found',
          priority: 1,
          isMandatory: true
        });
        return;
      }

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const bookingDay = dayNames[request.startTime.getDay()];
      const bookingTime = request.startTime;
      const bookingHour = bookingTime.getHours();
      const bookingMinute = bookingTime.getMinutes();
      const bookingTimeString = `${bookingHour.toString().padStart(2, '0')}:${bookingMinute.toString().padStart(2, '0')}`;

      // Parse operating hours from business data
      const operatingHours = business.operatingHours as any;
      
      if (!operatingHours || typeof operatingHours !== 'object') {
        // No operating hours set - allow booking but warn
        warnings.push({
          constraintName: 'operating_hours',
          violationType: 'no_hours_configured',
          message: 'Business operating hours are not configured',
          priority: 2,
          isMandatory: false,
          suggestedAction: 'Please contact the business to confirm availability'
        });
        return;
      }

      const dayHours = operatingHours[bookingDay];
      
      if (!dayHours) {
        violations.push({
          constraintName: 'operating_hours',
          violationType: 'day_not_configured',
          message: `Operating hours for ${bookingDay} are not configured`,
          priority: 1,
          isMandatory: true,
          suggestedAction: 'Please select a different day or contact the business'
        });
        return;
      }

      // Check if business is closed on this day
      if (dayHours.isOpen === false || !dayHours.open || !dayHours.close) {
        violations.push({
          constraintName: 'operating_hours',
          violationType: 'business_closed',
          message: `Business is closed on ${bookingDay}`,
          priority: 1,
          isMandatory: true,
          suggestedAction: 'Please select a different day when the business is open'
        });
        return;
      }

      // Parse open and close times
      const openTime = dayHours.open; // e.g., "11:30"
      const closeTime = dayHours.close; // e.g., "22:00"
      
      const [openHour, openMinute] = openTime.split(':').map(Number);
      const [closeHour, closeMinute] = closeTime.split(':').map(Number);
      
      // Convert to minutes for easier comparison
      const bookingMinutes = bookingHour * 60 + bookingMinute;
      const openMinutes = openHour * 60 + openMinute;
      const closeMinutes = closeHour * 60 + closeMinute;

      // Check if booking is before opening time
      if (bookingMinutes < openMinutes) {
        violations.push({
          constraintName: 'operating_hours',
          violationType: 'before_opening',
          message: `Booking time (${bookingTimeString}) is before opening time (${openTime})`,
          priority: 1,
          isMandatory: true,
          suggestedAction: `Please select a time after ${openTime}`
        });
        return;
      }

      // Check if booking starts too close to closing time
      const serviceDuration = request.metadata?.estimatedDuration || 120; // Default 2 hours
      const bookingEndMinutes = bookingMinutes + serviceDuration;
      
      if (bookingEndMinutes > closeMinutes) {
        violations.push({
          constraintName: 'operating_hours',
          violationType: 'extends_past_closing',
          message: `Booking would extend past closing time (${closeTime})`,
          priority: 1,
          isMandatory: true,
          suggestedAction: `Please select an earlier time or contact the business for extended hours`
        });
        return;
      }

      // Warning for bookings close to closing time
      const lastSeatingMinutes = closeMinutes - 60; // 1 hour before close
      if (bookingMinutes > lastSeatingMinutes) {
        warnings.push({
          constraintName: 'operating_hours',
          violationType: 'late_booking',
          message: `Booking is close to closing time - service may be rushed`,
          priority: 3,
          isMandatory: false,
          suggestedAction: 'Consider booking earlier for the best experience'
        });
      }

      // Industry-specific operating hours logic
      if (business.industryType === 'restaurant') {
        // Restaurant-specific logic
        if (bookingHour >= 14 && bookingHour <= 17) {
          warnings.push({
            constraintName: 'restaurant_hours',
            violationType: 'afternoon_booking',
            message: 'Afternoon bookings may have limited menu availability',
            priority: 4,
            isMandatory: false,
            suggestedAction: 'Full menu available during dinner hours'
          });
        }
      }

    } catch (error) {
      console.error('Operating hours validation error:', error);
      warnings.push({
        constraintName: 'operating_hours',
        violationType: 'validation_error',
        message: 'Unable to validate operating hours',
        priority: 2,
        isMandatory: false,
        suggestedAction: 'Please contact the business to confirm availability'
      });
    }
  }

  private async validateSalonAvailability(
    request: BookingRequest,
    violations: ConstraintViolation[],
    warnings: ConstraintViolation[]
  ): Promise<void> {
    // Salon-specific availability logic would go here
    // This is a placeholder for future implementation
    
    // Check if booking is on a working day
    const dayOfWeek = request.startTime.getDay();
    if (dayOfWeek === 0) { // Sunday
      warnings.push({
        constraintName: 'working_days',
        violationType: 'sunday_booking',
        message: 'Sunday bookings may have limited staff availability',
        priority: 3,
        isMandatory: false
      });
    }
  }

  // =============================================================================
  // BOOKING LIFECYCLE OPERATIONS
  // =============================================================================

  async processCancellation(
    bookingId: number,
    reason: string,
    performedByUserId?: number,
    performedByRole: string = 'customer'
  ): Promise<ValidationResult> {
    const operation: BookingOperation = {
      bookingId,
      operationType: 'cancel',
      operationData: { reason },
      performedByUserId,
      performedByRole: performedByRole as any
    };

    const validationResult = await this.validateBookingOperation(operation);
    
    if (validationResult.isValid || validationResult.violations.filter(v => v.isMandatory).length === 0) {
      // Process the cancellation
      await this.executeCancellation(bookingId, reason, validationResult.violations);
    }

    return validationResult;
  }

  async processReschedule(
    bookingId: number,
    newStartTime: Date,
    newEndTime: Date,
    reason: string,
    performedByUserId?: number,
    performedByRole: string = 'customer'
  ): Promise<ValidationResult> {
    const operation: BookingOperation = {
      bookingId,
      operationType: 'reschedule',
      operationData: { newStartTime, newEndTime, reason },
      performedByUserId,
      performedByRole: performedByRole as any
    };

    const validationResult = await this.validateBookingOperation(operation);
    
    if (validationResult.isValid || validationResult.violations.filter(v => v.isMandatory).length === 0) {
      // Process the reschedule
      await this.executeReschedule(bookingId, newStartTime, newEndTime, validationResult.violations);
    }

    return validationResult;
  }

  async processNoShow(bookingId: number): Promise<ValidationResult> {
    const operation: BookingOperation = {
      bookingId,
      operationType: 'no_show',
      operationData: { automaticProcessing: true },
      performedByRole: 'system'
    };

    const validationResult = await this.validateBookingOperation(operation);
    
    // No-shows are typically processed automatically
    await this.executeNoShow(bookingId, validationResult.violations);

    return validationResult;
  }

  // =============================================================================
  // OPERATION EXECUTION
  // =============================================================================

  private async executeCancellation(
    bookingId: number, 
    reason: string, 
    violations: ConstraintViolation[]
  ): Promise<void> {
    try {
      // Update booking status
      await db
        .update(bookings)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date(),
          internalNotes: reason
        })
        .where(eq(bookings.id, bookingId));

      // Calculate financial impact
      const financialImpact = violations.find(v => v.financialImpact);
      
      // Log the operation with financial impact
      await db.insert(bookingOperations).values({
        bookingId,
        businessId: (await this.getBookingDetails(bookingId))!.business.id,
        operationType: 'cancel',
        operationData: { reason, violations },
        financialImpact: financialImpact?.financialImpact ? JSON.stringify(financialImpact.financialImpact) : '{}',
        performedByRole: 'customer',
        constraintsPassed: violations.filter(v => v.isMandatory).length === 0,
        createdAt: new Date()
      });

      console.log(`Booking ${bookingId} cancelled successfully`);
    } catch (error) {
      console.error('Error executing cancellation:', error);
      throw error;
    }
  }

  private async executeReschedule(
    bookingId: number,
    newStartTime: Date,
    newEndTime: Date,
    violations: ConstraintViolation[]
  ): Promise<void> {
    try {
      // Get current booking details for comparison
      const currentBooking = await this.getBookingDetails(bookingId);
      
      // Update booking times
      await db
        .update(bookings)
        .set({
          startTime: newStartTime,
          endTime: newEndTime,
          updatedAt: new Date()
        })
        .where(eq(bookings.id, bookingId));

      // Log the operation
      await db.insert(bookingOperations).values({
        bookingId,
        businessId: currentBooking!.business.id,
        operationType: 'reschedule',
        operationData: JSON.stringify({ 
          oldStartTime: currentBooking!.booking.startTime,
          oldEndTime: currentBooking!.booking.endTime,
          newStartTime,
          newEndTime,
          violations 
        }),
        performedByRole: 'customer',
        constraintsPassed: violations.filter(v => v.isMandatory).length === 0,
        createdAt: new Date()
      });

      console.log(`Booking ${bookingId} rescheduled successfully`);
    } catch (error) {
      console.error('Error executing reschedule:', error);
      throw error;
    }
  }

  private async executeNoShow(
    bookingId: number,
    violations: ConstraintViolation[]
  ): Promise<void> {
    try {
      // Update booking status
      await db
        .update(bookings)
        .set({ 
          status: 'no_show',
          updatedAt: new Date()
        })
        .where(eq(bookings.id, bookingId));

      // Apply financial penalty if specified
      const penalty = violations.find(v => v.financialImpact);
      
      // Log the operation
      await db.insert(bookingOperations).values({
        bookingId,
        businessId: (await this.getBookingDetails(bookingId))!.business.id,
        operationType: 'no_show',
        operationData: JSON.stringify({ automaticProcessing: true, violations }),
        financialImpact: penalty?.financialImpact ? JSON.stringify(penalty.financialImpact) : '{}',
        performedByRole: 'system',
        constraintsPassed: true, // No-shows are automatically processed
        createdAt: new Date()
      });

      console.log(`Booking ${bookingId} marked as no-show`);
    } catch (error) {
      console.error('Error executing no-show processing:', error);
      throw error;
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private async getBookingDetails(bookingId: number): Promise<{
    booking: any;
    business: any;
    bookableItem: any;
  } | null> {
    try {
      const result = await db
        .select({
          booking: bookings,
          business: businessTenants,
          bookableItem: bookableItems
        })
        .from(bookings)
        .innerJoin(businessTenants, eq(bookings.businessId, businessTenants.id))
        .innerJoin(bookableItems, eq(bookings.bookableItemId, bookableItems.id))
        .where(eq(bookings.id, bookingId))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error getting booking details:', error);
      return null;
    }
  }

  private async getApplicableConstraints(
    industryType: string,
    businessId: number
  ): Promise<any[]> {
    try {
      const result = await db
        .select({
          constraint: bookingConstraints,
          override: businessConstraintOverrides
        })
        .from(bookingConstraints)
        .leftJoin(
          businessConstraintOverrides,
          and(
            eq(bookingConstraints.id, businessConstraintOverrides.constraintId),
            eq(businessConstraintOverrides.businessId, businessId),
            eq(businessConstraintOverrides.isEnabled, true)
          )
        )
        .where(and(
          eq(bookingConstraints.industryType, industryType),
          eq(bookingConstraints.isActive, true)
        ));

      return result.map(r => ({
        ...r.constraint,
        customRules: r.override?.customRules || r.constraint.rules,
        customPriority: r.override?.customPriority || r.constraint.priority
      }));
    } catch (error) {
      console.error('Error getting applicable constraints:', error);
      return [];
    }
  }

  private async validateSingleConstraint(
    constraint: any,
    operation: BookingOperation,
    bookingDetails: any
  ): Promise<{ violations: ConstraintViolation[], warnings: ConstraintViolation[] }> {
    // This is a simplified implementation
    // Real implementation would have specific logic for each constraint type
    return { violations: [], warnings: [] };
  }

  private async validateConstraintForNewBooking(
    constraint: any,
    request: BookingRequest,
    business: any
  ): Promise<{ violations: ConstraintViolation[], warnings: ConstraintViolation[] }> {
    // This is a simplified implementation
    // Real implementation would have specific logic for each constraint type
    return { violations: [], warnings: [] };
  }

  private async logBookingOperation(
    operation: BookingOperation,
    violations: ConstraintViolation[],
    warnings: ConstraintViolation[]
  ): Promise<void> {
    try {
      if (operation.bookingId > 0) { // Only log for existing bookings
        const bookingDetails = await this.getBookingDetails(operation.bookingId);
        if (bookingDetails) {
          await db.insert(bookingOperations).values({
            bookingId: operation.bookingId,
            businessId: bookingDetails.business.id,
            operationType: operation.operationType,
            operationData: JSON.stringify(operation.operationData),
            performedByUserId: operation.performedByUserId || null,
            performedByRole: operation.performedByRole,
            constraintsPassed: violations.filter(v => v.isMandatory).length === 0,
            constraintViolations: JSON.stringify({ violations, warnings }),
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error logging booking operation:', error);
    }
  }

  private createErrorResult(message: string, startTime: number): ValidationResult {
    return {
      isValid: false,
      violations: [{
        constraintName: 'system_error',
        violationType: 'validation_error',
        message,
        priority: 1,
        isMandatory: true
      }],
      warnings: [],
      constraintsChecked: 0,
      processingTimeMs: Date.now() - startTime
    };
  }

  private initializeIndustryConstraints(): void {
    // Initialize industry-specific constraint logic
    // This could be expanded with detailed constraint definitions
    this.industryConstraints.set('restaurant', {
      table_availability: {
        rules: { checkCapacity: true, bufferTime: 30 },
        priority: 1,
        isMandatory: true,
        constraintType: 'availability'
      },
      operating_hours: {
        rules: { respectBusinessHours: true, lastSeating: 60 },
        priority: 1,
        isMandatory: true,
        constraintType: 'timing'
      }
    });

    this.industryConstraints.set('salon', {
      stylist_availability: {
        rules: { requireStaff: true, skillMatching: true },
        priority: 1,
        isMandatory: true,
        constraintType: 'staffing'
      }
    });
  }
}

// Export singleton instance
export const constraintValidator = new ConstraintValidator();