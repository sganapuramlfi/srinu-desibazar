import type { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { businesses, salonBookings } from "@db/schema";
import { eq, and, or } from "drizzle-orm";

// Extend Express Request type to include our custom properties
declare global {
  namespace Express {
    interface Request {
      isBusinessOwner?: boolean;
      hasBookingAccess?: boolean;
    }
  }
}

// Business access middleware that allows both owners and customers
export const hasBusinessAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const userId = req.user?.id;

    if (!businessId || !userId) {
      return res.status(400).json({ error: "Invalid business ID or user not authenticated" });
    }

    // First check if user is business owner
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Set a flag to indicate if the user is the business owner
    req.isBusinessOwner = business.userId === userId;

    // If not business owner, check if user has any bookings with this business
    if (!req.isBusinessOwner) {
      const [booking] = await db
        .select()
        .from(salonBookings)
        .where(
          and(
            eq(salonBookings.businessId, businessId),
            eq(salonBookings.customerId, userId)
          )
        )
        .limit(1);

      req.hasBookingAccess = !!booking;

      // For safe routes like viewing slots or managing own bookings, allow access
      if (req.method === 'GET' || req.path.includes('/bookings/')) {
        next();
        return;
      }

      // For other operations, require booking access
      if (!req.hasBookingAccess) {
        return res.status(403).json({ error: "Not authorized to access this business" });
      }
    }

    next();
  } catch (error) {
    console.error("Business access check error:", error);
    res.status(500).json({ error: "Failed to verify business access" });
  }
};

// Authentication check middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};