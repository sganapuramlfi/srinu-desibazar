import { Router } from "express";
import { db } from "@db";
import { eq, and, not } from "drizzle-orm";
import { z } from "zod";
import { salonBookings, serviceSlots, salonServices, salonStaff, users } from "@db/schema";
import { format } from 'date-fns';
import { requireAuth, hasBusinessAccess } from "../middleware/businessAccess";

const router = Router();

// Get bookings for the current user
router.get("/bookings", requireAuth, async (req, res) => {
  try {
    const customerId = req.user!.id;

    const bookings = await db
      .select({
        booking: {
          id: salonBookings.id,
          scheduledAt: salonBookings.scheduledAt,
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

    // Format the date in the response
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      booking: {
        ...booking.booking,
        date: format(new Date(booking.booking.scheduledAt), "yyyy-MM-dd'T'HH:mm:ss'Z'")
      }
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// Get bookings for a specific business
router.get("/businesses/:businessId/bookings", requireAuth, hasBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { status } = req.query;

    let bookingsQuery = db
      .select({
        booking: {
          id: salonBookings.id,
          scheduledAt: salonBookings.scheduledAt,
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
      bookingsQuery = bookingsQuery.where(eq(salonBookings.status, status as string));
    }

    const bookings = await bookingsQuery.orderBy(serviceSlots.startTime);

    // Format the date in the response
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      booking: {
        ...booking.booking,
        date: format(new Date(booking.booking.scheduledAt), "yyyy-MM-dd'T'HH:mm:ss'Z'")
      }
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error("Error fetching business bookings:", error);
    res.status(500).json({ message: "Failed to fetch business bookings" });
  }
});

// Reschedule booking route
router.post(
  "/businesses/:businessId/bookings/:bookingId/reschedule",
  requireAuth,
  hasBusinessAccess,
  async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const bookingId = parseInt(req.params.bookingId);
      const userId = req.user!.id;

      console.log('Reschedule attempt:', { businessId, bookingId, userId, body: req.body });

      // Validate request body
      const validationResult = rescheduleBookingSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log('Validation failed:', validationResult.error.errors);
        return res.status(400).json({
          message: "Invalid input",
          details: validationResult.error.errors,
        });
      }

      const { slotId, date, notes } = validationResult.data;

      // First get the existing booking
      const [existingBooking] = await db
        .select({
          id: salonBookings.id,
          customerId: salonBookings.customerId,
          slotId: salonBookings.slotId,
          status: salonBookings.status,
        })
        .from(salonBookings)
        .where(
          and(
            eq(salonBookings.id, bookingId),
            eq(salonBookings.businessId, businessId),
            not(eq(salonBookings.status, "cancelled"))
          )
        );

      if (!existingBooking) {
        console.log('Booking not found or cancelled:', bookingId);
        return res.status(404).json({ message: "Booking not found or already cancelled" });
      }

      // Verify ownership
      if (!req.isBusinessOwner && existingBooking.customerId !== userId) {
        console.log('Unauthorized reschedule attempt:', { userId, bookingId });
        return res.status(403).json({ message: "Not authorized to modify this booking" });
      }

      // Get new slot with staff and service details
      const slots = await db
        .select({
          slot: {
            id: serviceSlots.id,
            startTime: serviceSlots.startTime,
            endTime: serviceSlots.endTime,
            status: serviceSlots.status,
            serviceId: serviceSlots.serviceId,
            staffId: serviceSlots.staffId,
          },
          service: {
            id: salonServices.id,
            name: salonServices.name,
            duration: salonServices.duration,
            price: salonServices.price,
          },
          staff: {
            id: salonStaff.id,
            name: salonStaff.name,
            email: salonStaff.email,
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

      if (!slots.length) {
        console.log('Slot not available:', slotId);
        return res.status(400).json({ message: "Selected slot is not available" });
      }

      const [{ slot, service, staff }] = slots;

      // Perform the reschedule operation in a transaction
      const result = await db.transaction(async (tx) => {
        // Release old slot
        await tx
          .update(serviceSlots)
          .set({ status: "available" })
          .where(eq(serviceSlots.id, existingBooking.slotId));

        // Book new slot
        await tx
          .update(serviceSlots)
          .set({ status: "booked" })
          .where(eq(serviceSlots.id, slotId));

        // Update booking
        const [updatedBooking] = await tx
          .update(salonBookings)
          .set({
            slotId: slot.id,
            staffId: staff.id,
            scheduledAt: new Date(date),
            status: "pending",
            notes: notes || `Rescheduled to ${format(new Date(slot.startTime), 'PPp')}`,
          })
          .where(eq(salonBookings.id, bookingId))
          .returning();

        return { booking: updatedBooking, slot, service, staff };
      });

      console.log('Rescheduling successful:', { bookingId, newSlotId: slot.id });

      // Format the response
      res.json({
        message: "Booking rescheduled successfully",
        booking: {
          id: result.booking.id,
          status: result.booking.status,
          notes: result.booking.notes,
          date: result.booking.scheduledAt,
          service: {
            id: result.service.id,
            name: result.service.name,
            duration: result.service.duration,
            price: result.service.price,
          },
          slot: {
            id: result.slot.id,
            startTime: result.slot.startTime,
            endTime: result.slot.endTime,
          },
          staff: {
            id: result.staff.id,
            name: result.staff.name,
          },
        },
      });
    } catch (error) {
      console.error('Error in reschedule endpoint:', error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({
        message: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Schema validation
const rescheduleBookingSchema = z.object({
  slotId: z.number(),
  date: z.string(),
  notes: z.string().optional(),
});


// Create a new booking
router.post("/businesses/:businessId/bookings", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const customerId = req.user!.id;

    const createBookingSchema = z.object({
      serviceId: z.number(),
      slotId: z.number(),
      date: z.string(),
    });

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
          scheduledAt: new Date(date),
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

    const cancelBookingSchema = z.object({
      notes: z.string().min(1, "Please provide a reason for cancellation"),
    });

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



export default router;