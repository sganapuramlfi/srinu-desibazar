import { Router } from "express";
import { db } from "@db";
import { staffSchedules, salonStaff, shiftTemplates } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { format, parse, isWithinInterval } from "date-fns";

const router = Router();

// Validation schemas
const breakSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  type: z.enum(["lunch", "coffee", "rest"]),
  duration: z.number().min(1).max(120)
});

const shiftTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  breaks: z.array(breakSchema),
  daysOfWeek: z.array(z.number().min(0).max(6)),
  color: z.string().optional(),
  isActive: z.boolean().optional()
});

// Helper function to check if breaks overlap
function checkBreakOverlaps(breaks: z.infer<typeof breakSchema>[]) {
  for (let i = 0; i < breaks.length; i++) {
    const break1 = breaks[i];
    const break1Start = parse(break1.startTime, 'HH:mm', new Date());
    const break1End = parse(break1.endTime, 'HH:mm', new Date());

    for (let j = i + 1; j < breaks.length; j++) {
      const break2 = breaks[j];
      const break2Start = parse(break2.startTime, 'HH:mm', new Date());
      const break2End = parse(break2.endTime, 'HH:mm', new Date());

      if (
        isWithinInterval(break1Start, { start: break2Start, end: break2End }) ||
        isWithinInterval(break1End, { start: break2Start, end: break2End })
      ) {
        throw new Error(`Break times cannot overlap: ${break1.startTime}-${break1.endTime} overlaps with ${break2.startTime}-${break2.endTime}`);
      }
    }
  }
}

const assignShiftSchema = z.object({
  staffId: z.number(),
  templateId: z.number(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  status: z.enum(["scheduled", "completed", "absent", "on_leave"]).default("scheduled"),
});

const updateShiftSchema = z.object({
  templateId: z.number(),
  status: z.enum(["scheduled", "completed", "absent", "on_leave"]).optional(),
});


// Get roster data for a business
router.get("/businesses/:businessId/roster", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);

    // Get staff and their schedules
    const staff = await db
      .select()
      .from(salonStaff)
      .where(eq(salonStaff.businessId, businessId));

    // If no staff found, return empty array
    if (staff.length === 0) {
      return res.json([]);
    }

    // Get schedules for all staff
    const schedules = await db
      .select({
        schedule: staffSchedules,
        staff: {
          id: salonStaff.id,
          name: salonStaff.name,
          email: salonStaff.email,
          specialization: salonStaff.specialization
        },
        template: shiftTemplates
      })
      .from(staffSchedules)
      .innerJoin(salonStaff, eq(staffSchedules.staffId, salonStaff.id))
      .innerJoin(shiftTemplates, eq(staffSchedules.templateId, shiftTemplates.id))
      .where(eq(salonStaff.businessId, businessId));

    // Transform the data to match the expected format
    const schedulesWithDetails = schedules.map(schedule => ({
      id: schedule.schedule.id,
      staffId: schedule.staff.id,
      templateId: schedule.template.id,
      date: schedule.schedule.date,
      status: schedule.schedule.status,
      staff: schedule.staff,
      template: schedule.template
    }));

    res.json(schedulesWithDetails);
  } catch (error: any) {
    console.error("Error fetching roster:", error);
    res.status(500).json({ error: "Failed to fetch roster" });
  }
});

// Get shift templates for a business
router.get("/businesses/:businessId/shift-templates", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const templates = await db
      .select()
      .from(shiftTemplates)
      .where(eq(shiftTemplates.businessId, businessId));

    res.json(templates);
  } catch (error: any) {
    console.error("Error fetching shift templates:", error);
    res.status(500).json({ error: "Failed to fetch shift templates" });
  }
});

// Create a shift template
router.post("/businesses/:businessId/shift-templates", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);

    // Validate request body
    const validationResult = shiftTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { name, startTime, endTime, breaks, daysOfWeek, color, isActive } = validationResult.data;

    // Check for break time overlaps
    checkBreakOverlaps(breaks);

    // Create template
    const [template] = await db
      .insert(shiftTemplates)
      .values({
        businessId,
        name,
        startTime,
        endTime,
        breaks: breaks as any, // JSONB type
        daysOfWeek: daysOfWeek as any, // JSONB type
        color,
        isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.json(template);
  } catch (error: any) {
    console.error("Error creating shift template:", error);
    res.status(500).json({ 
      error: "Failed to create shift template",
      details: error.message 
    });
  }
});

// Update a shift template
router.put("/businesses/:businessId/shift-templates/:templateId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const templateId = parseInt(req.params.templateId);

    // Validate request body
    const validationResult = shiftTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const { name, startTime, endTime, breaks, daysOfWeek, color, isActive } = validationResult.data;

    // Check for break time overlaps
    checkBreakOverlaps(breaks);

    // Update template
    const [template] = await db
      .update(shiftTemplates)
      .set({
        name,
        startTime,
        endTime,
        breaks: breaks as any, // JSONB type
        daysOfWeek: daysOfWeek as any, // JSONB type
        color,
        isActive,
        updatedAt: new Date()
      })
      .where(and(
        eq(shiftTemplates.id, templateId),
        eq(shiftTemplates.businessId, businessId)
      ))
      .returning();

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json(template);
  } catch (error: any) {
    console.error("Error updating shift template:", error);
    res.status(500).json({ 
      error: "Failed to update shift template",
      details: error.message 
    });
  }
});

// Delete a shift template
router.delete("/businesses/:businessId/shift-templates/:templateId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const templateId = parseInt(req.params.templateId);

    // Check if template exists and belongs to business
    const [template] = await db
      .delete(shiftTemplates)
      .where(and(
        eq(shiftTemplates.id, templateId),
        eq(shiftTemplates.businessId, businessId)
      ))
      .returning();

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({ message: "Template deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting shift template:", error);
    res.status(500).json({ error: "Failed to delete shift template" });
  }
});

// Assign a shift
router.post("/businesses/:businessId/roster/assign", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate request body
    const validationResult = assignShiftSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const businessId = parseInt(req.params.businessId);
    const { staffId, templateId, date, status } = validationResult.data;

    // Verify staff belongs to this business
    const [staff] = await db
      .select()
      .from(salonStaff)
      .where(and(
        eq(salonStaff.id, staffId),
        eq(salonStaff.businessId, businessId)
      ));

    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    // Verify template exists
    const [template] = await db
      .select()
      .from(shiftTemplates)
      .where(eq(shiftTemplates.id, templateId));

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Check for existing shift
    const existingShift = await db
      .select()
      .from(staffSchedules)
      .where(and(
        eq(staffSchedules.staffId, staffId),
        eq(staffSchedules.date, new Date(date))
      ));

    let shift;
    if (existingShift.length > 0) {
      // Update existing shift
      [shift] = await db
        .update(staffSchedules)
        .set({
          templateId,
          status,
          updatedAt: new Date(),
        })
        .where(eq(staffSchedules.id, existingShift[0].id))
        .returning();
    } else {
      // Create new shift
      [shift] = await db
        .insert(staffSchedules)
        .values({
          staffId,
          templateId,
          date: new Date(date),
          status,
          updatedAt: new Date()
        })
        .returning();
    }

    res.json(shift);
  } catch (error: any) {
    console.error("Error assigning shift:", error);
    res.status(500).json({ error: "Failed to assign shift", details: error.message });
  }
});

// Update a shift
router.put("/businesses/:businessId/roster/:shiftId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate request body
    const validationResult = updateShiftSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: validationResult.error.errors,
      });
    }

    const shiftId = parseInt(req.params.shiftId);
    const { templateId, status } = validationResult.data;

    const [updatedShift] = await db
      .update(staffSchedules)
      .set({
        templateId,
        status,
        updatedAt: new Date(),
      })
      .where(eq(staffSchedules.id, shiftId))
      .returning();

    res.json(updatedShift);
  } catch (error: any) {
    console.error("Error updating shift:", error);
    res.status(500).json({ error: "Failed to update shift" });
  }
});

export default router;