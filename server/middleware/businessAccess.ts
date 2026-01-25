import { Request, Response, NextFunction } from "express";
import { db, businessAccess, businessTenants, bookings } from "../../db/index.js";
import { eq, and } from "drizzle-orm";

// Extend Express Request to include business context
declare global {
  namespace Express {
    interface Request {
      businessContext?: {
        businessId: number;
        business: any;
        userRole: string;
        permissions: any;
      };
    }
  }
}

/**
 * Middleware to verify user has access to a specific business
 * and populate business context in request
 */
export function requireBusinessAccess(
  requiredRole?: string[], 
  requiredPermissions?: string[]
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const businessId = parseInt(req.params.businessId);
      if (!businessId || isNaN(businessId)) {
        return res.status(400).json({ error: "Valid business ID required" });
      }

      // Get user's access to this business
      const [userAccess] = await db
        .select({
          businessId: businessAccess.businessId,
          role: businessAccess.role,
          permissions: businessAccess.permissions,
          isActive: businessAccess.isActive,
          businessName: businessTenants.name,
          businessSlug: businessTenants.slug,
          industryType: businessTenants.industryType,
          businessStatus: businessTenants.status,
        })
        .from(businessAccess)
        .innerJoin(businessTenants, eq(businessTenants.id, businessAccess.businessId))
        .where(and(
          eq(businessAccess.businessId, businessId),
          eq(businessAccess.userId, req.user.id),
          eq(businessAccess.isActive, true),
          eq(businessTenants.status, "active")
        ))
        .limit(1);

      if (!userAccess) {
        return res.status(403).json({ 
          error: "Access denied - You don't have permission to access this business" 
        });
      }

      // Check role requirements
      if (requiredRole && requiredRole.length > 0) {
        if (!requiredRole.includes(userAccess.role)) {
          return res.status(403).json({ 
            error: `Access denied - Role '${userAccess.role}' insufficient. Required: ${requiredRole.join(', ')}` 
          });
        }
      }

      // Check permission requirements
      if (requiredPermissions && requiredPermissions.length > 0) {
        const userPermissions = userAccess.permissions || {};
        const hasRequiredPermissions = requiredPermissions.every(
          permission => userPermissions[permission] === true
        );
        
        if (!hasRequiredPermissions) {
          return res.status(403).json({ 
            error: `Access denied - Missing required permissions: ${requiredPermissions.join(', ')}` 
          });
        }
      }

      // Populate business context in request
      req.businessContext = {
        businessId: userAccess.businessId,
        business: {
          id: userAccess.businessId,
          name: userAccess.businessName,
          slug: userAccess.businessSlug,
          industryType: userAccess.industryType,
          status: userAccess.businessStatus,
        },
        userRole: userAccess.role,
        permissions: userAccess.permissions,
      };

      console.log(`[BusinessAccess] Access granted for user ${req.user.id} to business ${businessId} as ${userAccess.role}`);
      next();
    } catch (error) {
      console.error('[BusinessAccess] Error checking business access:', error);
      res.status(500).json({ error: "Failed to verify business access" });
    }
  };
}

/**
 * Middleware to get business by slug and verify access
 */
export function requireBusinessAccessBySlug(
  requiredRole?: string[], 
  requiredPermissions?: string[]
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const businessSlug = req.params.slug;
      if (!businessSlug) {
        return res.status(400).json({ error: "Business slug required" });
      }

      // Get business by slug
      const [business] = await db
        .select()
        .from(businessTenants)
        .where(and(
          eq(businessTenants.slug, businessSlug),
          eq(businessTenants.status, "active")
        ))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Temporarily set businessId in params for the main middleware
      req.params.businessId = business.id.toString();
      
      // Call the main business access middleware
      const mainMiddleware = requireBusinessAccess(requiredRole, requiredPermissions);
      return mainMiddleware(req, res, next);
    } catch (error) {
      console.error('[BusinessAccess] Error checking business access by slug:', error);
      res.status(500).json({ error: "Failed to verify business access" });
    }
  };
}

/**
 * Middleware for public access to business data (directory, public pages)
 */
export async function getBusinessBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const businessSlug = req.params.slug;
    if (!businessSlug) {
      return res.status(400).json({ error: "Business slug required" });
    }

    const [business] = await db
      .select()
      .from(businessTenants)
      .where(and(
        eq(businessTenants.slug, businessSlug),
        eq(businessTenants.status, "active")
      ))
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Populate business context for public access
    req.businessContext = {
      businessId: business.id,
      business: business,
      userRole: "public",
      permissions: {},
    };

    next();
  } catch (error) {
    console.error('[BusinessAccess] Error getting business by slug:', error);
    res.status(500).json({ error: "Failed to get business data" });
  }
}

/**
 * Simple authentication middleware
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    console.log('[Auth] Authentication required');
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};