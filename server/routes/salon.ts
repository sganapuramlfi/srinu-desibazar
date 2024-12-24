import { Router } from "express";
import { db } from "@db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { salonServices, salonStaff, staffSkills, insertSalonServiceSchema } from "@db/schema";

const router = Router();

// Public route - GET services
router.get("/businesses/:businessId/services", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const services = await db
      .select()
      .from(salonServices)
      .where(eq(salonServices.businessId, businessId));

    res.json(services);
  } catch (error: any) {
    console.error('Error fetching salon services:', error);
    res.status(500).json({
      message: "Failed to fetch services",
      error: error.message
    });
  }
});

// Protected routes - require authentication
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Create service - protected
router.post("/businesses/:businessId/services", requireAuth, async (req, res) => {
  try {
    const result = insertSalonServiceSchema.safeParse({
      ...req.body,
      businessId: parseInt(req.params.businessId)
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [service] = await db
      .insert(salonServices)
      .values(result.data)
      .returning();

    res.status(201).json(service);
  } catch (error: any) {
    console.error('Error creating salon service:', error);
    res.status(500).json({
      message: "Failed to create service",
      error: error.message
    });
  }
});

// Update service - protected
router.put("/businesses/:businessId/services/:serviceId", requireAuth, async (req, res) => {
  try {
    const result = insertSalonServiceSchema.partial().safeParse({
      ...req.body,
      businessId: parseInt(req.params.businessId)
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [service] = await db
      .update(salonServices)
      .set(result.data)
      .where(and(
        eq(salonServices.id, parseInt(req.params.serviceId)),
        eq(salonServices.businessId, parseInt(req.params.businessId))
      ))
      .returning();

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json(service);
  } catch (error: any) {
    console.error('Error updating salon service:', error);
    res.status(500).json({
      message: "Failed to update service",
      error: error.message
    });
  }
});

// Staff management - protected
router.get("/businesses/:businessId/staff", requireAuth, async (req, res) => {
  try {
    const staff = await db
      .select()
      .from(salonStaff)
      .where(eq(salonStaff.businessId, parseInt(req.params.businessId)));

    const staffWithSkills = await Promise.all(staff.map(async (staffMember) => {
      const skills = await db
        .select()
        .from(staffSkills)
        .where(eq(staffSkills.staffId, staffMember.id));

      return {
        ...staffMember,
        skills,
      };
    }));

    res.json(staffWithSkills);
  } catch (error: any) {
    console.error('Error fetching salon staff:', error);
    res.status(500).json({
      message: "Failed to fetch staff",
      error: error.message
    });
  }
});

export default router;