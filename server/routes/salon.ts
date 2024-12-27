import { Router } from "express";
import { db } from "@db";
import { services, staffSkills, shiftTemplates, staffSchedules } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { insertServiceSchema, insertShiftTemplateSchema, insertStaffScheduleSchema } from "@db/schema";

const router = Router();

// Staff Management Routes
router.get("/businesses/:businessId/staff", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const staff = await db.select()
      .from(salonStaff)
      .where(eq(salonStaff.businessId, parseInt(req.params.businessId)));

    res.json(staff);
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = staffSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [staff] = await db.insert(salonStaff)
      .values({
        ...result.data,
        businessId: parseInt(req.params.businessId),
        createdAt: new Date()
      })
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

router.put("/businesses/:businessId/staff/:staffId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = staffSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [staff] = await db.update(salonStaff)
      .set({
        ...result.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(salonStaff.id, parseInt(req.params.staffId)),
        eq(salonStaff.businessId, parseInt(req.params.businessId))
      ))
      .returning();

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    res.json(staff);
  } catch (error: any) {
    console.error('Error updating salon staff:', error);
    res.status(500).json({
      message: "Failed to update staff",
      error: error.message
    });
  }
});

router.delete("/businesses/:businessId/staff/:staffId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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

// Basic validation schemas
const updateServiceSchema = insertServiceSchema.partial();

// Service Management
router.get("/businesses/:businessId/services", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const businessServices = await db.select()
      .from(services)
      .where(eq(services.businessId, parseInt(req.params.businessId)));

    res.json(businessServices);
  } catch (error: any) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      message: "Failed to fetch services",
      error: error.message
    });
  }
});

router.post("/businesses/:businessId/services", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = insertServiceSchema.safeParse({
      ...req.body,
      businessId: parseInt(req.params.businessId),
      settings: {
        category: req.body.category || 'general',
        maxParticipants: req.body.maxParticipants || 1,
        isActive: true
      }
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [service] = await db.insert(services)
      .values(result.data)
      .returning();

    res.status(201).json(service);
  } catch (error: any) {
    console.error('Error creating service:', error);
    res.status(500).json({
      message: "Failed to create service",
      error: error.message
    });
  }
});

router.put("/businesses/:businessId/services/:serviceId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = insertServiceSchema.partial().safeParse({
      ...req.body,
      businessId: parseInt(req.params.businessId),
      settings: {
        category: req.body.category,
        maxParticipants: req.body.maxParticipants,
        isActive: req.body.isActive
      }
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [service] = await db.update(services)
      .set(result.data)
      .where(and(
        eq(services.id, parseInt(req.params.serviceId)),
        eq(services.businessId, parseInt(req.params.businessId))
      ))
      .returning();

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json(service);
  } catch (error: any) {
    console.error('Error updating service:', error);
    res.status(500).json({
      message: "Failed to update service",
      error: error.message
    });
  }
});

router.delete("/businesses/:businessId/services/:serviceId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [deletedService] = await db.update(services)
      .set({ settings: { isActive: false } })
      .where(and(
        eq(services.id, parseInt(req.params.serviceId)),
        eq(services.businessId, parseInt(req.params.businessId))
      ))
      .returning();

    if (!deletedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ message: "Service deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      message: "Failed to delete service",
      error: error.message
    });
  }
});


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

    const templateData = {
      ...req.body,
      businessId: parseInt(req.params.businessId),
      breaks: req.body.breaks || [],
      daysOfWeek: req.body.daysOfWeek || [1,2,3,4,5],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = insertShiftTemplateSchema.safeParse(templateData);

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

    const templateData = {
      ...req.body,
      businessId: parseInt(req.params.businessId),
      updatedAt: new Date()
    };

    const result = insertShiftTemplateSchema.partial().safeParse(templateData);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues
      });
    }

    const [template] = await db.update(shiftTemplates)
      .set(result.data)
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

export default router;