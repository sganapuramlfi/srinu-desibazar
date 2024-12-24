import { Router } from "express";
import { db } from "@db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { salonServices, salonStaff, staffSkills, insertSalonServiceSchema, insertSalonStaffSchema } from "@db/schema";
import { createProtectedRouter } from "../auth";

// Create separate routers for public and protected routes
const publicRouter = Router();
const protectedRouter = createProtectedRouter();

// Basic validation schemas
const updateServiceSchema = insertSalonServiceSchema.partial();

// Public Routes - No Authentication Required
publicRouter.get("/businesses/:businessId/services", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const services = await db
      .select()
      .from(salonServices)
      .where(eq(salonServices.businessId, businessId));

    console.log('Fetched services for business:', businessId, services);
    res.json(services);
  } catch (error: any) {
    console.error('Error fetching salon services:', error);
    res.status(500).json({
      message: "Failed to fetch services",
      error: error.message
    });
  }
});

// Protected Routes - Authentication Required
protectedRouter.post("/businesses/:businessId/services", async (req, res) => {
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

protectedRouter.put("/businesses/:businessId/services/:serviceId", async (req, res) => {
  try {
    const result = updateServiceSchema.safeParse({
      ...req.body,
      businessId: parseInt(req.params.businessId)
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [service] = await db.update(salonServices)
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

protectedRouter.delete("/businesses/:businessId/services/:serviceId", async (req, res) => {
  try {
    const [deletedService] = await db.delete(salonServices)
      .where(and(
        eq(salonServices.id, parseInt(req.params.serviceId)),
        eq(salonServices.businessId, parseInt(req.params.businessId))
      ))
      .returning();

    if (!deletedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ message: "Service deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting salon service:', error);
    res.status(500).json({
      message: "Failed to delete service",
      error: error.message
    });
  }
});


protectedRouter.get("/businesses/:businessId/staff-skills", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    const allStaffSkills = await db
      .select()
      .from(staffSkills)
      .innerJoin(salonStaff, eq(staffSkills.staffId, salonStaff.id))
      .where(eq(salonStaff.businessId, businessId));

    res.json(allStaffSkills);
  } catch (error: any) {
    console.error('Error fetching staff skills:', error);
    res.status(500).json({
      message: "Failed to fetch staff skills",
      error: error.message
    });
  }
});

protectedRouter.get("/businesses/:businessId/staff/:staffId/skills", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const staffId = parseInt(req.params.staffId);
    const skills = await db
      .select()
      .from(staffSkills)
      .where(eq(staffSkills.staffId, staffId));

    res.json(skills);
  } catch (error: any) {
    console.error('Error fetching staff skills:', error);
    res.status(500).json({
      message: "Failed to fetch staff skills",
      error: error.message
    });
  }
});

protectedRouter.put("/businesses/:businessId/staff/:staffId/skills", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const staffId = parseInt(req.params.staffId);
    const serviceIds: number[] = req.body.serviceIds || [];

    // Verify staff belongs to the business
    const [staff] = await db
      .select()
      .from(salonStaff)
      .where(
        and(
          eq(salonStaff.id, staffId),
          eq(salonStaff.businessId, parseInt(req.params.businessId))
        )
      )
      .limit(1);

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // First, delete existing skills
    await db
      .delete(staffSkills)
      .where(eq(staffSkills.staffId, staffId));

    let skills = [];
    // Then insert new skills if any
    if (serviceIds.length > 0) {
      skills = await db
        .insert(staffSkills)
        .values(
          serviceIds.map(serviceId => ({
            staffId,
            serviceId,
            proficiencyLevel: "junior" as const,
          }))
        )
        .returning();
    }

    res.json(skills);
  } catch (error: any) {
    console.error('Error updating staff skills:', error);
    res.status(500).json({
      message: "Failed to update staff skills",
      error: error.message
    });
  }
});


protectedRouter.get("/businesses/:businessId/staff", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const staff = await db.select()
      .from(salonStaff)
      .where(eq(salonStaff.businessId, parseInt(req.params.businessId)));

    const staffWithSkills = await Promise.all(staff.map(async (staffMember) => {
      const skills = await db.select()
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

protectedRouter.post("/businesses/:businessId/staff", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = insertSalonStaffSchema.safeParse({
      ...req.body,
      businessId: parseInt(req.params.businessId)
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [staff] = await db.insert(salonStaff)
      .values(result.data)
      .returning();

    res.json(staff);
  } catch (error: any) {
    console.error('Error creating salon staff:', error);
    res.status(500).json({
      message: "Failed to create staff",
      error: error.message
    });
  }
});

protectedRouter.delete("/businesses/:businessId/staff/:staffId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // First delete related skills
    await db.delete(staffSkills)
      .where(eq(staffSkills.staffId, parseInt(req.params.staffId)));

    // Then delete the staff member
    const [deletedStaff] = await db.delete(salonStaff)
      .where(and(
        eq(salonStaff.id, parseInt(req.params.staffId)),
        eq(salonStaff.businessId, parseInt(req.params.businessId))
      ))
      .returning();

    if (!deletedStaff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    res.json({ message: "Staff member deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting staff member:', error);
    res.status(500).json({
      message: "Failed to delete staff member",
      error: error.message
    });
  }
});


// Combine routers - Important: public routes must be registered first
const router = Router();
router.use(publicRouter);
router.use(protectedRouter);

export default router;