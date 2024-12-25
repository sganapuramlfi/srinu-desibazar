import { Router } from "express";
import { db } from "@db";
import { serviceSlots, salonServices, staffSkills, staffSchedules, shiftTemplates, salonBookings, salonStaff, businesses } from "@db/schema";
import { eq, and, gte, lte, not, or, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { addMinutes, parseISO, format } from "date-fns";
import { endOfDay } from 'date-fns';
import { requireAuth, hasBusinessAccess } from "../middleware/businessAccess";

function createUtcDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00Z`);
}

const router = Router();

// Helper function to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return format(date1, 'yyyy-MM-dd') === format(date2, 'yyyy-MM-dd');
};

// Helper function to normalize date to UTC midnight
const normalizeDate = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Get slots for a business with enhanced filtering
router.get("/businesses/:businessId/slots", requireAuth, hasBusinessAccess, async (req, res) => {
  try {
    console.log("Fetching slots for business:", req.params);
    const businessId = parseInt(req.params.businessId);
    let { startDate, endDate, serviceId, staffId } = req.query;

    if (!startDate || !endDate) {
      const currentDate = format(new Date(), "yyyy-MM-dd");
      startDate = currentDate;
      endDate = currentDate;
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

    // Get available slots with service, staff and booking info
    const availableSlots = await db
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
        shift: {
          startTime: shiftTemplates.startTime,
          endTime: shiftTemplates.endTime,
          type: shiftTemplates.type,
        },
        schedule: {
          date: staffSchedules.date,
        }
      })
      .from(serviceSlots)
      .innerJoin(salonServices, eq(serviceSlots.serviceId, salonServices.id))
      .innerJoin(salonStaff, eq(serviceSlots.staffId, salonStaff.id))
      .innerJoin(staffSchedules, eq(serviceSlots.staffId, staffSchedules.staffId))
      .innerJoin(shiftTemplates, eq(staffSchedules.templateId, shiftTemplates.id))
      .where(
        and(
          eq(serviceSlots.businessId, businessId),
          sql`DATE(${serviceSlots.startTime}) >= ${startDateObj.toISOString().split('T')[0]}::date`,
          sql`DATE(${serviceSlots.endTime}) <= ${endDateObj.toISOString().split('T')[0]}::date`,
          serviceId ? eq(serviceSlots.serviceId, parseInt(serviceId as string)) : undefined,
          staffId ? eq(serviceSlots.staffId, parseInt(staffId as string)) : undefined,
          eq(serviceSlots.status, "available"),
          not(eq(shiftTemplates.type, "leave"))
        )
      );

    // Get existing bookings to filter out booked slots
    const existingBookings = await db
      .select({
        slotId: salonBookings.slotId,
        status: salonBookings.status,
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
    const bookedSlots = new Set(existingBookings.map(booking => booking.slotId));

    // Filter and format available slots
    const formattedSlots = availableSlots
      .filter(({ slot }) => !bookedSlots.has(slot.id))
      .map(({ slot, service, staff, shift, schedule }) => ({
        id: slot.id,
        startTime: format(new Date(slot.startTime), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        endTime: format(new Date(slot.endTime), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        displayTime: `${format(new Date(slot.startTime), 'HH:mm')} - ${format(new Date(slot.endTime), 'HH:mm')}`,
        status: slot.status,
        service,
        staff,
        shift: {
          ...shift,
          displayTime: `${shift.startTime} - ${shift.endTime}`,
        },
        generatedFor: format(schedule.date, 'yyyy-MM-dd'),
      }));

    console.log(`Found ${formattedSlots.length} available slots`);
    res.json(formattedSlots);
  } catch (error) {
    console.error("Error fetching slots:", error);
    res.status(500).json({
      error: "Failed to fetch slots",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get available slots for rescheduling
router.get("/businesses/:businessId/slots/available", requireAuth, hasBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { date, serviceId, staffId } = req.query;

    if (!date) {
      return res.status(400).json({
        error: "Date is required",
      });
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
    const availableSlots = await db
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

    // Get existing bookings to filter out booked slots
    const existingBookings = await db
      .select({
        slotId: salonBookings.slotId,
        status: salonBookings.status,
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
    const bookedSlots = new Set(existingBookings.map(booking => booking.slotId));

    // Filter and format available slots
    const formattedSlots = availableSlots
      .filter(({ slot }) => !bookedSlots.has(slot.id))
      .map(({ slot, service, staff }) => ({
        id: slot.id,
        startTime: format(new Date(slot.startTime), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        endTime: format(new Date(slot.endTime), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        displayTime: `${format(new Date(slot.startTime), 'h:mm a')} - ${format(new Date(slot.endTime), 'h:mm a')}`,
        service,
        staff,
      }));

    console.log(`Found ${formattedSlots.length} available slots for rescheduling`);
    res.json(formattedSlots);
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({
      error: "Failed to fetch available slots",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;