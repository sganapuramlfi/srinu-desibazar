import type { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { businesses } from "@db/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      isBusinessOwner?: boolean;
      business?: any;
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
      return res.status(400).json({ ok: false, message: "Invalid business ID" });
    }

    // Get business
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId));

    if (!business) {
      console.log('Business not found:', businessId);
      return res.status(404).json({ ok: false, message: "Business not found" });
    }

    // Public endpoints that don't require authentication
    const publicEndpoints = [
      'profile',
      'services',
      'staff',
      'gallery',
      'shift-templates'
    ];

    // Check if this is a public endpoint
    const pathSegments = req.path.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Allow public endpoints without authentication
    if (publicEndpoints.includes(lastSegment)) {
      req.business = business;
      console.log('Access granted - Public endpoint:', lastSegment);
      return next();
    }

    // For non-public endpoints, require authentication
    if (!req.isAuthenticated()) {
      console.log('Authentication required for protected endpoint');
      return res.status(401).json({ ok: false, message: "Authentication required" });
    }

    // Verify business ownership for protected endpoints
    if (business.userId !== userId) {
      console.log('Access denied - Not business owner:', { businessUserId: business.userId, requestUserId: userId });
      return res.status(403).json({ ok: false, message: "You don't have permission to access this business" });
    }

    // Store business context and ownership flag
    req.business = business;
    req.isBusinessOwner = true;

    console.log('Access granted - Business owner verified');
    next();
  } catch (error) {
    console.error('Error in business access middleware:', error);
    res.status(500).json({ ok: false, message: "Failed to verify business access" });
  }
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    console.log('Authentication required');
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export const requireBusinessOwner = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ ok: false, message: "Authentication required" });
  }

  if (req.user?.role !== "business") {
    return res.status(403).json({ ok: false, message: "Business account required" });
  }

  if (!req.isBusinessOwner) {
    return res.status(403).json({ ok: false, message: "You don't have permission to access this business" });
  }

  next();
};