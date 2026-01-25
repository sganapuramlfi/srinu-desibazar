import { Router } from "express";
import { db } from "../../db/index.js";
import { staffSchedules, salonStaff, shiftTemplates } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Validation schemas
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