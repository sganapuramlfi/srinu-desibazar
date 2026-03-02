import { Router } from "express";
import { db } from "../../db/index.js";
import { 
  bookings, 
  bookableItems, 
  businessTenants,
  bookingOperations,
  bookingPolicies,
  businessCommunications,
  notificationQueue,
  platformUsers
} from "../../db/index.js";
import { eq, and, desc, gte, lte, sql, between } from "drizzle-orm";
import { z } from "zod";
import { constraintValidator } from "../services/ConstraintValidator.js";

const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const validateBookingSchema = z.object({
  bookableItemId: z.number(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  bookingDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  partySize: z.number().positive(),
  specialRequests: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const cancelBookingSchema = z.object({
  reason: z.string().min(1),
  requestedBy: z.enum(['customer', 'staff', 'system']).default('customer')
});

const rescheduleBookingSchema = z.object({
  newDate: z.string(), // "yyyy-MM-dd"
  newTime: z.string(), // "9:30 AM" or "14:00"
  reason: z.string().optional(),
});

const updateBookingStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  reason: z.string().optional(),
  internalNotes: z.string().optional()
});

// =============================================================================
// BOOKING VALIDATION ENDPOINTS
// =============================================================================

// Validate a booking request before creating it
router.post("/businesses/:businessId/bookings/validate", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const validationResult = validateBookingSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid booking data",
        details: validationResult.error.issues
      });
    }

    const bookingRequest = {
      businessId,
      ...validationResult.data,
      startTime: new Date(validationResult.data.startTime),
      endTime: new Date(validationResult.data.endTime)
    };

    // Validate against constraints
    const constraintResult = await constraintValidator.validateBookingRequest(bookingRequest);

    res.json({
      isValid: constraintResult.isValid,
      violations: constraintResult.violations,
      warnings: constraintResult.warnings,
      constraintsChecked: constraintResult.constraintsChecked,
      processingTimeMs: constraintResult.processingTimeMs,
      canProceed: constraintResult.violations.filter(v => v.isMandatory).length === 0
    });

  } catch (error) {
    console.error('Booking validation error:', error);
    res.status(500).json({ error: "Failed to validate booking request" });
  }
});

// =============================================================================
// BOOKING LIFECYCLE OPERATIONS
// =============================================================================

// Cancel a booking
router.post("/businesses/:businessId/bookings/:bookingId/cancel", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const bookingId = parseInt(req.params.bookingId);
    
    const validationResult = cancelBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid cancellation data",
        details: validationResult.error.issues
      });
    }

    const { reason, requestedBy } = validationResult.data;

    // Verify booking exists and belongs to business
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.id, bookingId),
        eq(bookings.businessId, businessId)
      ))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ error: "Cannot cancel a completed booking" });
    }

    // Process cancellation through constraint validator
    const cancellationResult = await constraintValidator.processCancellation(
      bookingId,
      reason,
      req.user?.id,
      requestedBy
    );

    if (!cancellationResult.isValid && cancellationResult.violations.some(v => v.isMandatory)) {
      return res.status(400).json({
        error: "Cancellation not allowed",
        violations: cancellationResult.violations,
        warnings: cancellationResult.warnings
      });
    }

    res.json({
      message: "Booking cancelled successfully",
      bookingId,
      violations: cancellationResult.violations,
      warnings: cancellationResult.warnings,
      financialImpact: cancellationResult.violations.find(v => v.financialImpact)?.financialImpact
    });

  } catch (error) {
    console.error('Booking cancellation error:', error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Reschedule a booking
router.post("/businesses/:businessId/bookings/:bookingId/reschedule", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const bookingId = parseInt(req.params.bookingId);

    const validationResult = rescheduleBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid reschedule data",
        details: validationResult.error.issues
      });
    }

    const { newDate, newTime } = validationResult.data;

    // Verify booking exists and belongs to business
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.id, bookingId),
        eq(bookings.businessId, businessId)
      ))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (['cancelled', 'completed', 'no_show'].includes(booking.status)) {
      return res.status(400).json({
        error: `Cannot reschedule a ${booking.status} booking`
      });
    }

    // Convert 12-hour time to 24-hour if needed (e.g. "9:30 AM" -> "09:30")
    const to24Hour = (t: string) => {
      const parts = t.trim().split(' ');
      if (parts.length === 1) return t; // already 24-hour
      const [timePart, period] = parts;
      const [h, m] = timePart.split(':').map(Number);
      let hours = h;
      if (period.toUpperCase() === 'AM') { if (hours === 12) hours = 0; }
      else if (period.toUpperCase() === 'PM') { if (hours !== 12) hours += 12; }
      return `${String(hours).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const time24 = to24Hour(newTime);
    const newStartTime = new Date(`${newDate}T${time24}`);

    // Calculate new end time based on original booking duration
    const originalDuration = booking.endTime && booking.startTime
      ? new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()
      : 60 * 60 * 1000; // default 1 hour
    const newEndTime = new Date(newStartTime.getTime() + originalDuration);

    // Update the booking record
    await db.update(bookings)
      .set({
        startTime: newStartTime,
        endTime: newEndTime,
        bookingDate: newDate,
        status: 'confirmed',
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    res.json({
      message: "Booking rescheduled successfully",
      bookingId,
      newStartTime: newStartTime.toISOString(),
      newEndTime: newEndTime.toISOString(),
    });

  } catch (error) {
    console.error('Booking reschedule error:', error);
    res.status(500).json({ error: "Failed to reschedule booking" });
  }
});

// Mark booking as no-show
router.post("/businesses/:businessId/bookings/:bookingId/no-show", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const bookingId = parseInt(req.params.bookingId);

    // Verify booking exists and belongs to business
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.id, bookingId),
        eq(bookings.businessId, businessId)
      ))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      return res.status(400).json({ 
        error: `Cannot mark ${booking.status} booking as no-show` 
      });
    }

    // Check if booking time has passed
    const now = new Date();
    if (booking.startTime > now) {
      return res.status(400).json({ 
        error: "Cannot mark future booking as no-show" 
      });
    }

    // Process no-show through constraint validator
    const noShowResult = await constraintValidator.processNoShow(bookingId);

    res.json({
      message: "Booking marked as no-show",
      bookingId,
      violations: noShowResult.violations,
      warnings: noShowResult.warnings,
      financialImpact: noShowResult.violations.find(v => v.financialImpact)?.financialImpact
    });

  } catch (error) {
    console.error('No-show processing error:', error);
    res.status(500).json({ error: "Failed to process no-show" });
  }
});

// Update booking status (for staff/admin)
router.patch("/businesses/:businessId/bookings/:bookingId/status", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const bookingId = parseInt(req.params.bookingId);
    
    const validationResult = updateBookingStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid status update data",
        details: validationResult.error.issues
      });
    }

    const { status, reason, internalNotes } = validationResult.data;

    // Verify booking exists and belongs to business
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.id, bookingId),
        eq(bookings.businessId, businessId)
      ))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Update booking status
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status,
        internalNotes: internalNotes || booking.internalNotes,
        updatedAt: new Date()
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Log the operation
    await db.insert(bookingOperations).values({
      bookingId,
      businessId,
      operationType: 'modify',
      operationData: JSON.stringify({ 
        statusChange: { from: booking.status, to: status },
        reason,
        internalNotes 
      }),
      performedByUserId: req.user?.id || null,
      performedByRole: req.user?.role === 'business' ? 'staff' : 'admin',
      constraintsPassed: true,
      createdAt: new Date()
    });

    // Create customer notification for booking status update
    let notificationMessage = "";
    let communicationType = 'booking_confirmed';
    
    switch (status) {
      case "confirmed":
        notificationMessage = `Your booking has been confirmed! We look forward to seeing you.`;
        communicationType = 'booking_confirmed';
        break;
      case "cancelled":
        notificationMessage = `Your booking has been cancelled. ${reason ? `Reason: ${reason}` : ''} Please contact us if you have questions.`;
        communicationType = 'booking_cancelled';
        break;
      case "completed":
        notificationMessage = `Your booking has been completed. Thank you for choosing our services!`;
        communicationType = 'booking_completed';
        break;
      case "no_show":
        notificationMessage = `We noticed you didn't make it to your appointment. Please contact us to reschedule.`;
        communicationType = 'booking_no_show';
        break;
      case "rescheduled":
        notificationMessage = `Your booking has been rescheduled. Please check the new time details.`;
        communicationType = 'booking_rescheduled';
        break;
    }

    if (notificationMessage && booking.customerId) {
      // Get customer details
      const [customer] = await db
        .select()
        .from(platformUsers)
        .where(eq(platformUsers.id, booking.customerId))
        .limit(1);

      if (customer) {
        console.log('[Booking] Creating customer notification for status update...');
        
        // Create business communication for status update
        const [communication] = await db
          .insert(businessCommunications)
          .values({
            businessId,
            customerId: booking.customerId,
            subject: `Booking Update - ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            communicationType: communicationType as any,
            priority: status === 'cancelled' ? 5 : 3,
            status: 'closed',
            customerName: customer.fullName || customer.email.split('@')[0],
            customerEmail: customer.email,
            metadata: {
              relatedEntityType: 'booking',
              relatedEntityId: bookingId,
              statusUpdate: status,
              reason: reason || null
            }
          })
          .returning();

        // Create notification for customer
        await db
          .insert(notificationQueue)
          .values({
            businessId,
            userId: booking.customerId,
            communicationId: communication.id,
            notificationType: 'email',
            subject: `Booking Update - ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            messageText: notificationMessage,
            messageHtml: `<p>${notificationMessage}</p>`,
            data: {
              bookingId,
              statusUpdate: status,
              reason: reason || null,
              customerEmail: customer.email
            },
            priority: status === 'cancelled' ? 5 : 3,
            status: 'pending'
          });

        console.log('[Booking] Customer notification created successfully');
      }
    }

    res.json({
      message: "Booking status updated successfully",
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: "Failed to update booking status" });
  }
});

// =============================================================================
// BOOKING OPERATIONS HISTORY
// =============================================================================

// Get booking operations history
router.get("/businesses/:businessId/bookings/:bookingId/operations", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const bookingId = parseInt(req.params.bookingId);

    // Verify booking exists and belongs to business
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.id, bookingId),
        eq(bookings.businessId, businessId)
      ))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Get all operations for this booking
    const operations = await db
      .select()
      .from(bookingOperations)
      .where(eq(bookingOperations.bookingId, bookingId))
      .orderBy(desc(bookingOperations.createdAt));

    res.json({
      bookingId,
      totalOperations: operations.length,
      operations: operations.map(op => ({
        id: op.id,
        operationType: op.operationType,
        operationData: op.operationData,
        performedByRole: op.performedByRole,
        constraintsPassed: op.constraintsPassed,
        constraintViolations: op.constraintViolations,
        financialImpact: op.financialImpact,
        createdAt: op.createdAt
      }))
    });

  } catch (error) {
    console.error('Operations history error:', error);
    res.status(500).json({ error: "Failed to get booking operations history" });
  }
});

// =============================================================================
// BUSINESS POLICIES MANAGEMENT
// =============================================================================

// Get business booking policies
router.get("/businesses/:businessId/booking-policies", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);

    const policies = await db
      .select()
      .from(bookingPolicies)
      .where(and(
        eq(bookingPolicies.businessId, businessId),
        eq(bookingPolicies.isActive, true)
      ))
      .orderBy(desc(bookingPolicies.createdAt))
      .limit(1);

    if (policies.length === 0) {
      return res.status(404).json({ error: "No booking policies found for this business" });
    }

    res.json(policies[0]);

  } catch (error) {
    console.error('Booking policies error:', error);
    res.status(500).json({ error: "Failed to get booking policies" });
  }
});

// Update business booking policies
router.put("/businesses/:businessId/booking-policies", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    
    // Verify business access
    if (!req.user || req.user.role !== 'business') {
      return res.status(403).json({ error: "Only business owners can update policies" });
    }

    const {
      cancellationPolicy,
      reschedulePolicy,
      noShowPolicy,
      paymentPolicy
    } = req.body;

    // Update or create policies
    const [updatedPolicy] = await db
      .insert(bookingPolicies)
      .values({
        businessId,
        cancellationPolicy: cancellationPolicy || undefined,
        reschedulePolicy: reschedulePolicy || undefined,
        noShowPolicy: noShowPolicy || undefined,
        paymentPolicy: paymentPolicy || undefined,
        policyVersion: 1,
        effectiveFrom: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [bookingPolicies.businessId],
        set: {
          cancellationPolicy: cancellationPolicy || sql`${bookingPolicies.cancellationPolicy}`,
          reschedulePolicy: reschedulePolicy || sql`${bookingPolicies.reschedulePolicy}`,
          noShowPolicy: noShowPolicy || sql`${bookingPolicies.noShowPolicy}`,
          paymentPolicy: paymentPolicy || sql`${bookingPolicies.paymentPolicy}`,
          policyVersion: sql`${bookingPolicies.policyVersion} + 1`,
          updatedAt: new Date()
        }
      })
      .returning();

    res.json({
      message: "Booking policies updated successfully",
      policy: updatedPolicy
    });

  } catch (error) {
    console.error('Policy update error:', error);
    res.status(500).json({ error: "Failed to update booking policies" });
  }
});

// =============================================================================
// ANALYTICS AND REPORTING
// =============================================================================

// Get booking operations analytics
router.get("/businesses/:businessId/booking-analytics", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { startDate, endDate } = req.query;
    
    let dateFilter = sql`TRUE`;
    if (startDate && endDate) {
      dateFilter = between(
        bookingOperations.createdAt,
        new Date(startDate as string),
        new Date(endDate as string)
      );
    }

    // Get operation counts by type
    const operationStats = await db
      .select({
        operationType: bookingOperations.operationType,
        count: sql<number>`COUNT(*)`,
        constraintsPassed: sql<number>`SUM(CASE WHEN ${bookingOperations.constraintsPassed} THEN 1 ELSE 0 END)`
      })
      .from(bookingOperations)
      .where(and(
        eq(bookingOperations.businessId, businessId),
        dateFilter
      ))
      .groupBy(bookingOperations.operationType);

    // Get cancellation reasons
    const cancellationReasons = await db
      .select({
        reason: sql<string>`${bookingOperations.operationData}->>'reason'`,
        count: sql<number>`COUNT(*)`
      })
      .from(bookingOperations)
      .where(and(
        eq(bookingOperations.businessId, businessId),
        eq(bookingOperations.operationType, 'cancel'),
        dateFilter
      ))
      .groupBy(sql`${bookingOperations.operationData}->>'reason'`);

    // Get constraint violation summary
    const constraintViolations = await db
      .select({
        violationType: sql<string>`jsonb_array_elements(${bookingOperations.constraintViolations}->'violations')->>'violationType'`,
        count: sql<number>`COUNT(*)`
      })
      .from(bookingOperations)
      .where(and(
        eq(bookingOperations.businessId, businessId),
        sql`${bookingOperations.constraintViolations}->'violations' != '[]'`,
        dateFilter
      ))
      .groupBy(sql`jsonb_array_elements(${bookingOperations.constraintViolations}->'violations')->>'violationType'`);

    res.json({
      operationStats,
      cancellationReasons,
      constraintViolations,
      period: { startDate, endDate }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: "Failed to get booking analytics" });
  }
});

export default router;