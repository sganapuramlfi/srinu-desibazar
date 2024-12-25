import { Router } from "express";
import { db } from "@db";
import { eq, and, not } from "drizzle-orm";
import { z } from "zod";
import { salonBookings, serviceSlots, salonServices, salonStaff } from "@db/schema";

const router = Router();

// Create booking schema with validation
const createBookingSchema = z.object({
  serviceId: z.number(),
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
        },
        staff: {
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
    // Create booking and update slot status atomically
    const booking = await db.transaction(async (tx) => {
      const [newBooking] = await tx
        .insert(salonBookings)
        .values({
          businessId,
          customerId,
          serviceId,
          slotId,
          staffId: slot.slot.staffId,
          status: "pending",
          date: new Date(date),
        })
        .returning();

      await tx
        .update(serviceSlots)
        .set({ status: "booked" })
        .where(eq(serviceSlots.id, slotId));

      return {
        ...newBooking,
        serviceName: slot.service.name,
        staffName: slot.staff.name,
        duration: slot.service.duration,
      };
    });

    res.json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

// Get user's bookings with enhanced details
router.get("/businesses/:businessId/bookings", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const customerId = req.user!.id;

    const bookings = await db
      .select({
        booking: salonBookings,
        service: {
          name: salonServices.name,
          duration: salonServices.duration,
          price: salonServices.price,
        },
        slot: {
          startTime: serviceSlots.startTime,
          endTime: serviceSlots.endTime,
        },
        staff: {
          name: salonStaff.name,
        },
      })
      .from(salonBookings)
      .innerJoin(salonServices, eq(salonBookings.serviceId, salonServices.id))
      .innerJoin(serviceSlots, eq(salonBookings.slotId, serviceSlots.id))
      .innerJoin(salonStaff, eq(salonBookings.staffId, salonStaff.id))
      .where(
        and(
          eq(salonBookings.businessId, businessId),
          eq(salonBookings.customerId, customerId)
        )
      );

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// Cancel booking with proper cleanup
router.post("/businesses/:businessId/bookings/:bookingId/cancel", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const bookingId = parseInt(req.params.bookingId);
    const customerId = req.user!.id;

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
            eq(salonBookings.customerId, customerId)
          )
        );

      if (!booking) {
        throw new Error("Booking not found");
      }

      // Update booking status
      const [updatedBooking] = await tx
        .update(salonBookings)
        .set({ status: "cancelled" })
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
    if (error instanceof Error && error.message === "Booking not found") {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  }
});

export default router;