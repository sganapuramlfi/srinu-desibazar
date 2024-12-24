import { Router } from "express";
import { db } from "@db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { salonBookings, serviceSlots, salonServices } from "@db/schema";

const router = Router();

// Create booking schema
const createBookingSchema = z.object({
  serviceId: z.number(),
  slotId: z.number(),
  date: z.string(),
});

// Create a new booking
router.post("/businesses/:businessId/bookings", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const customerId = req.user!.id;

    // Validate request body
    const validationResult = createBookingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { serviceId, slotId, date } = validationResult.data;

    // Verify slot exists and is available
    const [slot] = await db
      .select()
      .from(serviceSlots)
      .where(
        and(
          eq(serviceSlots.id, slotId),
          eq(serviceSlots.businessId, businessId),
          eq(serviceSlots.status, "available")
        )
      );

    if (!slot) {
      return res.status(400).json({ error: "Slot not available" });
    }

    // Create booking
    const [booking] = await db
      .insert(salonBookings)
      .values({
        businessId,
        customerId,
        serviceId,
        slotId,
        staffId: slot.staffId,
        status: "pending",
        date: new Date(date),
      })
      .returning();

    // Update slot status
    await db
      .update(serviceSlots)
      .set({ status: "booked" })
      .where(eq(serviceSlots.id, slotId));

    res.json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// Get user's bookings
router.get("/businesses/:businessId/bookings", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
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
        slot: {
          startTime: serviceSlots.startTime,
          endTime: serviceSlots.endTime,
        },
      })
      .from(salonBookings)
      .innerJoin(salonServices, eq(salonBookings.serviceId, salonServices.id))
      .innerJoin(serviceSlots, eq(salonBookings.slotId, serviceSlots.id))
      .where(
        and(
          eq(salonBookings.businessId, businessId),
          eq(salonBookings.customerId, customerId)
        )
      );

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Cancel booking
router.post("/businesses/:businessId/bookings/:bookingId/cancel", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const bookingId = parseInt(req.params.bookingId);
    const customerId = req.user!.id;

    // Get booking
    const [booking] = await db
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
      return res.status(404).json({ error: "Booking not found" });
    }

    // Update booking status
    const [updatedBooking] = await db
      .update(salonBookings)
      .set({ status: "cancelled" })
      .where(eq(salonBookings.id, bookingId))
      .returning();

    // Free up the slot
    await db
      .update(serviceSlots)
      .set({ status: "available" })
      .where(eq(serviceSlots.id, booking.slotId));

    res.json(updatedBooking);
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

export default router;