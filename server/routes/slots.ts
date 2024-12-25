import { Router } from "express";
import { db } from "@db";
import { serviceSlots, salonServices, staffSkills, staffSchedules, shiftTemplates, salonBookings, salonStaff } from "@db/schema";
import { eq, and, gte, lte, not, or } from "drizzle-orm";
import { z } from "zod";
import { addMinutes, parseISO, format, isWithinInterval, startOfDay, endOfDay, isSameDay, set } from "date-fns";

const router = Router();

// Validation schemas
const createManualSlotSchema = z.object({
  serviceId: z.number(),
  staffId: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(["available", "blocked"]).default("available"),
});

const generateAutoSlotsSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

// Get slots for a business with enhanced filtering
router.get("/businesses/:businessId/slots", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { startDate, endDate, serviceId, staffId } = req.query;

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

    // Filter out booked slots and format the response
    const availableSlots = slots
      .filter(({ slot }) => !bookedSlots.has(slot.id))
      .map(({ slot, service, staff }) => ({
        id: slot.id,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        status: slot.status,
        service: {
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: service.price,
        },
        staff: {
          id: staff.id,
          name: staff.name,
        },
        conflictingSlotIds: slot.conflictingSlotIds,
      }));

    res.json(availableSlots);
  } catch (error) {
    console.error("Error fetching slots:", error);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

// Generate automatic slots based on roster and service mappings
router.post("/businesses/:businessId/slots/auto-generate", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    console.log("Processing slot generation for business:", businessId);

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

    // Get all staff schedules and their service capabilities
    const schedules = await db
      .select({
        schedule: staffSchedules,
        template: shiftTemplates,
        staff: salonStaff,
        skills: staffSkills,
        service: salonServices,
      })
      .from(staffSchedules)
      .innerJoin(shiftTemplates, eq(staffSchedules.templateId, shiftTemplates.id))
      .innerJoin(salonStaff, eq(staffSchedules.staffId, salonStaff.id))
      .innerJoin(staffSkills, eq(salonStaff.id, staffSkills.staffId))
      .innerJoin(salonServices, eq(staffSkills.serviceId, salonServices.id))
      .where(
        and(
          eq(salonServices.businessId, businessId),
          gte(staffSchedules.date, startDateObj),
          lte(staffSchedules.date, endDateObj)
        )
      );

    if (schedules.length === 0) {
      return res.status(400).json({
        error: "No staff schedules found for the selected date range",
      });
    }

    const slots = [];

    for (const { schedule, template, staff, service } of schedules) {
      // Skip if it's a leave template
      if (template.type === "leave") continue;

      const scheduleDate = format(schedule.date, "yyyy-MM-dd");

      // Convert template times to full datetime
      const shiftStart = parseISO(`${scheduleDate}T${template.startTime}`);
      const shiftEnd = parseISO(`${scheduleDate}T${template.endTime}`);

      console.log(`Generating slots for ${staff.name} on ${scheduleDate} from ${template.startTime} to ${template.endTime}`);

      let currentTime = shiftStart;
      while (currentTime < shiftEnd) {
        // Check for breaks
        const isBreakTime = template.breaks?.some(breakTime => {
          const breakStart = parseISO(`${scheduleDate}T${breakTime.startTime}`);
          const breakEnd = parseISO(`${scheduleDate}T${breakTime.endTime}`);
          return isWithinInterval(currentTime, { start: breakStart, end: breakEnd });
        }) ?? false;

        if (!isBreakTime) {
          const slotEnd = addMinutes(currentTime, service.duration);

          // Only create slot if it fits within shift
          if (slotEnd <= shiftEnd) {
            const newSlot = {
              businessId,
              serviceId: service.id,
              staffId: staff.id,
              startTime: currentTime,
              endTime: slotEnd,
              status: "available" as const,
              isManual: false,
              conflictingSlotIds: [] as number[],
            };

            // Check for overlapping slots
            const existingOverlappingSlots = slots.filter(existingSlot =>
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

            if (existingOverlappingSlots.length > 0) {
              newSlot.conflictingSlotIds = existingOverlappingSlots.map(slot => slot.id);
              // Still add the slot but mark conflicts
              slots.push(newSlot);
            } else {
              slots.push(newSlot);
            }
          }
        }

        // Move to next potential slot start time (15-minute increments)
        currentTime = addMinutes(currentTime, 15);
      }
    }

    if (slots.length === 0) {
      return res.status(400).json({
        error: "No slots could be generated. Please check staff schedules and service assignments.",
      });
    }

    // Insert all generated slots
    const createdSlots = await db.insert(serviceSlots).values(slots).returning();
    console.log(`Successfully inserted ${createdSlots.length} slots`);

    res.json(createdSlots);
  } catch (error) {
    console.error("Error generating slots:", error);
    res.status(500).json({ error: "Failed to generate slots" });
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
    const startDate = startOfDay(new Date(startTime));
    const [schedule] = await db
      .select()
      .from(staffSchedules)
      .where(
        and(
          eq(staffSchedules.staffId, staffId),
          eq(staffSchedules.date, startDate)
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
        conflictingSlotIds: [],
      })
      .returning();

    res.json(slot);
  } catch (error) {
    console.error("Error creating manual slot:", error);
    res.status(500).json({ error: "Failed to create slot" });
  }
});

export default router;