import { Router } from "express";
import { db } from "@db";
import { eq, and, not, or } from "drizzle-orm";
import { z } from "zod";
import { salonBookings, serviceSlots, salonServices, salonStaff } from "@db/schema";

const router = Router();

// Create booking schema with validation
const createBookingSchema = z.object({
  serviceId: z.number(),
  slotId: z.number(),
  date: z.string(),
});

// Cancel booking schema
const cancelBookingSchema = z.object({
  notes: z.string().min(1, "Please provide a reason for cancellation"),
});

// Reschedule booking schema
const rescheduleBookingSchema = z.object({
  slotId: z.number(),
  date: z.string(),
});

// Create a new booking with enhanced validation
router.post("/businesses/:businessId/bookings", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const customerId = req.user!.id;

    // Validate request body
    const validationResult = createBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { serviceId, slotId, date } = validationResult.data;

    // Check if slot exists and is available
    const [slot] = await db
      .select({
        slot: serviceSlots,
        service: {
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

    // Check for existing bookings
    const [existingBooking] = await db
      .select()
      .from(salonBookings)
      .where(
        and(
          eq(salonBookings.slotId, slotId),
          not(eq(salonBookings.status, "cancelled"))
        )
      );

    if (existingBooking) {
      return res.status(409).json({ message: "This slot has already been booked" });
    }

    // Begin transaction
    const booking = await db.transaction(async (tx) => {
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

    res.json({
      message: "Booking created successfully",
      booking: {
        ...booking,
        service: slot.service,
        staff: slot.staff,
      },
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

// Get user's bookings with enhanced details
router.get("/bookings", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const customerId = req.user!.id;

    const bookings = await db
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
      })
      .from(salonBookings)
      .innerJoin(salonServices, eq(salonBookings.serviceId, salonServices.id))
      .innerJoin(serviceSlots, eq(salonBookings.slotId, serviceSlots.id))
      .innerJoin(salonStaff, eq(salonBookings.staffId, salonStaff.id))
      .where(eq(salonBookings.customerId, customerId))
      .orderBy(serviceSlots.startTime);

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// Get business bookings with enhanced filtering
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
      })
      .from(salonBookings)
      .innerJoin(salonServices, eq(salonBookings.serviceId, salonServices.id))
      .innerJoin(serviceSlots, eq(salonBookings.slotId, serviceSlots.id))
      .innerJoin(salonStaff, eq(salonBookings.staffId, salonStaff.id))
      .where(eq(salonBookings.businessId, businessId));

    if (status) {
      query = query.where(eq(salonBookings.status, status as string));
    }

    const bookings = await query.orderBy(serviceSlots.startTime);
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching business bookings:", error);
    res.status(500).json({ message: "Failed to fetch business bookings" });
  }
});

// Cancel booking with notes
router.post("/businesses/:businessId/bookings/:bookingId/cancel", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const bookingId = parseInt(req.params.bookingId);
    const userId = req.user!.id;

    // Validate cancellation notes
    const validationResult = cancelBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { notes } = validationResult.data;

    // Begin transaction
    const result = await db.transaction(async (tx) => {
      // Get booking with validation
      const [booking] = await tx
        .select()
        .from(salonBookings)
        .where(
          and(
            eq(salonBookings.id, bookingId),
            eq(salonBookings.businessId, businessId),
            or(
              eq(salonBookings.customerId, userId),
              // Allow business owner to cancel any booking
              eq(salonBookings.businessId, businessId)
            ),
            not(eq(salonBookings.status, "cancelled"))
          )
        );

      if (!booking) {
        throw new Error("Booking not found or already cancelled");
      }

      // Update booking status and add notes
      const [updatedBooking] = await tx
        .update(salonBookings)
        .set({
          status: "cancelled",
          notes,
        })
        .where(eq(salonBookings.id, bookingId))
        .returning();

      // Release the slot
      await tx
        .update(serviceSlots)
        .set({ status: "available" })
        .where(eq(serviceSlots.id, booking.slotId));

      return updatedBooking;
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

// Reschedule booking
router.post("/businesses/:businessId/bookings/:bookingId/reschedule", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const bookingId = parseInt(req.params.bookingId);
    const userId = req.user!.id;

    // Validate request body
    const validationResult = rescheduleBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { slotId, date } = validationResult.data;

    // Begin transaction
    const result = await db.transaction(async (tx) => {
      // Get current booking
      const [currentBooking] = await tx
        .select()
        .from(salonBookings)
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

      if (!currentBooking) {
        throw new Error("Booking not found or cannot be rescheduled");
      }

      // Check if new slot is available
      const [newSlot] = await tx
        .select()
        .from(serviceSlots)
        .where(
          and(
            eq(serviceSlots.id, slotId),
            eq(serviceSlots.businessId, businessId),
            eq(serviceSlots.status, "available")
          )
        );

      if (!newSlot) {
        throw new Error("Selected slot is not available");
      }

      // Release old slot
      await tx
        .update(serviceSlots)
        .set({ status: "available" })
        .where(eq(serviceSlots.id, currentBooking.slotId));

      // Book new slot
      await tx
        .update(serviceSlots)
        .set({ status: "booked" })
        .where(eq(serviceSlots.id, slotId));

      // Update booking
      const [updatedBooking] = await tx
        .update(salonBookings)
        .set({
          status: "rescheduled",
          slotId,
          date: new Date(date),
        })
        .where(eq(salonBookings.id, bookingId))
        .returning();

      return updatedBooking;
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