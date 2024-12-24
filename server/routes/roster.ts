import { Router } from "express";
import { db } from "@db";
import { staffSchedules, salonStaff, shiftTemplates } from "@db/schema";
import { eq, and, between } from "drizzle-orm";

const router = Router();

// Get roster data for a business
router.get("/api/businesses/:businessId/roster", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const schedules = await db.query.staffSchedules.findMany({
      where: eq(staffSchedules.businessId, businessId),
      with: {
        staff: true,
        template: true,
      }
    });

    res.json(schedules);
  } catch (error) {
    console.error("Error fetching roster:", error);
    res.status(500).json({ error: "Failed to fetch roster" });
  }
});

// Get shift templates for a business
router.get("/api/businesses/:businessId/shift-templates", async (req, res) => {
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
  } catch (error) {
    console.error("Error fetching shift templates:", error);
    res.status(500).json({ error: "Failed to fetch shift templates" });
  }
});

// Assign a shift
router.post("/api/businesses/:businessId/roster/batch-assign", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const { staffIds, templateId, startDate, endDate } = req.body;

    const shifts = [];
    for (const staffId of staffIds) {
      // Check for existing shift
      const existingShift = await db.query.staffSchedules.findFirst({
        where: and(
          eq(staffSchedules.staffId, staffId),
          eq(staffSchedules.date, new Date(startDate))
        ),
      });

      if (existingShift) {
        // Update existing shift
        const [updatedShift] = await db
          .update(staffSchedules)
          .set({
            templateId,
            updatedAt: new Date(),
          })
          .where(eq(staffSchedules.id, existingShift.id))
          .returning();
        shifts.push(updatedShift);
      } else {
        // Create new shift
        const [newShift] = await db
          .insert(staffSchedules)
          .values({
            staffId,
            templateId,
            businessId,
            date: new Date(startDate),
            status: "scheduled",
          })
          .returning();
        shifts.push(newShift);
      }
    }

    res.json(shifts);
  } catch (error) {
    console.error("Error assigning shifts:", error);
    res.status(500).json({ error: "Failed to assign shifts" });
  }
});

// Update a shift
router.put("/api/businesses/:businessId/roster/:shiftId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const shiftId = parseInt(req.params.shiftId);
    const { templateId } = req.body;

    const [updatedShift] = await db
      .update(staffSchedules)
      .set({
        templateId,
        updatedAt: new Date(),
      })
      .where(eq(staffSchedules.id, shiftId))
      .returning();

    res.json(updatedShift);
  } catch (error) {
    console.error("Error updating shift:", error);
    res.status(500).json({ error: "Failed to update shift" });
  }
});

export default router;