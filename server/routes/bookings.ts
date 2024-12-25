import { Router } from "express";
import { db } from "@db";
import { eq, and, not, or } from "drizzle-orm";
import { z } from "zod";
import { salonBookings, serviceSlots, salonServices, salonStaff, users } from "@db/schema";
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
            or(
              eq(salonBookings.customerId, userId),
              eq(salonBookings.businessId, businessId)
            ),
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
  try {
    const businessId = parseInt(req.params.businessId);
    const bookingId = parseInt(req.params.bookingId);
    const userId = req.user!.id;

    const validationResult = rescheduleBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { slotId, date, notes } = validationResult.data;

    const result = await db.transaction(async (tx) => {
      // Get the current booking with all related information
      const [currentBooking] = await tx
        .select({
          booking: salonBookings,
          service: {
            id: salonServices.id,
            name: salonServices.name,
            duration: salonServices.duration,
          },
          currentSlot: {
            id: serviceSlots.id,
            startTime: serviceSlots.startTime,
            endTime: serviceSlots.endTime,
          },
        })
        .from(salonBookings)
        .innerJoin(salonServices, eq(salonBookings.serviceId, salonServices.id))
        .innerJoin(serviceSlots, eq(salonBookings.slotId, serviceSlots.id))
        .where(
          and(
            eq(salonBookings.id, bookingId),
            eq(salonBookings.businessId, businessId),
            not(eq(salonBookings.status, "cancelled")),
            or(
              eq(salonBookings.customerId, userId),
              req.isBusinessOwner ? eq(salonBookings.businessId, businessId) : undefined
            )
          )
        );

      if (!currentBooking) {
        throw new Error("Booking not found or you don't have permission to reschedule it");
      }

      // Get the new slot with staff information
      const [newSlot] = await tx
        .select({
          slot: serviceSlots,
          staff: {
            id: salonStaff.id,
            name: salonStaff.name,
          },
        })
        .from(serviceSlots)
        .innerJoin(salonStaff, eq(serviceSlots.staffId, salonStaff.id))
        .where(
          and(
            eq(serviceSlots.id, slotId),
            eq(serviceSlots.businessId, businessId),
            eq(serviceSlots.status, "available"),
            eq(serviceSlots.serviceId, currentBooking.service.id)
          )
        );

      if (!newSlot) {
        throw new Error("Selected slot is not available or incompatible with current service");
      }

      // Release the old slot
      await tx
        .update(serviceSlots)
        .set({ status: "available" })
        .where(eq(serviceSlots.id, currentBooking.currentSlot.id));

      // Book the new slot
      await tx
        .update(serviceSlots)
        .set({ status: "booked" })
        .where(eq(serviceSlots.id, slotId));

      // Update the booking
      const [updatedBooking] = await tx
        .update(salonBookings)
        .set({
          slotId: newSlot.slot.id,
          staffId: newSlot.staff.id,
          date: new Date(date),
          status: "pending",
          notes: notes || `Rescheduled from ${format(new Date(currentBooking.currentSlot.startTime), 'PP p')} to ${format(new Date(newSlot.slot.startTime), 'PP p')}`,
        })
        .where(eq(salonBookings.id, bookingId))
        .returning();

      return {
        ...updatedBooking,
        service: currentBooking.service,
        staff: newSlot.staff,
        slot: {
          id: newSlot.slot.id,
          startTime: newSlot.slot.startTime,
          endTime: newSlot.slot.endTime,
        },
      };
    });

    res.json({
      message: "Booking rescheduled successfully",
      booking: result,
    });
  } catch (error) {
    console.error("Error rescheduling booking:", error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Failed to reschedule booking" });
    }
  }
});

export default router;