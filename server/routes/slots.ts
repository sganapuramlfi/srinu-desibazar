import { Router } from "express";
import { db } from "@db";
import { serviceSlots, salonServices, staffSkills, staffSchedules, shiftTemplates, salonBookings, salonStaff } from "@db/schema";
import { eq, and, gte, lte, not, isNull } from "drizzle-orm";
import { z } from "zod";
import { addMinutes, parseISO, format, startOfDay, endOfDay, addDays } from "date-fns";

const router = Router();

// Helper function to format date-time in 24-hour format with timezone
const formatDateTime = (date: Date) => {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss'Z'");
};

// Helper function to create a proper Date object with timezone
const createDateFromTime = (date: string, time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const baseDate = new Date(date);
  baseDate.setUTCHours(hours, minutes, 0, 0);
  return baseDate;
};

// Authentication middleware
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    console.error("Authentication failed: User not authenticated");
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Get slots for a business with enhanced filtering
router.get("/businesses/:businessId/slots", isAuthenticated, async (req, res) => {
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

    console.log("Fetching slots with params:", {
      businessId,
      startDate: format(startDateObj, 'yyyy-MM-dd'),
      endDate: format(endDateObj, 'yyyy-MM-dd'),
      serviceId,
      staffId
    });

    // Get schedules for the date range
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

    // Get slots with shift information
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

    // Get existing bookings
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

    // Filter and format available slots
    const availableSlots = slots
      .filter(({ slot, staff, schedule }) => {
        if (bookedSlots.has(slot.id)) return false;

        const dateKey = format(schedule.date, 'yyyy-MM-dd');
        const staffSchedule = validSchedules.get(dateKey)?.get(staff.id);
        if (!staffSchedule) return false;

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
router.post("/businesses/:businessId/slots/auto-generate", isAuthenticated, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    console.log("\nStarting slot generation for business:", businessId);

    // Validate request body
    const generateAutoSlotsSchema = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });

    const validationResult = generateAutoSlotsSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error);
      return res.status(400).json({
        error: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { startDate } = validationResult.data;
    const startDateObj = startOfDay(new Date(startDate));
    console.log("Processing date:", format(startDateObj, 'yyyy-MM-dd'));

    // Get staff with their services
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
        staffSchedule: staffSchedules,
        shiftTemplate: shiftTemplates,
      })
      .from(staffSchedules)
      .innerJoin(
        shiftTemplates,
        and(
          eq(staffSchedules.templateId, shiftTemplates.id),
          eq(shiftTemplates.businessId, businessId),
          not(eq(shiftTemplates.type, "leave"))
        )
      )
      .where(
        and(
          eq(staffSchedules.date, startDateObj)
        )
      );

    console.log("Schedules found:", schedules.map(s => ({
      date: format(s.staffSchedule.date, 'yyyy-MM-dd'),
      staffId: s.staffSchedule.staffId,
      templateId: s.staffSchedule.templateId,
      shiftType: s.shiftTemplate.type,
      shiftTime: `${s.shiftTemplate.startTime}-${s.shiftTemplate.endTime}`
    })));

    if (schedules.length === 0) {
      // Debug: Check nearby schedules
      const nearbySchedules = await db
        .select({
          date: staffSchedules.date,
          staffId: staffSchedules.staffId,
          templateId: staffSchedules.templateId,
          shiftType: shiftTemplates.type,
        })
        .from(staffSchedules)
        .innerJoin(
          shiftTemplates,
          and(
            eq(staffSchedules.templateId, shiftTemplates.id),
            eq(shiftTemplates.businessId, businessId),
            not(eq(shiftTemplates.type, "leave"))
          )
        )
        .where(
          and(
            gte(staffSchedules.date, startOfDay(new Date(startDate))),
            lte(staffSchedules.date, addDays(startOfDay(new Date(startDate)), 7))
          )
        );

      console.log("Debug - Nearby schedules:", nearbySchedules);

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
      const staffSchedules = schedules.filter(s => s.staffSchedule.staffId === staff.id);

      if (staffSchedules.length === 0) {
        console.log(`No schedules found for ${staff.name} on ${startDate}`);
        continue;
      }

      for (const schedule of staffSchedules) {
        const scheduleDate = format(schedule.staffSchedule.date, "yyyy-MM-dd");
        const staffDateKey = `${staff.id}-${scheduleDate}`;

        if (processedStaffDates.has(staffDateKey)) {
          console.log(`Already processed slots for ${staff.name} on ${scheduleDate}`);
          continue;
        }

        console.log(`Generating slots for ${scheduleDate} from ${schedule.shiftTemplate.startTime} to ${schedule.shiftTemplate.endTime}`);

        const shiftStart = createDateFromTime(scheduleDate, schedule.shiftTemplate.startTime);
        const shiftEnd = createDateFromTime(scheduleDate, schedule.shiftTemplate.endTime);

        let currentTime = shiftStart;
        while (currentTime < shiftEnd) {
          const slotEnd = addMinutes(currentTime, service.duration);

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

          currentTime = addMinutes(currentTime, 15);
        }

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