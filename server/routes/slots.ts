import { Router } from "express";
import { db } from "@db";
import { serviceSlots, salonServices, staffSkills, staffSchedules, shiftTemplates, salonBookings } from "@db/schema";
import { eq, and, gte, lte, not, or } from "drizzle-orm";
import { z } from "zod";
import { addMinutes, parseISO, format, isWithinInterval } from "date-fns";

const router = Router();

// Validation schemas
const createManualSlotSchema = z.object({
  serviceId: z.number(),
  staffId: z.number(),
  startTime: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  endTime: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  status: z.enum(["available", "blocked"]).default("available"),
});

const generateAutoSlotsSchema = z.object({
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
});

// Get slots for a business with enhanced filtering
router.get("/businesses/:businessId/slots", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const { startDate, endDate, serviceId, staffId } = req.query;

    // Fetch existing bookings to check availability
    const existingBookings = await db
      .select()
      .from(salonBookings)
      .where(
        and(
          eq(salonBookings.businessId, businessId),
          startDate ? gte(salonBookings.createdAt, new Date(startDate as string)) : undefined,
          endDate ? lte(salonBookings.createdAt, new Date(endDate as string)) : undefined
        )
      );

    const slots = await db
      .select({
        slot: serviceSlots,
        service: {
          id: salonServices.id,
          name: salonServices.name,
          duration: salonServices.duration,
        },
        staff: {
          id: staffSchedules.staffId,
          templateId: staffSchedules.templateId,
        },
        template: {
          startTime: shiftTemplates.startTime,
          endTime: shiftTemplates.endTime,
          breaks: shiftTemplates.breaks,
        },
      })
      .from(serviceSlots)
      .innerJoin(salonServices, eq(serviceSlots.serviceId, salonServices.id))
      .innerJoin(staffSchedules, eq(serviceSlots.staffId, staffSchedules.staffId))
      .innerJoin(shiftTemplates, eq(staffSchedules.templateId, shiftTemplates.id))
      .where(
        and(
          eq(salonServices.businessId, businessId),
          startDate ? gte(serviceSlots.startTime, new Date(startDate as string)) : undefined,
          endDate ? lte(serviceSlots.endTime, new Date(endDate as string)) : undefined,
          serviceId ? eq(serviceSlots.serviceId, parseInt(serviceId as string)) : undefined,
          staffId ? eq(serviceSlots.staffId, parseInt(staffId as string)) : undefined
        )
      );

    // Filter out slots that conflict with existing bookings
    const availableSlots = slots.filter(slot => {
      const hasConflict = existingBookings.some(booking =>
        isWithinInterval(slot.slot.startTime, {
          start: booking.startTime,
          end: booking.endTime
        }) ||
        isWithinInterval(slot.slot.endTime, {
          start: booking.startTime,
          end: booking.endTime
        })
      );
      return !hasConflict;
    });

    res.json(availableSlots);
  } catch (error) {
    console.error("Error fetching slots:", error);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

// Create a manual slot
router.post("/businesses/:businessId/slots/manual", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);

    // Validate request body
    const validationResult = createManualSlotSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { serviceId, staffId, startTime, endTime, status } = validationResult.data;

    // Verify staff is qualified for the service
    const [staffSkill] = await db
      .select()
      .from(staffSkills)
      .where(
        and(
          eq(staffSkills.staffId, staffId),
          eq(staffSkills.serviceId, serviceId)
        )
      );

    if (!staffSkill) {
      return res.status(400).json({ error: "Staff is not qualified for this service" });
    }

    // Check for schedule conflict
    const [schedule] = await db
      .select()
      .from(staffSchedules)
      .where(
        and(
          eq(staffSchedules.staffId, staffId),
          eq(staffSchedules.date, new Date(startTime))
        )
      );

    if (!schedule) {
      return res.status(400).json({ error: "Staff is not scheduled for this time" });
    }

    // Create the slot
    const [slot] = await db
      .insert(serviceSlots)
      .values({
        businessId,
        serviceId,
        staffId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status,
        isManual: true,
      })
      .returning();

    res.json(slot);
  } catch (error) {
    console.error("Error creating manual slot:", error);
    res.status(500).json({ error: "Failed to create slot" });
  }
});

// Generate automatic slots based on roster and service mappings with smart handling
router.post("/businesses/:businessId/slots/auto-generate", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);

    // Validate request body
    const validationResult = generateAutoSlotsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { startDate, endDate } = validationResult.data;

    // Get existing bookings for the date range
    const existingBookings = await db
      .select()
      .from(salonBookings)
      .where(
        and(
          eq(salonBookings.businessId, businessId),
          gte(salonBookings.createdAt, new Date(startDate)),
          lte(salonBookings.createdAt, new Date(endDate))
        )
      );

    // Get all staff schedules and their service capabilities
    const schedules = await db
      .select({
        schedule: staffSchedules,
        template: shiftTemplates,
        skills: staffSkills,
        service: salonServices,
      })
      .from(staffSchedules)
      .innerJoin(shiftTemplates, eq(staffSchedules.templateId, shiftTemplates.id))
      .innerJoin(staffSkills, eq(staffSchedules.staffId, staffSkills.staffId))
      .innerJoin(salonServices, eq(staffSkills.serviceId, salonServices.id))
      .where(
        and(
          gte(staffSchedules.date, new Date(startDate)),
          lte(staffSchedules.date, new Date(endDate)),
          eq(salonServices.businessId, businessId)
        )
      );

    const slots = [];
    const conflictMap = new Map(); // Track conflicting slots

    // Generate slots for each schedule with conflict awareness
    for (const { schedule, template, skills, service } of schedules) {
      if (!skills || !service) continue;

      const shiftStart = parseISO(`${format(schedule.date, 'yyyy-MM-dd')}T${template.startTime}`);
      const shiftEnd = parseISO(`${format(schedule.date, 'yyyy-MM-dd')}T${template.endTime}`);

      let currentTime = shiftStart;
      while (currentTime < shiftEnd) {
        // Check for breaks and existing bookings
        const isBreakTime = template.breaks?.some(breakTime => {
          const breakStart = parseISO(`${format(schedule.date, 'yyyy-MM-dd')}T${breakTime.startTime}`);
          const breakEnd = parseISO(`${format(schedule.date, 'yyyy-MM-dd')}T${breakTime.endTime}`);
          return currentTime >= breakStart && currentTime < breakEnd;
        });

        const hasBookingConflict = existingBookings.some(booking =>
          booking.staffId === schedule.staffId &&
          isWithinInterval(currentTime, {
            start: booking.startTime,
            end: booking.endTime
          })
        );

        if (!isBreakTime && !hasBookingConflict) {
          const slotEnd = addMinutes(currentTime, service.duration);
          if (slotEnd <= shiftEnd) {
            const newSlot = {
              businessId,
              serviceId: service.id,
              staffId: schedule.staffId,
              startTime: currentTime,
              endTime: slotEnd,
              status: "available",
              isManual: false,
            };

            // Check for overlapping slots
            const conflictingSlots = slots.filter(existingSlot =>
              existingSlot.staffId === newSlot.staffId &&
              (isWithinInterval(newSlot.startTime, {
                start: existingSlot.startTime,
                end: existingSlot.endTime
              }) ||
              isWithinInterval(newSlot.endTime, {
                start: existingSlot.startTime,
                end: existingSlot.endTime
              }))
            );

            if (conflictingSlots.length > 0) {
              // Store conflicting slot IDs for reference
              newSlot.conflictingSlotIds = conflictingSlots.map(slot => slot.id);
            }

            slots.push(newSlot);
          }
        }

        // Move to next potential slot start time
        currentTime = addMinutes(currentTime, 15); // Use 15-minute increments for flexibility
      }
    }

    if (slots.length === 0) {
      return res.status(400).json({
        error: "No slots could be generated. Please ensure staff members are scheduled and have the required service skills."
      });
    }

    // Insert all generated slots
    const createdSlots = await db
      .insert(serviceSlots)
      .values(slots)
      .returning();

    res.json(createdSlots);
  } catch (error) {
    console.error("Error generating slots:", error);
    res.status(500).json({ error: "Failed to generate slots" });
  }
});

export default router;