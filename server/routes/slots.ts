import { Router } from "express";
import { db } from "@db";
import { 
  serviceSlots, 
  services, 
  salonStaff, 
  shiftTemplates, 
  staffSchedules,
  type Service,
  type SalonStaff 
} from "@db/schema";
import { eq, and, not, or } from "drizzle-orm";
import { z } from "zod";
import { format, parse, addMinutes, isWithinInterval } from "date-fns";
import { requireAuth } from "../middleware/businessAccess";

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
  staff: SalonStaff[],
  services: Service[],
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

  const slots: Array<{
    startTime: Date;
    endTime: Date;
    staffId: number;
    serviceId: number;
    status: "available";
  }> = [];

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

// Helper function to normalize date to UTC midnight
const normalizeDate = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Helper function to get end of day
const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

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

    // Fetch services and staff for the business
    const businessServices = await db.select().from(services).where(eq(services.businessId, businessId));
    const staffMembers = await db.select().from(salonStaff).where(eq(salonStaff.businessId, businessId));

    const availableSlots = [];
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      const daySlots = await generateAvailableSlots(businessId, d, staffMembers, businessServices);
      availableSlots.push(...daySlots);
    }

    // Get existing bookings to filter out booked slots
    const existingSlots = await db
      .select()
      .from(serviceSlots)
      .where(
        and(
          eq(serviceSlots.businessId, businessId),
          or(
            eq(serviceSlots.status, "booked"),
            eq(serviceSlots.status, "blocked")
          )
        )
      );

    // Create a set of booked slots
    const bookedSlots = new Set(existingSlots.map(slot => 
      `${slot.staffId}-${format(slot.startTime, "yyyy-MM-dd'T'HH:mm")}`
    ));

    // Filter and format available slots
    const filteredSlots = availableSlots.filter(slot => 
      !bookedSlots.has(`${slot.staffId}-${format(slot.startTime, "yyyy-MM-dd'T'HH:mm")}`)
    );

    const finalSlots = await Promise.all(filteredSlots.map(async (slot) => {
      const service = businessServices.find(s => s.id === slot.serviceId);
      const staff = staffMembers.find(s => s.id === slot.staffId);

      return {
        startTime: format(slot.startTime, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        endTime: format(slot.endTime, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        displayTime: `${format(slot.startTime, 'h:mm a')} - ${format(slot.endTime, 'h:mm a')}`,
        status: slot.status,
        service,
        staff
      };
    }));

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

    // Fetch services and staff for the business
    const businessServices = await db.select().from(services).where(eq(services.businessId, businessId));
    const staffMembers = await db.select().from(salonStaff).where(eq(salonStaff.businessId, businessId));

    const availableSlots = await generateAvailableSlots(businessId, startDateObj, staffMembers, businessServices);

    // Get existing bookings to filter out booked slots
    const existingSlots = await db
      .select()
      .from(serviceSlots)
      .where(
        and(
          eq(serviceSlots.businessId, businessId),
          or(
            eq(serviceSlots.status, "booked"),
            eq(serviceSlots.status, "blocked")
          )
        )
      );

    // Create a set of booked slots
    const bookedSlots = new Set(existingSlots.map(slot => 
      `${slot.staffId}-${format(slot.startTime, "yyyy-MM-dd'T'HH:mm")}`
    ));

    // Filter and format available slots
    const filteredSlots = availableSlots.filter(slot => 
      !bookedSlots.has(`${slot.staffId}-${format(slot.startTime, "yyyy-MM-dd'T'HH:mm")}`)
    );

    const finalSlots = await Promise.all(filteredSlots.map(async (slot) => {
      const service = businessServices.find(s => s.id === slot.serviceId);
      const staff = staffMembers.find(s => s.id === slot.staffId);

      return {
        startTime: format(slot.startTime, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        endTime: format(slot.endTime, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        displayTime: `${format(slot.startTime, 'h:mm a')} - ${format(slot.endTime, 'h:mm a')}`,
        service,
        staff
      };
    }));

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

export default router;