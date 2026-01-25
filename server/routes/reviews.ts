import { Router } from "express";
import { db } from "../../db/index.js";
import { 
  businessTenants,
  businessReviews,
  reviewTemplates,
  reviewAnalytics,
  platformUsers,
  bookings,
  restaurantOrders
} from "../../db/index.js";
import { eq, and, desc, asc, gte, lte, sql, count, avg } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Middleware to verify business ownership for review management
const verifyBusinessOwnership = async (req: any, res: any, next: any) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const businessId = parseInt(req.params.businessId);
    
    // Check if user has access to this business
    const hasAccess = req.user.businessAccess?.some((access: any) => 
      access.businessId === businessId && access.isActive && 
      (access.role === 'owner' || access.role === 'manager')
    );

    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this business" });
    }

    req.businessId = businessId;
    next();
  } catch (error) {
    console.error('Business ownership verification error:', error);
    res.status(500).json({ error: "Server error" });
  }
};

// Validation schemas
const reviewResponseSchema = z.object({
  response: z.string().min(1, "Response cannot be empty").max(1000, "Response too long"),
  templateId: z.number().optional()
});

const verifiedReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().max(255).optional(),
  comment: z.string().max(2000).optional(),
  bookingId: z.number().optional(),
  orderId: z.number().optional()
}).refine(data => data.bookingId || data.orderId, {
  message: "Either bookingId or orderId is required for verified reviews"
});

const reviewTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  category: z.enum(["positive", "negative", "neutral", "complaint", "compliment"]),
  template: z.string().min(1, "Template content is required").max(1000),
  description: z.string().optional()
});

const flagReviewSchema = z.object({
  reason: z.string().min(1, "Flag reason is required").max(500)
});

// =============================================================================
// REVIEW MANAGEMENT ENDPOINTS
// =============================================================================

// Get all reviews for a business with filtering and pagination
router.get("/businesses/:businessId/reviews", verifyBusinessOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { 
      status = "all", 
      rating, 
      responded, 
      source = "all", 
      page = 1, 
      limit = 20,
      sortBy = "newest"
    } = req.query;

    let query = db
      .select({
        review: businessReviews,
        customer: {
          id: platformUsers.id,
          fullName: platformUsers.fullName,
          email: platformUsers.email
        }
      })
      .from(businessReviews)
      .leftJoin(platformUsers, eq(businessReviews.customerId, platformUsers.id))
      .where(eq(businessReviews.businessId, businessId));

    // Apply filters
    if (status !== "all") {
      query = query.where(and(
        eq(businessReviews.businessId, businessId),
        eq(businessReviews.responseStatus, status as string)
      ));
    }

    if (rating) {
      query = query.where(and(
        eq(businessReviews.businessId, businessId),
        eq(businessReviews.rating, parseInt(rating as string))
      ));
    }

    if (responded === "true") {
      query = query.where(and(
        eq(businessReviews.businessId, businessId),
        sql`${businessReviews.businessResponse} IS NOT NULL`
      ));
    } else if (responded === "false") {
      query = query.where(and(
        eq(businessReviews.businessId, businessId),
        sql`${businessReviews.businessResponse} IS NULL`
      ));
    }

    if (source !== "all") {
      query = query.where(and(
        eq(businessReviews.businessId, businessId),
        eq(businessReviews.source, source as string)
      ));
    }

    // Apply sorting
    switch (sortBy) {
      case "oldest":
        query = query.orderBy(asc(businessReviews.reviewDate));
        break;
      case "rating_high":
        query = query.orderBy(desc(businessReviews.rating), desc(businessReviews.reviewDate));
        break;
      case "rating_low":
        query = query.orderBy(asc(businessReviews.rating), desc(businessReviews.reviewDate));
        break;
      case "newest":
      default:
        query = query.orderBy(desc(businessReviews.reviewDate));
        break;
    }

    // Apply pagination
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const reviews = await query
      .limit(parseInt(limit as string))
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(businessReviews)
      .where(eq(businessReviews.businessId, businessId));

    res.json({
      reviews: reviews.map(r => ({
        ...r.review,
        customer: r.customer
      })),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount[0].count,
        pages: Math.ceil(totalCount[0].count / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// Get review statistics and analytics
router.get("/businesses/:businessId/reviews/stats", verifyBusinessOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);

    // Get basic review statistics
    const stats = await db
      .select({
        totalReviews: count(),
        averageRating: avg(businessReviews.rating),
        fiveStars: sql<number>`count(case when ${businessReviews.rating} = 5 then 1 end)`,
        fourStars: sql<number>`count(case when ${businessReviews.rating} = 4 then 1 end)`,
        threeStars: sql<number>`count(case when ${businessReviews.rating} = 3 then 1 end)`,
        twoStars: sql<number>`count(case when ${businessReviews.rating} = 2 then 1 end)`,
        oneStar: sql<number>`count(case when ${businessReviews.rating} = 1 then 1 end)`,
        totalResponses: sql<number>`count(case when ${businessReviews.businessResponse} is not null then 1 end)`,
        pendingResponses: sql<number>`count(case when ${businessReviews.responseStatus} = 'pending' then 1 end)`
      })
      .from(businessReviews)
      .where(eq(businessReviews.businessId, businessId));

    const reviewStats = stats[0];
    const responseRate = reviewStats.totalReviews > 0 
      ? ((reviewStats.totalResponses / reviewStats.totalReviews) * 100).toFixed(2)
      : "0.00";

    // Get recent reviews (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReviews = await db
      .select({ count: count() })
      .from(businessReviews)
      .where(and(
        eq(businessReviews.businessId, businessId),
        gte(businessReviews.reviewDate, sevenDaysAgo)
      ));

    res.json({
      overview: {
        totalReviews: reviewStats.totalReviews,
        averageRating: parseFloat(reviewStats.averageRating || "0").toFixed(2),
        responseRate: parseFloat(responseRate),
        pendingResponses: reviewStats.pendingResponses,
        recentReviews: recentReviews[0].count
      },
      ratingDistribution: {
        5: reviewStats.fiveStars,
        4: reviewStats.fourStars,
        3: reviewStats.threeStars,
        2: reviewStats.twoStars,
        1: reviewStats.oneStar
      },
      responseStats: {
        total: reviewStats.totalResponses,
        pending: reviewStats.pendingResponses,
        rate: parseFloat(responseRate)
      }
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ error: "Failed to fetch review statistics" });
  }
});

// Respond to a review
router.post("/businesses/:businessId/reviews/:reviewId/respond", verifyBusinessOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const reviewId = parseInt(req.params.reviewId);
    const result = reviewResponseSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: result.error.issues 
      });
    }

    // Update the review with response
    const [updatedReview] = await db
      .update(businessReviews)
      .set({
        businessResponse: result.data.response,
        respondedAt: new Date(),
        respondedBy: req.user.id,
        responseStatus: "responded",
        updatedAt: new Date()
      })
      .where(and(
        eq(businessReviews.id, reviewId),
        eq(businessReviews.businessId, businessId)
      ))
      .returning();

    if (!updatedReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Update template usage count if template was used
    if (result.data.templateId) {
      await db
        .update(reviewTemplates)
        .set({
          usageCount: sql`${reviewTemplates.usageCount} + 1`,
          updatedAt: new Date()
        })
        .where(and(
          eq(reviewTemplates.id, result.data.templateId),
          eq(reviewTemplates.businessId, businessId)
        ));
    }

    res.json(updatedReview);
  } catch (error) {
    console.error('Error responding to review:', error);
    res.status(500).json({ error: "Failed to respond to review" });
  }
});

// Flag a review
router.post("/businesses/:businessId/reviews/:reviewId/flag", verifyBusinessOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const reviewId = parseInt(req.params.reviewId);
    const result = flagReviewSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: result.error.issues 
      });
    }

    const [flaggedReview] = await db
      .update(businessReviews)
      .set({
        responseStatus: "flagged",
        flagReason: result.data.reason,
        flaggedAt: new Date(),
        flaggedBy: req.user.id,
        updatedAt: new Date()
      })
      .where(and(
        eq(businessReviews.id, reviewId),
        eq(businessReviews.businessId, businessId)
      ))
      .returning();

    if (!flaggedReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.json(flaggedReview);
  } catch (error) {
    console.error('Error flagging review:', error);
    res.status(500).json({ error: "Failed to flag review" });
  }
});

// =============================================================================
// REVIEW TEMPLATES MANAGEMENT
// =============================================================================

// Get review templates
router.get("/businesses/:businessId/review-templates", verifyBusinessOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { category = "all" } = req.query;

    let query = db
      .select()
      .from(reviewTemplates)
      .where(and(
        eq(reviewTemplates.businessId, businessId),
        eq(reviewTemplates.isActive, true)
      ));

    if (category !== "all") {
      query = query.where(and(
        eq(reviewTemplates.businessId, businessId),
        eq(reviewTemplates.category, category as string),
        eq(reviewTemplates.isActive, true)
      ));
    }

    const templates = await query.orderBy(desc(reviewTemplates.usageCount), asc(reviewTemplates.name));

    res.json(templates);
  } catch (error) {
    console.error('Error fetching review templates:', error);
    res.status(500).json({ error: "Failed to fetch review templates" });
  }
});

// Create review template
router.post("/businesses/:businessId/review-templates", verifyBusinessOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const result = reviewTemplateSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: result.error.issues 
      });
    }

    const [template] = await db
      .insert(reviewTemplates)
      .values({
        businessId,
        ...result.data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.json(template);
  } catch (error) {
    console.error('Error creating review template:', error);
    res.status(500).json({ error: "Failed to create review template" });
  }
});

// Update review template
router.put("/businesses/:businessId/review-templates/:templateId", verifyBusinessOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const templateId = parseInt(req.params.templateId);
    const result = reviewTemplateSchema.partial().safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: result.error.issues 
      });
    }

    const [updatedTemplate] = await db
      .update(reviewTemplates)
      .set({
        ...result.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(reviewTemplates.id, templateId),
        eq(reviewTemplates.businessId, businessId)
      ))
      .returning();

    if (!updatedTemplate) {
      return res.status(404).json({ error: "Review template not found" });
    }

    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating review template:', error);
    res.status(500).json({ error: "Failed to update review template" });
  }
});

// Delete review template
router.delete("/businesses/:businessId/review-templates/:templateId", verifyBusinessOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const templateId = parseInt(req.params.templateId);

    const [deletedTemplate] = await db
      .update(reviewTemplates)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(reviewTemplates.id, templateId),
        eq(reviewTemplates.businessId, businessId)
      ))
      .returning();

    if (!deletedTemplate) {
      return res.status(404).json({ error: "Review template not found" });
    }

    res.json({ message: "Review template deleted successfully" });
  } catch (error) {
    console.error('Error deleting review template:', error);
    res.status(500).json({ error: "Failed to delete review template" });
  }
});

// =============================================================================
// PUBLIC REVIEW ENDPOINTS (for customers and storefront)
// =============================================================================

// Get public reviews for a business (for storefront display)
router.get("/businesses/:businessId/reviews/public", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { limit = 10, page = 1, minRating = 1 } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const reviews = await db
      .select({
        id: businessReviews.id,
        rating: businessReviews.rating,
        title: businessReviews.title,
        comment: businessReviews.comment,
        customerName: platformUsers.fullName,
        businessResponse: businessReviews.businessResponse,
        reviewDate: businessReviews.reviewDate,
        respondedAt: businessReviews.respondedAt,
        isVerified: sql<boolean>`${businessReviews}.consumption_verified`
      })
      .from(businessReviews)
      .leftJoin(platformUsers, eq(businessReviews.customerId, platformUsers.id))
      .where(and(
        eq(businessReviews.businessId, businessId),
        sql<boolean>`${businessReviews}.is_published = true`,
        gte(businessReviews.rating, parseInt(minRating as string))
      ))
      .orderBy(desc(businessReviews.reviewDate))
      .limit(parseInt(limit as string))
      .offset(offset);

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching public reviews:', error);
    res.status(500).json({ error: "Failed to fetch public reviews" });
  }
});

// Check consumption eligibility for authenticated user
router.get("/businesses/:businessId/reviews/eligibility", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const businessId = parseInt(req.params.businessId);
    const userId = req.user.id;

    // Check for completed bookings
    const completedBookings = await db
      .select({ id: bookings.id, bookingDate: bookings.bookingDate, status: bookings.status })
      .from(bookings)
      .where(and(
        eq(bookings.customerId, userId),
        eq(bookings.businessId, businessId),
        eq(bookings.status, "completed")
      ))
      .orderBy(desc(bookings.bookingDate));

    // Check for completed orders
    const completedOrders = await db
      .select({ id: restaurantOrders.id, orderedAt: restaurantOrders.orderedAt, status: restaurantOrders.status })
      .from(restaurantOrders)
      .where(and(
        eq(restaurantOrders.customerId, userId),
        eq(restaurantOrders.businessId, businessId),
        eq(restaurantOrders.status, "completed")
      ))
      .orderBy(desc(restaurantOrders.orderedAt));

    // Check for existing reviews to prevent duplicates
    const existingReviews = await db
      .select({ bookingId: businessReviews.bookingId, orderId: businessReviews.orderId })
      .from(businessReviews)
      .where(and(
        eq(businessReviews.customerId, userId),
        eq(businessReviews.businessId, businessId)
      ));

    // Filter out already reviewed consumptions
    const reviewedBookingIds = existingReviews.map(r => r.bookingId).filter(Boolean);
    const reviewedOrderIds = existingReviews.map(r => r.orderId).filter(Boolean);

    const eligibleBookings = completedBookings.filter(b => !reviewedBookingIds.includes(b.id));
    const eligibleOrders = completedOrders.filter(o => !reviewedOrderIds.includes(o.id));

    const canReview = eligibleBookings.length > 0 || eligibleOrders.length > 0;

    res.json({
      canReview,
      eligibleConsumptions: {
        bookings: eligibleBookings,
        orders: eligibleOrders
      },
      message: canReview 
        ? "User has eligible completed transactions for review"
        : "User has no available completed transactions to review"
    });
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({ error: "Failed to check review eligibility" });
  }
});

// Submit a verified consumption review (authenticated users only)
router.post("/businesses/:businessId/reviews/submit", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        error: "Authentication required",
        message: "Only registered users who have consumed services can submit reviews"
      });
    }

    const businessId = parseInt(req.params.businessId);
    const userId = req.user.id;
    const result = verifiedReviewSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid review data", 
        details: result.error.issues 
      });
    }

    const { rating, title, comment, bookingId, orderId } = result.data;

    // Verify consumption exists and belongs to user
    let consumptionValid = false;
    let verificationType = "";

    if (bookingId) {
      const booking = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.id, bookingId),
          eq(bookings.customerId, userId),
          eq(bookings.businessId, businessId),
          eq(bookings.status, "completed")
        ))
        .limit(1);
      
      if (booking.length > 0) {
        consumptionValid = true;
        verificationType = "booking";
      }
    } else if (orderId) {
      const order = await db
        .select()
        .from(restaurantOrders)
        .where(and(
          eq(restaurantOrders.id, orderId),
          eq(restaurantOrders.customerId, userId),
          eq(restaurantOrders.businessId, businessId),
          eq(restaurantOrders.status, "completed")
        ))
        .limit(1);
      
      if (order.length > 0) {
        consumptionValid = true;
        verificationType = "order";
      }
    }

    if (!consumptionValid) {
      return res.status(403).json({ 
        error: "Invalid consumption reference",
        message: "You can only review services you have actually consumed"
      });
    }

    // Check for duplicate review on same consumption
    const existingReview = await db
      .select()
      .from(businessReviews)
      .where(and(
        eq(businessReviews.customerId, userId),
        bookingId ? eq(businessReviews.bookingId, bookingId) : sql`1=1`,
        orderId ? eq(businessReviews.orderId, orderId) : sql`1=1`
      ))
      .limit(1);

    if (existingReview.length > 0) {
      return res.status(409).json({ 
        error: "Review already exists",
        message: "You have already reviewed this booking/order"
      });
    }

    // Create verified review
    const [newReview] = await db
      .insert(businessReviews)
      .values({
        businessId,
        customerId: userId,
        bookingId: bookingId || null,
        orderId: orderId || null,
        rating,
        title: title || null,
        comment: comment || null,
        source: "platform",
        consumptionVerified: true,
        verificationType,
        responseStatus: "pending",
        reviewDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Get customer name for response
    const customerInfo = await db
      .select({ fullName: platformUsers.fullName })
      .from(platformUsers)
      .where(eq(platformUsers.id, userId))
      .limit(1);

    res.json({
      ...newReview,
      customerName: customerInfo[0]?.fullName,
      verified: true,
      verificationType
    });
  } catch (error) {
    console.error('Error submitting verified review:', error);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

export default router;