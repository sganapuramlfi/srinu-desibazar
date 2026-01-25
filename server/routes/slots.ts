import { Router } from "express";
// 🚨 CRITICAL: Route files are in /app/routes/, so db is at ../../db/
// See DOCKER-PATHS.md for full path documentation
import { db } from "../../db/index.js";
import { serviceSlots, salonServices, salonStaff, shiftTemplates, staffSchedules } from "../../db/schema.js";
import { eq, and, not, or, sql } from "drizzle-orm";
import { z } from "zod";
import { format, parse, addMinutes, isWithinInterval } from "date-fns";
import { requireAuth, hasBusinessAccess } from "../middleware/businessAccess";

const router = Router();

// Helper function to check if a time slot overlaps with any break
function isBreakTime(timeSlot: Date, breaks: Array<{ startTime: string; endTime: string }>, shiftStart: string): boolean {
  const shiftDate = timeSlot.toISOString().split('T')[0];

  return breaks.some(breakPeriod => {
    const breakStart = new Date(`${shiftDate}T${breakPeriod.startTime}:00`);
    const breakEnd = new Date(`${shiftDate}T${breakPeriod.endTime}:00`);
    return isWithinInterval(timeSlot, { start: breakStart, end: breakEnd });
  });
}

// Helper function to generate available slots considering breaks
async function generateAvailableSlots(
  businessId: number,
  date: Date,
  staff: Array<{ id: number; name: string }>,
  services: Array<{ id: number; duration: number }>,
) {
  // Get staff schedules for the date
  const schedules = await db
    .select({
      schedule: staffSchedules,
      template: shiftTemplates,
    })
    .from(staffSchedules)
    .innerJoin(shiftTemplates, eq(staffSchedules.templateId, shiftTemplates.id))
    .where(
      and(
        eq(shiftTemplates.businessId, businessId),
        eq(staffSchedules.date, date),
        eq(staffSchedules.status, "scheduled")
      )
    );

  const slots: any[] = [];

  for (const { schedule, template } of schedules) {
    const shiftDate = format(date, 'yyyy-MM-dd');
    const shiftStart = new Date(`${shiftDate}T${template.startTime}:00`);
    const shiftEnd = new Date(`${shiftDate}T${template.endTime}:00`);
    const breaks = template.breaks || [];

    // Generate slots for each service duration
    for (const service of services) {
      let currentTime = shiftStart;

      while (addMinutes(currentTime, service.duration) <= shiftEnd) {
        // Skip if the time slot overlaps with any break
        if (!isBreakTime(currentTime, breaks, template.startTime)) {
          slots.push({
            startTime: currentTime,
            endTime: addMinutes(currentTime, service.duration),
            staffId: schedule.staffId,
            serviceId: service.id,
            status: "available",
          });
        }
        currentTime = addMinutes(currentTime, 15); // 15-minute intervals
      }
    }
  }

  return slots;
}

// Get slots for a business with enhanced filtering
router.get("/businesses/:businessId/slots", requireAuth, async (req, res) => {
  try {
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


    // Fetch services and staff for the business.  This is needed for generateAvailableSlots.
    const services = await db.select().from(salonServices).where(eq(salonServices.businessId, businessId));
    const staffMembers = await db.select().from(salonStaff).where(eq(salonStaff.businessId, businessId));

    const availableSlots = [];
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        const daySlots = await generateAvailableSlots(businessId, d, staffMembers, services);
        availableSlots.push(...daySlots);
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

    // Filter and format available slots.  We need to map the generated slots to include service and staff details.
    const filteredSlots = availableSlots.filter(slot => !bookedSlots.has(slot.id));

    const finalSlots = await Promise.all(filteredSlots.map(async (slot) => {
        const service = await db.select().from(salonServices).where(eq(salonServices.id, slot.serviceId)).first();
        const staff = await db.select().from(salonStaff).where(eq(salonStaff.id, slot.staffId)).first();

        return {
            id: slot.id, // You'll need a way to generate IDs for these slots
            startTime: format(slot.startTime, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
            endTime: format(slot.endTime, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
            displayTime: `${format(slot.startTime, 'h:mm a')} - ${format(slot.endTime, 'h:mm a')}`,
            status: slot.status,
            service: service,
            staff: staff
        }
    }))

    console.log(`Found ${finalSlots.length} available slots`);
    res.json(finalSlots);
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

    // Fetch services and staff for the business.  This is needed for generateAvailableSlots.
    const services = await db.select().from(salonServices).where(eq(salonServices.businessId, businessId));
    const staffMembers = await db.select().from(salonStaff).where(eq(salonStaff.businessId, businessId));

    const availableSlots = await generateAvailableSlots(businessId, startDateObj, staffMembers, services);


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
    const filteredSlots = availableSlots.filter(slot => !bookedSlots.has(slot.id));

    const finalSlots = await Promise.all(filteredSlots.map(async (slot) => {
        const service = await db.select().from(salonServices).where(eq(salonServices.id, slot.serviceId)).first();
        const staff = await db.select().from(salonStaff).where(eq(salonStaff.id, slot.staffId)).first();

        return {
            id: slot.id, // You'll need a way to generate IDs for these slots
            startTime: format(slot.startTime, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
            endTime: format(slot.endTime, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
            displayTime: `${format(slot.startTime, 'h:mm a')} - ${format(slot.endTime, 'h:mm a')}`,
            service: service,
            staff: staff
        }
    }))


    console.log(`Found ${finalSlots.length} available slots for rescheduling`);
    res.json(finalSlots);
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({
      error: "Failed to fetch available slots",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Helper function to normalize date to UTC midnight
const normalizeDate = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export default router;

// Helper function to get the end of the day
const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};