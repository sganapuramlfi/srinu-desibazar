import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import {
  businesses,
  users,
  salonServices,
  salonStaff,
} from "@db/schema";
import { eq } from "drizzle-orm";
import salonRouter from "./routes/salon";
import rosterRouter from "./routes/roster";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Register salon-specific routes
  app.use("/api", salonRouter);

  // Register roster routes
  app.use("/api", rosterRouter);

  // Staff Routes
  app.get("/api/businesses/:businessId/staff", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const businessId = parseInt(req.params.businessId);
      const staffMembers = await db
        .select()
        .from(salonStaff)
        .where(eq(salonStaff.businessId, businessId));

      res.json(staffMembers);
    } catch (error) {
      console.error('Error fetching staff:', error);
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  // Business Routes
  app.get("/api/businesses/:id", async (req, res) => {
    try {
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, parseInt(req.params.id)))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      res.json(business);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch business" });
    }
  });

  // Industry-specific Routes
  app.get("/api/businesses/:businessId/services", async (req, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      let servicesList = await db
        .select()
        .from(salonServices)
        .where(eq(salonServices.businessId, businessId));


      res.json(servicesList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Business Profile Update Route
  app.put("/api/businesses/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const businessId = parseInt(req.params.id);
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      if (business.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to update this business" });
      }

      const [updatedBusiness] = await db
        .update(businesses)
        .set({
          name: req.body.name,
          description: req.body.description,
          updatedAt: new Date(),
        })
        .where(eq(businesses.id, businessId))
        .returning();

      res.json(updatedBusiness);
    } catch (error: any) {
      console.error('Error updating business:', error);
      res.status(500).json({ error: "Failed to update business", details: error.message });
    }
  });

  app.post("/api/businesses", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }

      const [business] = await db
        .insert(businesses)
        .values({ ...req.body, userId: req.user.id })
        .returning();

      res.json(business);
    } catch (error) {
      res.status(500).json({ error: "Failed to create business" });
    }
  });

  app.get("/api/businesses", async (req, res) => {
    try {
      const { industryType } = req.query;
      let query = db.select().from(businesses);

      if (industryType) {
        query = query.where(eq(businesses.industryType, industryType as string));
      }

      const result = await query;
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}