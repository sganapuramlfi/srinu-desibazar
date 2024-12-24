import { Router } from "express";
import { db } from "@db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { salonServices, salonStaff, staffSkills, insertSalonServiceSchema } from "@db/schema";

// Create separate routers for public and protected routes
const publicRouter = Router();
const protectedRouter = Router();

// Public Routes - No authentication required
publicRouter.get("/businesses/:businessId/services", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const services = await db
      .select()
      .from(salonServices)
      .where(eq(salonServices.businessId, businessId));

    res.json(services);
  } catch (error) {
    console.error('Error fetching salon services:', error);
    res.status(500).json({
      message: "Failed to fetch services",
      error: (error as Error).message
    });
  }
});

// Protected Routes - Protected endpoints requiring authentication
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
  } catch (error) {
    console.error('Error creating salon service:', error);
    res.status(500).json({
      message: "Failed to create service",
      error: (error as Error).message
    });
  }
});

protectedRouter.put("/businesses/:businessId/services/:serviceId", async (req, res) => {
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
  } catch (error) {
    console.error('Error updating salon service:', error);
    res.status(500).json({
      message: "Failed to update service",
      error: (error as Error).message
    });
  }
});

protectedRouter.get("/businesses/:businessId/staff", async (req, res) => {
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
  } catch (error) {
    console.error('Error fetching salon staff:', error);
    res.status(500).json({
      message: "Failed to fetch staff",
      error: (error as Error).message
    });
  }
});

export { publicRouter as salonPublicRouter, protectedRouter as salonProtectedRouter };