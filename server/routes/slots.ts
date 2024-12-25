import { Router } from "express";
import { db } from "@db";
import { serviceSlots, salonServices, staffSkills, staffSchedules, shiftTemplates, salonBookings, salonStaff } from "@db/schema";
import { eq, and, gte, lte, not, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { addMinutes, parseISO, format, startOfDay, endOfDay, addDays } from "date-fns";

const router = Router();

// Authentication middleware
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Helper function to format date-time in UTC
const formatDateTime = (date: Date) => {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss'Z'");
};

// Helper function to normalize date to start of day in UTC
const normalizeDate = (date: Date): Date => {
  return startOfDay(new Date(date.toISOString().split('T')[0]));
};

// Helper function to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return format(date1, 'yyyy-MM-dd') === format(date2, 'yyyy-MM-dd');
};

// Helper function to create UTC Date from time
const createUtcDate = (dateStr: string, timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const baseDate = startOfDay(new Date(dateStr));
  baseDate.setUTCHours(hours, minutes, 0, 0);
  return baseDate;
};

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
    const targetDate = normalizeDate(new Date(startDate));
    console.log("Processing date:", format(targetDate, 'yyyy-MM-dd'));

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

    // Get all schedules for the target date without filtering leave
    console.log("Fetching staff schedules...");
    const allSchedules = await db
      .select()
      .from(staffSchedules)
      .innerJoin(shiftTemplates, eq(staffSchedules.templateId, shiftTemplates.id))
      .where(
        and(
          eq(shiftTemplates.businessId, businessId),
          sql`DATE(${staffSchedules.date}) = ${sql.raw('?')}::date`,
          targetDate.toISOString().split('T')[0]
        )
      );

    console.log(`Found ${allSchedules.length} total schedules for date ${startDate}`);

    // Filter out staff on leave
    const schedules = allSchedules.filter(schedule => schedule.shiftTemplates.type !== 'leave');
    const staffOnLeave = allSchedules
      .filter(schedule => schedule.shiftTemplates.type === 'leave')
      .map(schedule => schedule.staffSchedules.staffId);

    console.log(`Found ${schedules.length} active schedules (${staffOnLeave.length} staff on leave)`);

    if (schedules.length === 0) {
      // Get nearby schedules to help with debugging
      const nearbySchedules = await db
        .select({
          date: staffSchedules.date,
          staffId: staffSchedules.staffId,
          templateId: staffSchedules.templateId,
        })
        .from(staffSchedules)
        .innerJoin(shiftTemplates, eq(staffSchedules.templateId, shiftTemplates.id))
        .where(
          and(
            eq(shiftTemplates.businessId, businessId),
            sql`DATE(${staffSchedules.date}) >= ${sql.raw('?')}::date`,
            sql`DATE(${staffSchedules.date}) <= ${sql.raw('?')}::date`,
            targetDate.toISOString().split('T')[0],
            addDays(targetDate, 7).toISOString().split('T')[0]
          )
        );

      console.log("Nearby schedules:", nearbySchedules);

      return res.status(400).json({
        error: "No active staff schedules found for the selected date",
        details: `No schedules found for ${startDate}. ${staffOnLeave.length} staff member(s) are on leave.`
      });
    }

    const slots = [];
    let totalSlotsGenerated = 0;
    const processedStaffDates = new Set();

    // Generate slots for each staff member and their services
    for (const { staff, service } of staffServices) {
      console.log(`Processing slots for ${staff.name} - ${service.name}`);

      // Skip if staff is on leave
      if (staffOnLeave.includes(staff.id)) {
        console.log(`Skipping ${staff.name} as they are on leave`);
        continue;
      }

      // Get schedules for this staff member
      const staffSchedules = schedules.filter(s => s.staffSchedules.staffId === staff.id);

      if (staffSchedules.length === 0) {
        console.log(`No schedules found for ${staff.name} on ${startDate}`);
        continue;
      }

      for (const schedule of staffSchedules) {
        const scheduleDate = format(schedule.staffSchedules.date, "yyyy-MM-dd");
        const staffDateKey = `${staff.id}-${scheduleDate}`;

        if (processedStaffDates.has(staffDateKey)) {
          console.log(`Already processed slots for ${staff.name} on ${scheduleDate}`);
          continue;
        }

        console.log(`Generating slots for ${scheduleDate} from ${schedule.shiftTemplates.startTime} to ${schedule.shiftTemplates.endTime}`);

        const shiftStart = createUtcDate(scheduleDate, schedule.shiftTemplates.startTime);
        const shiftEnd = createUtcDate(scheduleDate, schedule.shiftTemplates.endTime);

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
            });
            totalSlotsGenerated++;
          }

          currentTime = addMinutes(currentTime, 15); // 15-minute intervals
        }

        processedStaffDates.add(staffDateKey);
      }
    }

    console.log(`Generated ${totalSlotsGenerated} total slots`);

    if (slots.length === 0) {
      return res.status(400).json({
        error: "No slots could be generated",
        details: "Please check staff schedules and service assignments"
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

// Get slots for a business with enhanced filtering
router.get("/businesses/:businessId/slots", isAuthenticated, async (req, res) => {
  try {
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

    // Get schedules for the date range using SQL DATE() function
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
          sql`DATE(${staffSchedules.date}) >= ${sql.raw('?')}::date`,
          sql`DATE(${staffSchedules.date}) <= ${sql.raw('?')}::date`,
          not(eq(shiftTemplates.type, "leave")),
          startDateObj.toISOString().split('T')[0],
          endDateObj.toISOString().split('T')[0]
        )
      );

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
          sql`DATE(${serviceSlots.startTime}) >= ${sql.raw('?')}::date`,
          sql`DATE(${serviceSlots.endTime}) <= ${sql.raw('?')}::date`,
          serviceId ? eq(serviceSlots.serviceId, parseInt(serviceId as string)) : undefined,
          staffId ? eq(serviceSlots.staffId, parseInt(staffId as string)) : undefined,
          eq(serviceSlots.status, "available"),
          startDateObj.toISOString().split('T')[0],
          endDateObj.toISOString().split('T')[0]
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

        const scheduleDate = format(schedule.date, 'yyyy-MM-dd');
        const staffSchedule = schedules.find(s => 
          s.staffId === staff.id && 
          isSameDay(s.date, schedule.date)
        );

        if (!staffSchedule) return false;

        const slotStart = new Date(slot.startTime);
        const shiftStart = createUtcDate(scheduleDate, staffSchedule.shiftStartTime);
        const shiftEnd = createUtcDate(scheduleDate, staffSchedule.shiftEndTime);

        return slotStart >= shiftStart && slotStart <= shiftEnd;
      })
      .map(({ slot, service, staff, shift, schedule }) => ({
        id: slot.id,
        startTime: formatDateTime(new Date(slot.startTime)),
        endTime: formatDateTime(new Date(slot.endTime)),
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

export default router;