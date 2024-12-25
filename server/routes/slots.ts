import { Router } from "express";
import { db } from "@db";
import { serviceSlots, salonServices, staffSkills, staffSchedules, shiftTemplates, salonBookings, salonStaff } from "@db/schema";
import { eq, and, gte, lte, not } from "drizzle-orm";
import { z } from "zod";
import { addMinutes, parseISO, format, isWithinInterval, startOfDay, endOfDay } from "date-fns";

const router = Router();

// Validation schemas
const generateAutoSlotsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

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

// Get slots for a business with enhanced filtering
router.get("/businesses/:businessId/slots", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { startDate, endDate, serviceId, staffId } = req.query;

    console.log("Fetching slots with params:", {
      businessId,
      startDate,
      endDate,
      serviceId,
      staffId
    });

    // Get all slots
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
      })
      .from(serviceSlots)
      .innerJoin(salonServices, eq(serviceSlots.serviceId, salonServices.id))
      .innerJoin(salonStaff, eq(serviceSlots.staffId, salonStaff.id))
      .where(
        and(
          eq(serviceSlots.businessId, businessId),
          startDate ? gte(serviceSlots.startTime, startOfDay(new Date(startDate as string))) : undefined,
          endDate ? lte(serviceSlots.endTime, endOfDay(new Date(endDate as string))) : undefined,
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

    // Filter out booked slots and format the response with 24-hour times
    const availableSlots = slots
      .filter(({ slot }) => !bookedSlots.has(slot.id))
      .map(({ slot, service, staff }) => {
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

// Generate automatic slots based on roster and service mappings
router.post("/businesses/:businessId/slots/auto-generate", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    console.log("Starting slot generation for business:", businessId);

    // Validate request body
    const validationResult = generateAutoSlotsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { startDate, endDate } = validationResult.data;
    const startDateObj = startOfDay(new Date(startDate));
    const endDateObj = endOfDay(new Date(endDate));

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

    if (staffServices.length === 0) {
      return res.status(400).json({
        error: "No staff members with assigned services found"
      });
    }

    console.log(`Found ${staffServices.length} staff-service combinations`);

    // Get schedules for the date range
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
          gte(staffSchedules.date, startDateObj),
          lte(staffSchedules.date, endDateObj),
          not(eq(shiftTemplates.type, "leave"))
        )
      );

    if (schedules.length === 0) {
      return res.status(400).json({
        error: "No staff schedules found for the selected date range"
      });
    }

    console.log(`Found ${schedules.length} schedules`);

    const slots = [];
    let totalSlotsGenerated = 0;
    const processedStaffDates = new Set(); // Track which staff-dates we've processed

    // Generate slots for each staff member and their services
    for (const { staff, service } of staffServices) {
      console.log(`Processing slots for ${staff.name} - ${service.name}`);

      // Get schedules for this staff member
      const staffSchedules = schedules.filter(
        s => s.staff_schedules.staffId === staff.id
      );

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
                status: "available",
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
        error: "No slots could be generated. Please check staff schedules and service assignments."
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