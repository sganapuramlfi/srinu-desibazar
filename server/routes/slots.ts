function createUtcDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00Z`);
}

import { Router } from "express";
import { db } from "@db";
import { serviceSlots, salonServices, staffSkills, staffSchedules, shiftTemplates, salonBookings, salonStaff, businesses } from "@db/schema";
import { eq, and, gte, lte, not, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { addMinutes, parseISO, format } from "date-fns";
import { endOfDay } from 'date-fns';

// Authentication middleware
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Business ownership middleware
const isBusinessOwner = async (req: any, res: any, next: any) => {
  const businessId = parseInt(req.params.businessId);
  const userId = req.user?.id;

  if (!businessId || !userId) {
    return res.status(400).json({ error: "Invalid business ID or user not authenticated" });
  }

  try {
    const [business] = await db
      .select()
      .from(businesses)
      .where(and(
        eq(businesses.id, businessId),
        eq(businesses.userId, userId)
      ))
      .limit(1);

    if (!business) {
      return res.status(403).json({ error: "Not authorized to access this business" });
    }

    next();
  } catch (error) {
    console.error("Business ownership check error:", error);
    res.status(500).json({ error: "Failed to verify business ownership" });
  }
};

const router = Router();

// Auto-generate slots based on roster and service mappings
router.post("/businesses/:businessId/slots/auto-generate", isAuthenticated, isBusinessOwner, async (req, res) => {
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
    console.log("Processing date:", startDate);

    // Get active staff with their services
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
          eq(salonServices.businessId, businessId),
          eq(salonServices.isActive, true)
        )
      );

    console.log(`Found ${staffServices.length} staff-service combinations`);

    if (staffServices.length === 0) {
      return res.status(400).json({
        error: "No staff members with assigned services found"
      });
    }

    // Get active schedules for the target date
    console.log("Fetching staff schedules...");
    const schedules = await db
      .select({
        staffId: staffSchedules.staffId,
        templateId: staffSchedules.templateId,
        type: shiftTemplates.type,
        startTime: shiftTemplates.startTime,
        endTime: shiftTemplates.endTime,
      })
      .from(staffSchedules)
      .innerJoin(shiftTemplates, eq(staffSchedules.templateId, shiftTemplates.id))
      .innerJoin(salonStaff, eq(staffSchedules.staffId, salonStaff.id))
      .where(
        and(
          eq(salonStaff.businessId, businessId),
          eq(shiftTemplates.businessId, businessId),
          sql`DATE(${staffSchedules.date}) = ${startDate}::date`,
          not(eq(shiftTemplates.type, 'leave'))
        )
      );

    console.log(`Found ${schedules.length} schedules for date ${startDate}`);

    if (schedules.length === 0) {
      // Check for staff on leave
      const leaveSchedules = await db
        .select({
          staffId: staffSchedules.staffId,
          staffName: salonStaff.name,
        })
        .from(staffSchedules)
        .innerJoin(shiftTemplates, eq(staffSchedules.templateId, shiftTemplates.id))
        .innerJoin(salonStaff, eq(staffSchedules.staffId, salonStaff.id))
        .where(
          and(
            eq(salonStaff.businessId, businessId),
            eq(shiftTemplates.businessId, businessId),
            sql`DATE(${staffSchedules.date}) = ${startDate}::date`,
            eq(shiftTemplates.type, 'leave')
          )
        );

      console.log("Found", leaveSchedules.length, "staff members on leave");

      if (leaveSchedules.length > 0) {
        const staffOnLeave = leaveSchedules.map(s => s.staffName).join(', ');
        return res.status(400).json({
          error: "Staff members are on leave",
          details: `The following staff are on leave for ${startDate}: ${staffOnLeave}`
        });
      }

      return res.status(400).json({
        error: "No staff schedules found",
        details: `No schedules found for ${startDate}`
      });
    }

    // Generate slots for each staff member and their services
    const slots = [];
    let totalSlotsGenerated = 0;

    for (const { staff, service } of staffServices) {
      // Get schedules for this staff member
      const staffSchedules = schedules.filter(s => s.staffId === staff.id);

      if (staffSchedules.length === 0) {
        console.log(`No active schedules found for ${staff.name} on ${startDate}`);
        continue;
      }

      for (const schedule of staffSchedules) {
        console.log(`Generating slots for ${staff.name} on ${startDate} from ${schedule.startTime} to ${schedule.endTime}`);

        // Create UTC dates for shift start and end
        const shiftStart = new Date(`${startDate}T${schedule.startTime}:00Z`);
        const shiftEnd = new Date(`${startDate}T${schedule.endTime}:00Z`);

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
      }
    }

    console.log(`Generated ${totalSlotsGenerated} total slots`);

    if (slots.length === 0) {
      return res.status(400).json({
        error: "No slots could be generated",
        details: "Please check staff schedules and service assignments"
      });
    }

    // Insert the generated slots
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
router.get("/businesses/:businessId/slots", isAuthenticated, isBusinessOwner, async (req, res) => {
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
          sql`DATE(${staffSchedules.date}) >= ${startDateObj.toISOString().split('T')[0]}::date AND DATE(${staffSchedules.date}) <= ${endDateObj.toISOString().split('T')[0]}::date`,
          not(eq(shiftTemplates.type, "leave")),
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
          sql`DATE(${serviceSlots.startTime}) >= ${startDateObj.toISOString().split('T')[0]}::date AND DATE(${serviceSlots.endTime}) <= ${endDateObj.toISOString().split('T')[0]}::date`,
          serviceId ? eq(serviceSlots.serviceId, parseInt(serviceId as string)) : undefined,
          staffId ? eq(serviceSlots.staffId, parseInt(staffId as string)) : undefined,
          eq(serviceSlots.status, "available"),
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