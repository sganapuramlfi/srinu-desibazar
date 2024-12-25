import { Router } from "express";
import { db } from "@db";
import { serviceSlots, salonServices, salonStaff, salonBookings } from "@db/schema";
import { eq, and, not, or, sql } from "drizzle-orm";
import { z } from "zod";
import { format, endOfDay } from "date-fns";
import { requireAuth, hasBusinessAccess } from "../middleware/businessAccess";

const router = Router();

// Helper function to normalize date to UTC midnight
const normalizeDate = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Get slots for a business with enhanced filtering
router.get("/businesses/:businessId/slots", requireAuth, async (req, res) => {
  try {
    console.log("Fetching slots for business:", req.params);
    const businessId = parseInt(req.params.businessId);
    let { startDate, endDate, serviceId, staffId } = req.query;

    if (!startDate || !endDate) {
      const currentDate = format(new Date(), "yyyy-MM-dd");
      startDate = currentDate;
      endDate = currentDate;
    }

    if (!businessId || isNaN(businessId)) {
      return res.status(400).json({ error: "Invalid business ID" });
    }

    const startDateObj = normalizeDate(new Date(startDate as string));
    const endDateObj = endOfDay(new Date(endDate as string));

    console.log("Fetching slots with params:", {
      businessId,
      startDate: format(startDateObj, 'yyyy-MM-dd'),
      endDate: format(endDateObj, 'yyyy-MM-dd'),
      serviceId,
      staffId
    });

    // Get available slots with service and staff info
    const slots = await db
      .select({
        slot: {
          id: serviceSlots.id,
          startTime: serviceSlots.startTime,
          endTime: serviceSlots.endTime,
          status: serviceSlots.status,
          serviceId: serviceSlots.serviceId,
          staffId: serviceSlots.staffId
        },
        service: {
          id: salonServices.id,
          name: salonServices.name,
          duration: salonServices.duration,
          price: salonServices.price
        },
        staff: {
          id: salonStaff.id,
          name: salonStaff.name
        }
      })
      .from(serviceSlots)
      .innerJoin(salonServices, eq(serviceSlots.serviceId, salonServices.id))
      .innerJoin(salonStaff, eq(serviceSlots.staffId, salonStaff.id))
      .where(
        and(
          eq(serviceSlots.businessId, businessId),
          sql`DATE(${serviceSlots.startTime}) >= ${startDateObj.toISOString().split('T')[0]}::date`,
          sql`DATE(${serviceSlots.endTime}) <= ${endDateObj.toISOString().split('T')[0]}::date`,
          serviceId ? eq(serviceSlots.serviceId, parseInt(serviceId as string)) : undefined,
          staffId ? eq(serviceSlots.staffId, parseInt(staffId as string)) : undefined,
          eq(serviceSlots.status, "available")
        )
      );

    if (!slots.length) {
      return res.json([]);
    }

    // Get existing bookings to filter out booked slots
    const bookings = await db
      .select({
        slotId: salonBookings.slotId,
        status: salonBookings.status
      })
      .from(salonBookings)
      .where(
        and(
          eq(salonBookings.businessId, businessId),
          or(
            eq(salonBookings.status, "confirmed"),
            eq(salonBookings.status, "pending")
          )
        )
      );

    // Create a set of booked slots
    const bookedSlots = new Set(bookings.map(booking => booking.slotId));

    // Filter and format available slots
    const availableSlots = slots
      .filter(({ slot }) => !bookedSlots.has(slot.id))
      .map(({ slot, service, staff }) => ({
        id: slot.id,
        startTime: format(new Date(slot.startTime), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        endTime: format(new Date(slot.endTime), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        displayTime: `${format(new Date(slot.startTime), 'h:mm a')} - ${format(new Date(slot.endTime), 'h:mm a')}`,
        status: slot.status,
        service: {
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: service.price
        },
        staff: {
          id: staff.id,
          name: staff.name
        }
      }));

    console.log(`Found ${availableSlots.length} available slots`);
    res.json(availableSlots);
  } catch (error) {
    console.error("Error fetching slots:", error);
    res.status(500).json({
      error: "Failed to fetch slots",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get available slots for rescheduling
router.get("/businesses/:businessId/slots/available", requireAuth, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { date, serviceId, staffId } = req.query;

    if (!date) {
      return res.status(400).json({
        error: "Date is required"
      });
    }

    if (!businessId || isNaN(businessId)) {
      return res.status(400).json({ error: "Invalid business ID" });
    }

    const startDateObj = normalizeDate(new Date(date as string));
    const endDateObj = endOfDay(new Date(date as string));

    console.log("Fetching available slots with params:", {
      businessId,
      date,
      serviceId,
      staffId
    });

    // Get available slots with service and staff info
    const slots = await db
      .select({
        slot: {
          id: serviceSlots.id,
          startTime: serviceSlots.startTime,
          endTime: serviceSlots.endTime,
          status: serviceSlots.status,
          serviceId: serviceSlots.serviceId,
          staffId: serviceSlots.staffId
        },
        service: {
          id: salonServices.id,
          name: salonServices.name,
          duration: salonServices.duration,
          price: salonServices.price
        },
        staff: {
          id: salonStaff.id,
          name: salonStaff.name
        }
      })
      .from(serviceSlots)
      .innerJoin(salonServices, eq(serviceSlots.serviceId, salonServices.id))
      .innerJoin(salonStaff, eq(serviceSlots.staffId, salonStaff.id))
      .where(
        and(
          eq(serviceSlots.businessId, businessId),
          sql`DATE(${serviceSlots.startTime}) = ${startDateObj.toISOString().split('T')[0]}::date`,
          serviceId ? eq(serviceSlots.serviceId, parseInt(serviceId as string)) : undefined,
          staffId ? eq(serviceSlots.staffId, parseInt(staffId as string)) : undefined,
          eq(serviceSlots.status, "available")
        )
      );

    if (!slots.length) {
      return res.json([]);
    }

    // Get existing bookings to filter out booked slots
    const bookings = await db
      .select({
        slotId: salonBookings.slotId,
        status: salonBookings.status
      })
      .from(salonBookings)
      .where(
        and(
          eq(salonBookings.businessId, businessId),
          or(
            eq(salonBookings.status, "confirmed"),
            eq(salonBookings.status, "pending")
          )
        )
      );

    // Create a set of booked slots
    const bookedSlots = new Set(bookings.map(booking => booking.slotId));

    // Filter and format available slots
    const availableSlots = slots
      .filter(({ slot }) => !bookedSlots.has(slot.id))
      .map(({ slot, service, staff }) => ({
        id: slot.id,
        startTime: format(new Date(slot.startTime), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        endTime: format(new Date(slot.endTime), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        displayTime: `${format(new Date(slot.startTime), 'h:mm a')} - ${format(new Date(slot.endTime), 'h:mm a')}`,
        service: {
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: service.price
        },
        staff: {
          id: staff.id,
          name: staff.name
        }
      }));

    console.log(`Found ${availableSlots.length} available slots for rescheduling`);
    res.json(availableSlots);
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({
      error: "Failed to fetch available slots",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;