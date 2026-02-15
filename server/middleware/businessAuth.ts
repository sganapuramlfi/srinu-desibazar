import { Request, Response, NextFunction } from "express";
import { db } from "../../db/index.js";
import { businessTenants, businessAccess } from "../../db/index.js";
import { eq, and } from "drizzle-orm";

// Extend Express Request type to include business
declare global {
  namespace Express {
    interface Request {
      business?: typeof businessTenants.$inferSelect;
      businessAccess?: typeof businessAccess.$inferSelect;
    }
  }
}

/**
 * UPDATED: Validates business access using businessAccess table (multi-tenant model)
 * Replaces legacy userId-based ownership check
 * Migration completed: 2026-02-15
 */
export async function validateBusinessOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        ok: false,
        message: "Authentication required"
      });
    }

    // Get businessId from URL parameter
    const businessId = parseInt(req.params.businessId);
    if (isNaN(businessId)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid business ID"
      });
    }

    // Check if business exists
    const [business] = await db
      .select()
      .from(businessTenants)
      .where(eq(businessTenants.id, businessId))
      .limit(1);

    if (!business) {
      return res.status(404).json({
        ok: false,
        message: "Business not found"
      });
    }

    // Check user's access to this business via businessAccess table
    const [access] = await db
      .select()
      .from(businessAccess)
      .where(and(
        eq(businessAccess.businessId, businessId),
        eq(businessAccess.userId, req.user.id),
        eq(businessAccess.isActive, true)
      ))
      .limit(1);

    if (!access) {
      return res.status(403).json({
        ok: false,
        message: "Access denied. You don't have access to this business."
      });
    }

    // Check if user has owner or manager role
    if (!['owner', 'manager'].includes(access.role)) {
      return res.status(403).json({
        ok: false,
        message: "Access denied. Owner or manager role required."
      });
    }

    // Store business and access info in request for route handlers
    req.business = business;
    req.businessAccess = access;
    next();
  } catch (error) {
    console.error('Error in business ownership validation:', error);
    res.status(500).json({
      ok: false,
      message: "Internal server error"
    });
  }
}