import { Router } from "express";
import { db } from "@db";
import { staffSchedules, salonStaff } from "@db/schema";
import { eq, and, between } from "drizzle-orm";

const router = Router();

// Get roster data for a business
router.get("/api/businesses/:businessId/roster", async (req, res) => {
  try {
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

// Batch assign shifts
router.post("/api/businesses/:businessId/roster/batch-assign", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { staffIds, templateId, startDate, endDate } = req.body;

    const shifts = [];
    for (const staffId of staffIds) {
      const [shift] = await db
        .insert(staffSchedules)
        .values({
          staffId,
          templateId,
          date: new Date(startDate),
          status: "scheduled",
          businessId,
        })
        .returning();
      shifts.push(shift);
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