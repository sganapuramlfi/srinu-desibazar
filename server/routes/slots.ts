import { Router } from "express";
import { db } from "@db";
import { serviceSlots, salonServices, staffSkills, staffSchedules, shiftTemplates, salonBookings, salonStaff } from "@db/schema";
import { eq, and, gte, lte, not } from "drizzle-orm";
import { z } from "zod";
import { addMinutes, parseISO, format, isWithinInterval, startOfDay, endOfDay } from "date-fns";

const router = Router();

// Helper function to format date-time in 24-hour format
const formatDateTime = (date: Date) => {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss'Z'");
};

// Helper function to create a proper Date object
const createDateFromTime = (date: string, time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

// Get slots for a business with enhanced filtering and required date parameter
router.get("/businesses/:businessId/slots", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    let { startDate, endDate, serviceId, staffId } = req.query;

    // Default to current date if no dates provided
    if (!startDate || !endDate) {
      const currentDate = format(new Date(), "yyyy-MM-dd");
      startDate = currentDate;
      endDate = currentDate;
    }

    const startDateObj = startOfDay(new Date(startDate as string));
    const endDateObj = endOfDay(new Date(endDate as string));

    // Validate date range (max 7 days to prevent performance issues)
    const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 7) {
      return res.status(400).json({
        error: "Invalid date range",
        details: "Date range cannot exceed 7 days"
      });
    }

    console.log("Fetching slots with params:", {
      businessId,
      startDate: format(startDateObj, 'yyyy-MM-dd'),
      endDate: format(endDateObj, 'yyyy-MM-dd'),
      serviceId,
      staffId
    });

    // First get all valid schedules for the date range
    const schedules = await db
      .select({
        staffId: staffSchedules.staffId,
        date: staffSchedules.date,
        shiftStartTime: shiftTemplates.startTime,
        shiftEndTime: shiftTemplates.endTime,
        shiftType: shiftTemplates.type,
      })
      .from(staffSchedules)
      .innerJoin(shiftTemplates, eq(staffSchedules.templateId, shiftTemplates.id))
      .where(
        and(
          eq(shiftTemplates.businessId, businessId),
          gte(staffSchedules.date, startDateObj),
          lte(staffSchedules.date, endDateObj),
          not(eq(shiftTemplates.type, "leave"))
        )
      );

    // Create a map of valid schedules by date and staff
    const validSchedules = new Map();
    schedules.forEach(schedule => {
      const dateKey = format(schedule.date, 'yyyy-MM-dd');
      if (!validSchedules.has(dateKey)) {
        validSchedules.set(dateKey, new Map());
      }
      validSchedules.get(dateKey).set(schedule.staffId, schedule);
    });

    // Get slots with shift information, using date range filtering
    const slots = await db
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
          gte(serviceSlots.startTime, startDateObj),
          lte(serviceSlots.endTime, endDateObj),
          serviceId ? eq(serviceSlots.serviceId, parseInt(serviceId as string)) : undefined,
          staffId ? eq(serviceSlots.staffId, parseInt(staffId as string)) : undefined,
          eq(serviceSlots.status, "available")
        )
      );

    // Get existing bookings for these slots
    const existingBookings = await db
      .select({
        slotId: salonBookings.slotId,
        status: salonBookings.status,
      })
      .from(salonBookings)
      .where(
        and(
          eq(salonBookings.businessId, businessId),
          not(eq(salonBookings.status, "cancelled"))
        )
      );

    // Create a map of booked slots
    const bookedSlots = new Set(
      existingBookings
        .filter(booking => booking.status === "confirmed" || booking.status === "pending")
        .map(booking => booking.slotId)
    );

    // Filter out booked slots and slots outside of valid schedules
    const availableSlots = slots
      .filter(({ slot, staff, schedule }) => {
        // Check if slot is not booked
        if (bookedSlots.has(slot.id)) return false;

        // Check if slot is within a valid schedule
        const dateKey = format(schedule.date, 'yyyy-MM-dd');
        const staffSchedule = validSchedules.get(dateKey)?.get(staff.id);
        if (!staffSchedule) return false;

        // Check if slot time is within shift hours
        const slotStart = new Date(slot.startTime);
        const shiftStart = createDateFromTime(dateKey, staffSchedule.shiftStartTime);
        const shiftEnd = createDateFromTime(dateKey, staffSchedule.shiftEndTime);

        return slotStart >= shiftStart && slotStart <= shiftEnd;
      })
      .map(({ slot, service, staff, shift, schedule }) => {
        const startTime = new Date(slot.startTime);
        const endTime = new Date(slot.endTime);

        return {
          id: slot.id,
          startTime: formatDateTime(startTime),
          endTime: formatDateTime(endTime),
          displayTime: `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`,
          status: slot.status,
          service,
          staff,
          shift: {
            ...shift,
            displayTime: `${shift.startTime} - ${shift.endTime}`,
          },
          generatedFor: format(schedule.date, 'yyyy-MM-dd'),
        };
      });

    console.log(`Found ${availableSlots.length} available slots out of ${slots.length} total slots`);
    res.json(availableSlots);
  } catch (error) {
    console.error("Error fetching slots:", error);
    res.status(500).json({
      error: "Failed to fetch slots",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Auto-generate slots based on roster and service mappings
router.post("/businesses/:businessId/slots/auto-generate", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    console.log("Starting slot generation for business:", businessId);

    // Validate request body
    const generateAutoSlotsSchema = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });

    const validationResult = generateAutoSlotsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { startDate } = validationResult.data;
    const startDateObj = startOfDay(new Date(startDate));

    // Get staff with their services and schedules
    console.log("Fetching staff skills and services...");
    const staffServices = await db
      .select({
        staff: {
          id: salonStaff.id,
          name: salonStaff.name,
        },
        service: {
          id: salonServices.id,
          name: salonServices.name,
          duration: salonServices.duration,
        },
      })
      .from(staffSkills)
      .innerJoin(salonStaff, eq(staffSkills.staffId, salonStaff.id))
      .innerJoin(salonServices, eq(staffSkills.serviceId, salonServices.id))
      .where(
        and(
          eq(salonStaff.businessId, businessId),
          eq(salonServices.businessId, businessId)
        )
      );

    console.log(`Found ${staffServices.length} staff-service combinations`);

    if (staffServices.length === 0) {
      return res.status(400).json({
        error: "No staff members with assigned services found"
      });
    }

    // Get schedules for the specific date
    console.log("Fetching staff schedules...");
    const schedules = await db
      .select({
        staff_schedules: staffSchedules,
        shift_templates: shiftTemplates,
      })
      .from(staffSchedules)
      .innerJoin(shiftTemplates, eq(staffSchedules.templateId, shiftTemplates.id))
      .where(
        and(
          eq(shiftTemplates.businessId, businessId),
          eq(staffSchedules.date, startDateObj),
          not(eq(shiftTemplates.type, "leave"))
        )
      );

    console.log(`Found ${schedules.length} schedules`);

    if (schedules.length === 0) {
      return res.status(400).json({
        error: "No staff schedules found for the selected date",
        details: `No schedules found for ${startDate}`
      });
    }

    const slots = [];
    let totalSlotsGenerated = 0;
    const processedStaffDates = new Set();

    // Generate slots for each staff member and their services
    for (const { staff, service } of staffServices) {
      console.log(`Processing slots for ${staff.name} - ${service.name}`);

      // Get schedules for this staff member
      const staffSchedules = schedules.filter(
        s => s.staff_schedules.staffId === staff.id
      );

      if (staffSchedules.length === 0) {
        console.log(`No schedules found for ${staff.name} on ${startDate}`);
        continue;
      }

      for (const schedule of staffSchedules) {
        const scheduleDate = format(schedule.staff_schedules.date, "yyyy-MM-dd");
        const staffDateKey = `${staff.id}-${scheduleDate}`;

        // Skip if we've already processed this staff member for this date
        if (processedStaffDates.has(staffDateKey)) {
          console.log(`Already processed slots for ${staff.name} on ${scheduleDate}`);
          continue;
        }

        const shiftStart = createDateFromTime(scheduleDate, schedule.shift_templates.startTime);
        const shiftEnd = createDateFromTime(scheduleDate, schedule.shift_templates.endTime);

        console.log(`Generating slots for ${scheduleDate} from ${schedule.shift_templates.startTime} to ${schedule.shift_templates.endTime}`);

        let currentTime = shiftStart;
        while (currentTime < shiftEnd) {
          // Check for breaks
          const isBreakTime = schedule.shift_templates.breaks?.some(breakTime => {
            const breakStart = createDateFromTime(scheduleDate, breakTime.startTime);
            const breakEnd = createDateFromTime(scheduleDate, breakTime.endTime);
            return isWithinInterval(currentTime, { start: breakStart, end: breakEnd });
          }) ?? false;

          if (!isBreakTime) {
            const slotEnd = addMinutes(currentTime, service.duration);

            // Only create slot if it fits within shift
            if (slotEnd <= shiftEnd) {
              slots.push({
                businessId,
                serviceId: service.id,
                staffId: staff.id,
                startTime: currentTime,
                endTime: slotEnd,
                status: "available" as const,
                isManual: false,
                conflictingSlotIds: [],
              });
              totalSlotsGenerated++;
            }
          }

          // Move to next potential slot start time (15-minute increments)
          currentTime = addMinutes(currentTime, 15);
        }

        // Mark this staff-date combination as processed
        processedStaffDates.add(staffDateKey);
      }
    }

    console.log(`Generated ${totalSlotsGenerated} total slots`);

    if (slots.length === 0) {
      return res.status(400).json({
        error: "No slots could be generated",
        details: "Please check staff schedules and service assignments."
      });
    }

    try {
      // Insert all generated slots
      console.log("Inserting generated slots into database...");
      const createdSlots = await db.insert(serviceSlots).values(slots).returning();
      console.log(`Successfully inserted ${createdSlots.length} slots`);
      res.json(createdSlots);
    } catch (insertError) {
      console.error("Error inserting slots:", insertError);
      res.status(500).json({
        error: "Failed to save generated slots",
        details: insertError instanceof Error ? insertError.message : "Unknown error"
      });
    }
  } catch (error) {
    console.error("Error generating slots:", error);
    res.status(500).json({
      error: "Failed to generate slots",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;