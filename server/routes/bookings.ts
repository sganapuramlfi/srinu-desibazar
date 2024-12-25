import { Router } from "express";
import { db } from "@db";
import { eq, and, not } from "drizzle-orm";
import { z } from "zod";
import { salonBookings, serviceSlots, salonServices, salonStaff } from "@db/schema";
import { format } from 'date-fns';
import { requireAuth, hasBusinessAccess } from "../middleware/businessAccess";

const router = Router();

const createBookingSchema = z.object({
  serviceId: z.number(),
  slotId: z.number(),
  date: z.string(),
});

const cancelBookingSchema = z.object({
  notes: z.string().min(1, "Please provide a reason for cancellation"),
});

const rescheduleBookingSchema = z.object({
  slotId: z.number(),
  date: z.string(),
  notes: z.string().optional(),
});

// Get bookings for the current user
router.get("/bookings", requireAuth, async (req, res) => {
  try {
    const customerId = req.user!.id;

    const bookings = await db
      .select({
        booking: {
          id: salonBookings.id,
          date: salonBookings.date,
          status: salonBookings.status,
          notes: salonBookings.notes,
          customerId: salonBookings.customerId,
          businessId: salonBookings.businessId,
          serviceId: salonBookings.serviceId,
          staffId: salonBookings.staffId,
          slotId: salonBookings.slotId,
        },
        service: {
          id: salonServices.id,
          name: salonServices.name,
          duration: salonServices.duration,
          price: salonServices.price,
        },
        slot: {
          id: serviceSlots.id,
          startTime: serviceSlots.startTime,
          endTime: serviceSlots.endTime,
        },
        staff: {
          id: salonStaff.id,
          name: salonStaff.name,
        },
        customer: {
          id: users.id,
          username: users.username,
          email: users.email,
        },
      })
      .from(salonBookings)
      .innerJoin(salonServices, eq(salonBookings.serviceId, salonServices.id))
      .innerJoin(serviceSlots, eq(salonBookings.slotId, serviceSlots.id))
      .innerJoin(salonStaff, eq(salonBookings.staffId, salonStaff.id))
      .innerJoin(users, eq(salonBookings.customerId, users.id))
      .where(eq(salonBookings.customerId, customerId))
      .orderBy(serviceSlots.startTime);

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// Get bookings for a specific business
router.get("/businesses/:businessId/bookings", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const { status } = req.query;

    let query = db
      .select({
        booking: salonBookings,
        service: {
          id: salonServices.id,
          name: salonServices.name,
          duration: salonServices.duration,
          price: salonServices.price,
        },
        slot: serviceSlots,
        staff: {
          id: salonStaff.id,
          name: salonStaff.name,
        },
        customer: {
          id: users.id,
          username: users.username,
          email: users.email,
        },
      })
      .from(salonBookings)
      .innerJoin(salonServices, eq(salonBookings.serviceId, salonServices.id))
      .innerJoin(serviceSlots, eq(salonBookings.slotId, serviceSlots.id))
      .innerJoin(salonStaff, eq(salonBookings.staffId, salonStaff.id))
      .innerJoin(users, eq(salonBookings.customerId, users.id))
      .where(eq(salonBookings.businessId, businessId));

    if (status && status !== 'all') {
      query = query.where(eq(salonBookings.status, status as string));
    }

    const bookings = await query.orderBy(serviceSlots.startTime);
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching business bookings:", error);
    res.status(500).json({ message: "Failed to fetch business bookings" });
  }
});

// Create a new booking
router.post("/businesses/:businessId/bookings", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const customerId = req.user!.id;

    const validationResult = createBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { serviceId, slotId, date } = validationResult.data;

    const [slot] = await db
      .select({
        slot: serviceSlots,
        service: {
          id: salonServices.id,
          name: salonServices.name,
          duration: salonServices.duration,
          price: salonServices.price,
        },
        staff: {
          id: salonStaff.id,
          name: salonStaff.name,
        },
      })
      .from(serviceSlots)
      .innerJoin(salonServices, eq(serviceSlots.serviceId, salonServices.id))
      .innerJoin(salonStaff, eq(serviceSlots.staffId, salonStaff.id))
      .where(
        and(
          eq(serviceSlots.id, slotId),
          eq(serviceSlots.businessId, businessId),
          eq(serviceSlots.status, "available")
        )
      );

    if (!slot) {
      return res.status(400).json({ message: "Slot not available" });
    }

    const result = await db.transaction(async (tx) => {
      const [newBooking] = await tx
        .insert(salonBookings)
        .values({
          businessId,
          customerId,
          serviceId,
          slotId,
          staffId: slot.staff.id,
          status: "pending",
          date: new Date(date),
        })
        .returning();

      await tx
        .update(serviceSlots)
        .set({ status: "booked" })
        .where(eq(serviceSlots.id, slotId));

      return newBooking;
    });

    const [customer] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, customerId));

    res.json({
      message: "Booking created successfully",
      booking: {
        ...result,
        service: slot.service,
        staff: slot.staff,
        customer,
      },
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

// Cancel a booking
router.post("/businesses/:businessId/bookings/:bookingId/cancel", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const bookingId = parseInt(req.params.bookingId);
    const userId = req.user!.id;

    const validationResult = cancelBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { notes } = validationResult.data;

    const result = await db.transaction(async (tx) => {
      const [booking] = await tx
        .select({
          booking: salonBookings,
          customer: {
            id: users.id,
            username: users.username,
            email: users.email,
          },
        })
        .from(salonBookings)
        .innerJoin(users, eq(salonBookings.customerId, users.id))
        .where(
          and(
            eq(salonBookings.id, bookingId),
            eq(salonBookings.businessId, businessId),
            not(eq(salonBookings.status, "cancelled"))
          )
        );

      if (!booking) {
        throw new Error("Booking not found or already cancelled");
      }

      const [updatedBooking] = await tx
        .update(salonBookings)
        .set({
          status: "cancelled",
          notes,
        })
        .where(eq(salonBookings.id, bookingId))
        .returning();

      await tx
        .update(serviceSlots)
        .set({ status: "available" })
        .where(eq(serviceSlots.id, booking.booking.slotId));

      return {
        ...updatedBooking,
        customer: booking.customer,
      };
    });

    res.json({
      message: "Booking cancelled successfully",
      booking: result,
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    if (error instanceof Error && error.message === "Booking not found or already cancelled") {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  }
});

// Reschedule a booking
router.post("/businesses/:businessId/bookings/:bookingId/reschedule", requireAuth, hasBusinessAccess, async (req, res) => {
  const businessId = parseInt(req.params.businessId);
  const bookingId = parseInt(req.params.bookingId);
  const userId = req.user!.id;

  try {
    console.log('Starting reschedule request:', {
      businessId,
      bookingId,
      userId,
      body: req.body
    });

    const validationResult = rescheduleBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.errors);
      return res.status(400).json({
        message: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { slotId, date, notes } = validationResult.data;

    // Transaction for atomic operations
    const result = await db.transaction(async (tx) => {
      // 1. Get and validate existing booking
      const booking = await tx
        .select()
        .from(salonBookings)
        .where(
          and(
            eq(salonBookings.id, bookingId),
            eq(salonBookings.businessId, businessId),
            not(eq(salonBookings.status, "cancelled"))
          )
        )
        .then(results => results[0]);

      if (!booking) {
        throw new Error("Booking not found or already cancelled");
      }

      // Verify ownership
      if (!req.isBusinessOwner && booking.customerId !== userId) {
        throw new Error("Not authorized to modify this booking");
      }

      // 2. Get and validate new slot
      const newSlot = await tx
        .select({
          slot: serviceSlots,
          staff: salonStaff,
          service: salonServices
        })
        .from(serviceSlots)
        .innerJoin(salonStaff, eq(serviceSlots.staffId, salonStaff.id))
        .innerJoin(salonServices, eq(serviceSlots.serviceId, salonServices.id))
        .where(
          and(
            eq(serviceSlots.id, slotId),
            eq(serviceSlots.businessId, businessId),
            eq(serviceSlots.status, "available")
          )
        )
        .then(results => results[0]);

      if (!newSlot) {
        throw new Error("Selected slot is not available");
      }

      // 3. Release old slot
      await tx
        .update(serviceSlots)
        .set({ status: "available" })
        .where(eq(serviceSlots.id, booking.slotId));

      // 4. Book new slot
      await tx
        .update(serviceSlots)
        .set({ status: "booked" })
        .where(eq(serviceSlots.id, slotId));

      // 5. Update booking
      const updatedBooking = await tx
        .update(salonBookings)
        .set({
          slotId: newSlot.slot.id,
          staffId: newSlot.staff.id,
          date: new Date(date),
          status: "pending",
          notes: notes || `Rescheduled to ${format(new Date(newSlot.slot.startTime), 'PPp')}`
        })
        .where(eq(salonBookings.id, bookingId))
        .returning()
        .then(results => results[0]);

      if (!updatedBooking) {
        throw new Error("Failed to update booking");
      }

      return {
        booking: updatedBooking,
        slot: newSlot.slot,
        service: newSlot.service,
        staff: newSlot.staff
      };
    });

    console.log('Rescheduling successful:', {
      bookingId: result.booking.id,
      newSlotId: result.slot.id,
      staffId: result.staff.id
    });

    res.json({
      message: "Booking rescheduled successfully",
      booking: {
        id: result.booking.id,
        status: result.booking.status,
        notes: result.booking.notes,
        date: result.booking.date,
        service: {
          id: result.service.id,
          name: result.service.name,
          duration: result.service.duration
        },
        slot: {
          id: result.slot.id,
          startTime: result.slot.startTime,
          endTime: result.slot.endTime
        },
        staff: {
          id: result.staff.id,
          name: result.staff.name
        }
      }
    });
  } catch (error) {
    console.error('Error in reschedule endpoint:', error);
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({
      message: "An unexpected error occurred",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;