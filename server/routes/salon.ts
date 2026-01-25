import { Router } from "express";
import { db } from "../../db/index.js";
import { salonStaff, salonServices, salonStaffServices } from "../../db/index.js";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { insertSalonServiceSchema, insertSalonStaffSchema } from "../../db/index.js";
import { requireBusinessAccess } from "../middleware/businessAccess.js";

const router = Router();

// Validation schemas
const staffSchema = z.object({
  name: z.string().min(1, "Staff name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  specialization: z.string().min(1, "Specialization is required"),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
});

// Staff Management Routes
router.get("/businesses/:businessId/staff", 
  requireBusinessAccess(["owner", "manager", "staff"]), 
  async (req, res) => {
    try {
      const businessId = req.businessContext!.businessId;

      const staff = await db.select()
        .from(salonStaff)
        .where(and(
          eq(salonStaff.businessId, businessId),
          eq(salonStaff.isActive, true)
        ));

      res.json(staff);
    } catch (error: any) {
      console.error('Error fetching salon staff:', error);
      res.status(500).json({
        message: "Failed to fetch staff",
        error: error.message
      });
    }
  }
);

router.post("/businesses/:businessId/staff", 
  requireBusinessAccess(["owner", "manager"], ["canManageStaff"]),
  async (req, res) => {
    try {
      const businessId = req.businessContext!.businessId;

      const result = staffSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: result.error.issues
        });
      }

      const [staff] = await db.insert(salonStaff)
        .values({
          firstName: result.data.name.split(' ')[0] || result.data.name,
          lastName: result.data.name.split(' ').slice(1).join(' ') || '',
          email: result.data.email,
          phone: result.data.phone,
          title: result.data.specialization,
          businessId: businessId,
          isActive: true,
          isBookable: true,
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

router.put("/businesses/:businessId/staff/:staffId", 
  requireBusinessAccess(["owner", "manager"], ["canManageStaff"]),
  async (req, res) => {
    try {
      const businessId = req.businessContext!.businessId;

      const result = staffSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: result.error.issues
        });
      }

      const updateData: any = {
        updatedAt: new Date()
      };

      // Map the partial data to the new schema structure
      if (result.data.name) {
        updateData.firstName = result.data.name.split(' ')[0] || result.data.name;
        updateData.lastName = result.data.name.split(' ').slice(1).join(' ') || '';
      }
      if (result.data.email) updateData.email = result.data.email;
      if (result.data.phone) updateData.phone = result.data.phone;
      if (result.data.specialization) updateData.title = result.data.specialization;

      const [staff] = await db.update(salonStaff)
        .set(updateData)
        .where(and(
          eq(salonStaff.id, parseInt(req.params.staffId)),
          eq(salonStaff.businessId, businessId)
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
const updateServiceSchema = insertSalonServiceSchema.partial();

// Service Management
router.get("/businesses/:businessId/services", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
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
    if (!req.isAuthenticated()) {
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

router.put("/businesses/:businessId/services/:serviceId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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

router.delete("/businesses/:businessId/services/:serviceId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
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