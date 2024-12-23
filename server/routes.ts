import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import {
  businesses,
  advertisements,
  bookings,
  reviews,
  salonServices,
  salonStaff,
  restaurantTables,
  restaurantMenu,
  events,
  properties,
  retailProducts,
  professionalServices,
} from "@db/schema";
import { eq, and } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Business Routes
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
      const { industryType, search } = req.query;
      let query = db.select().from(businesses);

      if (industryType) {
        query = query.where(eq(businesses.industryType, industryType as string));
      }

      // TODO: Implement search functionality

      const result = await query;
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  app.get("/api/businesses/:id", async (req, res) => {
    try {
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, parseInt(req.params.id)))
        .limit(1);

      if (!business) {
        return res.status(404).send("Business not found");
      }

      res.json(business);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch business" });
    }
  });

  // Advertisement Routes
  app.post("/api/advertisements", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }

      const [ad] = await db
        .insert(advertisements)
        .values(req.body)
        .returning();

      res.json(ad);
    } catch (error) {
      res.status(500).json({ error: "Failed to create advertisement" });
    }
  });

  // Booking Routes
  app.post("/api/bookings", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }

      const [booking] = await db
        .insert(bookings)
        .values({ ...req.body, customerId: req.user.id })
        .returning();

      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Review Routes
  app.post("/api/reviews", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }

      const [review] = await db
        .insert(reviews)
        .values({ ...req.body, customerId: req.user.id })
        .returning();

      res.json(review);
    } catch (error) {
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  // Industry-specific Routes
  app.get("/api/salon/services/:businessId", async (req, res) => {
    try {
      const services = await db
        .select()
        .from(salonServices)
        .where(eq(salonServices.businessId, parseInt(req.params.businessId)));

      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch salon services" });
    }
  });

  app.get("/api/restaurant/menu/:businessId", async (req, res) => {
    try {
      const menuItems = await db
        .select()
        .from(restaurantMenu)
        .where(eq(restaurantMenu.businessId, parseInt(req.params.businessId)));

      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant menu" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
