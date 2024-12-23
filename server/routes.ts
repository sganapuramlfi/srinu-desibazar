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

      let services = [];
      if (business.industryType === "salon") {
        services = await db
          .select()
          .from(salonServices)
          .where(eq(salonServices.businessId, businessId));
      } else if (business.industryType === "professional") {
        services = await db
          .select()
          .from(professionalServices)
          .where(eq(professionalServices.businessId, businessId));
      }

      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.get("/api/businesses/:businessId/menu", async (req, res) => {
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

      if (business.industryType !== "restaurant") {
        return res.status(400).json({ error: "Business is not a restaurant" });
      }

      const menuItems = await db
        .select()
        .from(restaurantMenu)
        .where(eq(restaurantMenu.businessId, businessId));

      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu" });
    }
  });

  app.get("/api/businesses/:businessId/events", async (req, res) => {
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

      if (business.industryType !== "event") {
        return res.status(400).json({ error: "Business is not an event management company" });
      }

      const eventsList = await db
        .select()
        .from(events)
        .where(eq(events.businessId, businessId));

      res.json(eventsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/businesses/:businessId/properties", async (req, res) => {
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

      if (business.industryType !== "realestate") {
        return res.status(400).json({ error: "Business is not a real estate company" });
      }

      const propertyList = await db
        .select()
        .from(properties)
        .where(eq(properties.businessId, businessId));

      res.json(propertyList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/businesses/:businessId/products", async (req, res) => {
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

      if (business.industryType !== "retail") {
        return res.status(400).json({ error: "Business is not a retail store" });
      }

      const products = await db
        .select()
        .from(retailProducts)
        .where(eq(retailProducts.businessId, businessId));

      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
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
    } catch (error) {
      console.error('Error updating business:', error);
      res.status(500).json({ error: "Failed to update business", details: error.message });
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

  const httpServer = createServer(app);
  return httpServer;
}