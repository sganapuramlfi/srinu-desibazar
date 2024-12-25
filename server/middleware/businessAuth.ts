import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { businesses } from "@db/schema";
import { eq } from "drizzle-orm";

export async function validateBusinessOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      console.log('User not authenticated');
      return res.status(401).json({
        ok: false,
        message: "Authentication required"
      });
    }

    // Check if user is a business user
    if (req.user?.role !== "business") {
      console.log('User is not a business user:', req.user?.role);
      return res.status(403).json({
        ok: false,
        message: "Access denied. Business account required."
      });
    }

    // Get businessId from URL parameter
    const businessId = parseInt(req.params.businessId);
    if (isNaN(businessId)) {
      console.log('Invalid business ID:', req.params.businessId);
      return res.status(400).json({
        ok: false,
        message: "Invalid business ID"
      });
    }

    // Verify business ownership
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      console.log('Business not found:', businessId);
      return res.status(404).json({
        ok: false,
        message: "Business not found"
      });
    }

    if (business.userId !== req.user.id) {
      console.log('Business ownership mismatch:', {
        businessUserId: business.userId,
        requestUserId: req.user.id
      });
      return res.status(403).json({
        ok: false,
        message: "Access denied. You don't own this business."
      });
    }

    // Store business in request for route handlers
    req.business = business;
    next();
  } catch (error) {
    console.error('Error in business ownership validation:', error);
    res.status(500).json({
      ok: false,
      message: "Internal server error"
    });
  }
}
