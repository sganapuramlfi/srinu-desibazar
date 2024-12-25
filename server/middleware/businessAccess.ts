import type { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { businesses, salonBookings } from "@db/schema";
import { eq, and } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      isBusinessOwner?: boolean;
      hasBookingAccess?: boolean;
    }
  }
}

export const hasBusinessAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const userId = req.user?.id;

    if (!businessId || !userId) {
      return res.status(400).json({ error: "Invalid business ID or user not authenticated" });
    }

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Set flag for business owner
    req.isBusinessOwner = business.userId === userId;

    // Business owners have full access
    if (req.isBusinessOwner) {
      return next();
    }

    // Get the path without the businessId parameter for easier matching
    const path = req.path.replace(`/${businessId}`, '');

    // Check if this is a booking operation for an existing booking
    if (path.startsWith('/bookings/')) {
      const bookingId = parseInt(path.split('/')[2]); // Extract booking ID from path
      if (bookingId) {
        const [booking] = await db
          .select()
          .from(salonBookings)
          .where(
            and(
              eq(salonBookings.id, bookingId),
              eq(salonBookings.customerId, userId)
            )
          )
          .limit(1);

        if (booking) {
          return next();
        }
      }
    }

    // Always allow access to slots and bookings list endpoints
    if (path === '/slots' || path === '/slots/available' || path === '/bookings') {
      return next();
    }

    // For other operations, check if user has any bookings with this business
    const [existingBooking] = await db
      .select()
      .from(salonBookings)
      .where(
        and(
          eq(salonBookings.businessId, businessId),
          eq(salonBookings.customerId, userId)
        )
      )
      .limit(1);

    req.hasBookingAccess = !!existingBooking;

    if (!req.hasBookingAccess) {
      return res.status(403).json({ error: "Not authorized to access this business" });
    }

    next();
  } catch (error) {
    console.error("Business access check error:", error);
    res.status(500).json({ error: "Failed to verify business access" });
  }
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};