import { Router } from "express";
import { db } from "@db";
import { salonServices, salonStaff, staffSkills, insertSalonServiceSchema, insertSalonStaffSchema, insertStaffSkillSchema } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { shiftTemplates, staffSchedules, insertShiftTemplateSchema, insertStaffScheduleSchema } from "@db/schema";

const router = Router();

// Staff-skills routes
router.get("/businesses/:businessId/staff-skills", async (req, res) => {
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

router.get("/businesses/:businessId/staff/:staffId/skills", async (req, res) => {
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

router.put("/businesses/:businessId/staff/:staffId/skills", async (req, res) => {
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

    res.json(staff);
  } catch (error: any) {
    console.error('Error creating salon staff:', error);
    res.status(500).json({
      message: "Failed to create staff",
      error: error.message
    });
  }
});

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


// Shift Template Management
router.get("/businesses/:businessId/shift-templates", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const templates = await db.select()
      .from(shiftTemplates)
      .where(eq(shiftTemplates.businessId, parseInt(req.params.businessId)));

    res.json(templates);
  } catch (error: any) {
    console.error('Error fetching shift templates:', error);
    res.status(500).json({
      message: "Failed to fetch templates",
      error: error.message
    });
  }
});

router.post("/businesses/:businessId/shift-templates", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = insertShiftTemplateSchema.safeParse({
      ...req.body,
      businessId: parseInt(req.params.businessId)
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [template] = await db.insert(shiftTemplates)
      .values(result.data)
      .returning();

    res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating shift template:', error);
    res.status(500).json({
      message: "Failed to create template",
      error: error.message
    });
  }
});

router.put("/businesses/:businessId/shift-templates/:templateId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = insertShiftTemplateSchema.partial().safeParse({
      ...req.body,
      businessId: parseInt(req.params.businessId)
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [template] = await db.update(shiftTemplates)
      .set({
        ...result.data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(shiftTemplates.id, parseInt(req.params.templateId)),
        eq(shiftTemplates.businessId, parseInt(req.params.businessId))
      ))
      .returning();

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    res.json(template);
  } catch (error: any) {
    console.error('Error updating shift template:', error);
    res.status(500).json({
      message: "Failed to update template",
      error: error.message
    });
  }
});

router.delete("/businesses/:businessId/shift-templates/:templateId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // First delete related schedules
    await db.delete(staffSchedules)
      .where(eq(staffSchedules.templateId, parseInt(req.params.templateId)));

    // Then delete the template
    const [deletedTemplate] = await db.delete(shiftTemplates)
      .where(and(
        eq(shiftTemplates.id, parseInt(req.params.templateId)),
        eq(shiftTemplates.businessId, parseInt(req.params.businessId))
      ))
      .returning();

    if (!deletedTemplate) {
      return res.status(404).json({ message: "Template not found" });
    }

    res.json({ message: "Template deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting shift template:', error);
    res.status(500).json({
      message: "Failed to delete template",
      error: error.message
    });
  }
});

// Staff Schedule Management
router.post("/businesses/:businessId/staff/:staffId/schedules", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = insertStaffScheduleSchema.safeParse({
      ...req.body,
      staffId: parseInt(req.params.staffId),
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [schedule] = await db.insert(staffSchedules)
      .values(result.data)
      .returning();

    res.status(201).json(schedule);
  } catch (error: any) {
    console.error('Error creating staff schedule:', error);
    res.status(500).json({
      message: "Failed to create schedule",
      error: error.message
    });
  }
});

export default router;