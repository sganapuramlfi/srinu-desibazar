import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { businesses, salonBookings } from "./db/schema";
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

    if (!businessId || isNaN(businessId)) {
      console.log('Missing or invalid businessId');
      return res.status(400).json({ error: "Invalid business ID" });
    }

    // Get business
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId));

    if (!business) {
      console.log('Business not found:', businessId);
      return res.status(404).json({ error: "Business not found" });
    }

    // Set business owner flag if user is authenticated
    if (userId) {
      req.isBusinessOwner = business.userId === userId;
    }

    // Public routes that don't require full business access
    const publicEndpoints = [
      'profile',
      'services',
      'staff'
    ];

    // Check if this is a public endpoint
    const pathSegments = req.path.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    const secondToLastSegment = pathSegments[pathSegments.length - 2];

    // Allow slot-related operations without business ownership
    if (lastSegment === 'slots' || secondToLastSegment === 'slots') {
      console.log('Access granted - Slot operation');
      return next();
    }

    // Allow public endpoints
    if (publicEndpoints.includes(lastSegment)) {
      console.log('Access granted - Public endpoint:', lastSegment);
      return next();
    }

    // For non-public endpoints, require authentication
    if (!userId) {
      console.log('Authentication required for protected endpoint');
      return res.status(401).json({ error: "Authentication required" });
    }

    // Business owners have full access
    if (req.isBusinessOwner) {
      console.log('Access granted - Business owner');
      return next();
    }

    // Handle booking-specific operations
    if (pathSegments.includes('bookings')) {
      // Get booking ID if exists in path
      const bookingIdIndex = pathSegments.indexOf('bookings') + 1;
      const bookingId = bookingIdIndex < pathSegments.length ? parseInt(pathSegments[bookingIdIndex]) : null;

      // If accessing a specific booking
      if (bookingId && !isNaN(bookingId)) {
        const [booking] = await db
          .select()
          .from(salonBookings)
          .where(
            and(
              eq(salonBookings.id, bookingId),
              eq(salonBookings.businessId, businessId),
              eq(salonBookings.customerId, userId)
            )
          );

        if (booking) {
          console.log('Access granted - Booking owner:', { userId, bookingId });
          req.hasBookingAccess = true;
          return next();
        }
      }

      // For general booking operations, check if user has any bookings with this business
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

      if (existingBooking) {
        console.log('Access granted - Has existing bookings:', { userId });
        req.hasBookingAccess = true;
        return next();
      }
    }

    console.log('Access denied - Not authorized');
    return res.status(403).json({ error: "Not authorized to access this business" });

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