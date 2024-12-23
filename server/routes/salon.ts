import { Router } from "express";
import { db } from "@db";
import { salonServices, salonStaff, staffSkills, insertSalonServiceSchema, insertSalonStaffSchema, insertStaffSkillSchema } from "@db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// Service Management
router.get("/businesses/:businessId/services", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const services = await db.select()
      .from(salonServices)
      .where(eq(salonServices.businessId, parseInt(req.params.businessId)));

    res.json(services);
  } catch (error: any) {
    console.error('Error fetching salon services:', error);
    res.status(500).json({
      message: "Failed to fetch services",
      error: error.message
    });
  }
});

router.post("/businesses/:businessId/services", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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

    const [service] = await db.insert(salonServices)
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

router.get("/businesses/:businessId/services/:serviceId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [service] = await db.select()
      .from(salonServices)
      .where(and(
        eq(salonServices.id, parseInt(req.params.serviceId)),
        eq(salonServices.businessId, parseInt(req.params.businessId))
      ))
      .limit(1);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json(service);
  } catch (error: any) {
    console.error('Error fetching salon service:', error);
    res.status(500).json({
      message: "Failed to fetch service",
      error: error.message
    });
  }
});

router.put("/businesses/:businessId/services/:serviceId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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

// Add delete service endpoint
router.delete("/businesses/:businessId/services/:serviceId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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

// Staff Management
router.get("/businesses/:businessId/staff", async (req, res) => {
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

router.post("/businesses/:businessId/staff", async (req, res) => {
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

    res.status(201).json(staff);
  } catch (error: any) {
    console.error('Error creating salon staff:', error);
    res.status(500).json({
      message: "Failed to create staff",
      error: error.message
    });
  }
});

// Add delete staff endpoint
router.delete("/businesses/:businessId/staff/:staffId", async (req, res) => {
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


// Staff Skills Management
router.post("/businesses/:businessId/staff/:staffId/skills", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify staff belongs to the business
    const [staff] = await db.select()
      .from(salonStaff)
      .where(and(
        eq(salonStaff.id, parseInt(req.params.staffId)),
        eq(salonStaff.businessId, parseInt(req.params.businessId))
      ))
      .limit(1);

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    const result = insertStaffSkillSchema.safeParse({
      ...req.body,
      staffId: parseInt(req.params.staffId)
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [skill] = await db.insert(staffSkills)
      .values(result.data)
      .returning();

    res.status(201).json(skill);
  } catch (error: any) {
    console.error('Error adding staff skill:', error);
    res.status(500).json({
      message: "Failed to add skill",
      error: error.message
    });
  }
});

export default router;