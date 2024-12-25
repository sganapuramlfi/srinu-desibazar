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

    console.log('Business access check:', { businessId, userId, path: req.path });

    if (!businessId || !userId) {
      console.log('Missing businessId or userId:', { businessId, userId });
      return res.status(400).json({ error: "Invalid business ID or user not authenticated" });
    }

    // Get business and check ownership
    const business = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .then(results => results[0]);

    if (!business) {
      console.log('Business not found:', businessId);
      return res.status(404).json({ error: "Business not found" });
    }

    // Set business owner flag
    req.isBusinessOwner = business.userId === userId;

    // Business owners have full access
    if (req.isBusinessOwner) {
      console.log('Access granted - Business owner:', { userId, businessName: business.name });
      return next();
    }

    // Get the path for easier matching
    const path = req.path.split('/').filter(Boolean);
    console.log('Processing path segments:', path);

    // Handle booking-specific operations
    if (path.includes('bookings')) {
      const bookingIdIndex = path.indexOf('bookings') + 1;
      const bookingId = path[bookingIdIndex];
      const operation = path[bookingIdIndex + 1]; // 'reschedule', 'cancel', etc.

      console.log('Booking operation:', { bookingId, operation, path });

      // If it's a specific booking operation
      if (bookingId) {
        const booking = await db
          .select()
          .from(salonBookings)
          .where(
            and(
              eq(salonBookings.id, parseInt(bookingId)),
              eq(salonBookings.businessId, businessId),
              eq(salonBookings.customerId, userId)
            )
          )
          .then(results => results[0]);

        if (booking) {
          console.log('Access granted - Booking owner:', { userId, bookingId });
          req.hasBookingAccess = true;
          return next();
        }
      }

      // Check if it's a public booking endpoint
      const publicBookingEndpoints = ['bookings', 'slots', 'slots/available'];
      if (path.length === 1 && publicBookingEndpoints.includes(path[0])) {
        console.log('Access granted - Public booking endpoint:', path[0]);
        return next();
      }
    }

    // Check if user has any existing bookings with this business
    const existingBookings = await db
      .select()
      .from(salonBookings)
      .where(
        and(
          eq(salonBookings.businessId, businessId),
          eq(salonBookings.customerId, userId)
        )
      );

    req.hasBookingAccess = existingBookings.length > 0;

    if (!req.hasBookingAccess) {
      console.log('Access denied - No existing bookings:', { userId, businessId });
      return res.status(403).json({ error: "Not authorized to access this business" });
    }

    console.log('Access granted - Has existing bookings:', { userId, businessId });
    next();
  } catch (error) {
    console.error('Error in business access middleware:', error);
    res.status(500).json({ error: "Failed to verify business access" });
  }
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    console.log('Authentication required');
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};