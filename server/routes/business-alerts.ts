import { Router } from "express";
import { db } from "../../db/index.js";
import { 
  businessCommunications,
  businessAlertPreferences,
  aiSuggestions,
  notificationQueue,
  communicationAnalytics,
  businessTenants,
  bookingOperations,
  bookings
} from "../../db/index.js";
import { eq, and, desc, gte, lte, sql, count, avg, sum } from "drizzle-orm";
import { z } from "zod";
import { requireBusinessAccess } from "../middleware/businessAccess.js";

const router = Router();

// =============================================================================
// REAL-TIME BUSINESS ALERTS API
// =============================================================================

// Get real-time alerts dashboard
router.get("/businesses/:businessId/alerts/dashboard", requireBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const timeRange = req.query.timeRange as string || '24h'; // 1h, 24h, 7d, 30d

    // Calculate time filter
    const now = new Date();
    let timeFilter: Date;
    switch (timeRange) {
      case '1h': timeFilter = new Date(now.getTime() - 60 * 60 * 1000); break;
      case '24h': timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case '7d': timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      default: timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get active communications (open/in_progress)
    const activeCommunications = await db
      .select({
        id: businessCommunications.id,
        threadId: businessCommunications.threadId,
        subject: businessCommunications.subject,
        communicationType: businessCommunications.communicationType,
        priority: businessCommunications.priority,
        status: businessCommunications.status,
        customerName: businessCommunications.customerName,
        customerPhone: businessCommunications.customerPhone,
        createdAt: businessCommunications.createdAt,
        businessRespondedAt: businessCommunications.businessRespondedAt,
        constraintViolations: businessCommunications.constraintViolations,
        aiResolutionAttempted: businessCommunications.aiResolutionAttempted
      })
      .from(businessCommunications)
      .where(and(
        eq(businessCommunications.businessId, businessId),
        sql`${businessCommunications.status} IN ('open', 'in_progress')`,
        gte(businessCommunications.createdAt, timeFilter)
      ))
      .orderBy(desc(businessCommunications.priority), desc(businessCommunications.createdAt));

    // Get constraint violation stats
    const constraintStats = await db
      .select({
        violationType: sql<string>`(constraint_violations->0->>'constraintName')`,
        count: count()
      })
      .from(businessCommunications)
      .where(and(
        eq(businessCommunications.businessId, businessId),
        eq(businessCommunications.communicationType, 'constraint_violation'),
        gte(businessCommunications.createdAt, timeFilter)
      ))
      .groupBy(sql`(constraint_violations->0->>'constraintName')`)
      .orderBy(desc(count()));

    // Get AI suggestions performance
    const aiStats = await db
      .select({
        totalSuggestions: count(),
        acceptedSuggestions: sql<number>`COUNT(CASE WHEN customer_accepted = true THEN 1 END)`,
        avgConfidence: avg(aiSuggestions.confidenceScore),
        totalRevenue: sum(aiSuggestions.revenueRecovered)
      })
      .from(aiSuggestions)
      .where(and(
        eq(aiSuggestions.businessId, businessId),
        gte(aiSuggestions.createdAt, timeFilter)
      ));

    // Get recent booking operations (failed bookings)
    const recentFailures = await db
      .select({
        id: bookingOperations.id,
        operationType: bookingOperations.operationType,
        constraintViolations: bookingOperations.constraintViolations,
        createdAt: bookingOperations.createdAt,
        operationData: bookingOperations.operationData
      })
      .from(bookingOperations)
      .where(and(
        eq(bookingOperations.businessId, businessId),
        eq(bookingOperations.constraintsPassed, false),
        gte(bookingOperations.createdAt, timeFilter)
      ))
      .orderBy(desc(bookingOperations.createdAt))
      .limit(10);

    // Calculate response time metrics
    const responseMetrics = await db
      .select({
        avgResponseTime: avg(businessCommunications.businessResponseTimeMinutes),
        unrespondedCount: sql<number>`COUNT(CASE WHEN business_responded_at IS NULL THEN 1 END)`,
        totalCommunications: count()
      })
      .from(businessCommunications)
      .where(and(
        eq(businessCommunications.businessId, businessId),
        gte(businessCommunications.createdAt, timeFilter)
      ));

    res.json({
      timeRange,
      activeCommunications,
      stats: {
        totalActive: activeCommunications.length,
        highPriority: activeCommunications.filter(c => c.priority <= 2).length,
        needsResponse: activeCommunications.filter(c => !c.businessRespondedAt).length,
        constraintViolations: constraintStats,
        aiSuggestions: aiStats[0] || {
          totalSuggestions: 0,
          acceptedSuggestions: 0,
          avgConfidence: 0,
          totalRevenue: 0
        },
        responseMetrics: responseMetrics[0] || {
          avgResponseTime: 0,
          unrespondedCount: 0,
          totalCommunications: 0
        }
      },
      recentFailures,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Error fetching alerts dashboard:', error);
    res.status(500).json({ error: "Failed to fetch alerts dashboard" });
  }
});

// Get urgent alerts (high priority, unresponded)
router.get("/businesses/:businessId/alerts/urgent", requireBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);

    const urgentAlerts = await db
      .select({
        id: businessCommunications.id,
        threadId: businessCommunications.threadId,
        subject: businessCommunications.subject,
        communicationType: businessCommunications.communicationType,
        priority: businessCommunications.priority,
        customerName: businessCommunications.customerName,
        customerPhone: businessCommunications.customerPhone,
        createdAt: businessCommunications.createdAt,
        constraintViolations: businessCommunications.constraintViolations,
        originalBookingRequest: businessCommunications.originalBookingRequest,
        minutesSinceCreated: sql<number>`EXTRACT(EPOCH FROM (NOW() - created_at)) / 60`
      })
      .from(businessCommunications)
      .where(and(
        eq(businessCommunications.businessId, businessId),
        sql`${businessCommunications.status} IN ('open', 'in_progress')`,
        lte(businessCommunications.priority, 2),
        sql`business_responded_at IS NULL`
      ))
      .orderBy(businessCommunications.priority, businessCommunications.createdAt)
      .limit(10);

    res.json({
      urgentAlerts,
      count: urgentAlerts.length,
      criticalCount: urgentAlerts.filter(a => a.priority === 1).length
    });

  } catch (error) {
    console.error('Error fetching urgent alerts:', error);
    res.status(500).json({ error: "Failed to fetch urgent alerts" });
  }
});

// Get constraint violation analytics
router.get("/businesses/:businessId/alerts/analytics", requireBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const days = parseInt(req.query.days as string) || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Daily constraint violation trends
    const dailyTrends = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        constraintViolations: count(),
        largePartyRequests: sql<number>`COUNT(CASE WHEN communication_type = 'large_party' THEN 1 END)`,
        offHoursRequests: sql<number>`COUNT(CASE WHEN communication_type = 'off_hours_request' THEN 1 END)`,
        capacityIssues: sql<number>`COUNT(CASE WHEN communication_type = 'capacity_issue' THEN 1 END)`,
        avgResponseTime: avg(businessCommunications.businessResponseTimeMinutes)
      })
      .from(businessCommunications)
      .where(and(
        eq(businessCommunications.businessId, businessId),
        gte(businessCommunications.createdAt, startDate)
      ))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at) DESC`);

    // Top constraint types
    const topConstraints = await db
      .select({
        constraintType: sql<string>`(constraint_violations->0->>'constraintName')`,
        count: count(),
        resolvedCount: sql<number>`COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)`,
        avgSeverity: avg(businessCommunications.priority),
        potentialRevenue: sql<number>`SUM(CAST(original_booking_request->>'partySize' AS INTEGER) * 50)` // Estimate $50 per person
      })
      .from(businessCommunications)
      .where(and(
        eq(businessCommunications.businessId, businessId),
        gte(businessCommunications.createdAt, startDate),
        sql`constraint_violations IS NOT NULL AND constraint_violations != '[]'`
      ))
      .groupBy(sql`(constraint_violations->0->>'constraintName')`)
      .orderBy(desc(count()))
      .limit(10);

    // AI suggestion effectiveness
    const aiEffectiveness = await db
      .select({
        suggestionType: aiSuggestions.suggestionType,
        totalSuggestions: count(),
        acceptedSuggestions: sql<number>`COUNT(CASE WHEN customer_accepted = true THEN 1 END)`,
        avgConfidence: avg(aiSuggestions.confidenceScore),
        revenueRecovered: sum(aiSuggestions.revenueRecovered),
        acceptanceRate: sql<number>`ROUND(COUNT(CASE WHEN customer_accepted = true THEN 1 END) * 100.0 / COUNT(*), 2)`
      })
      .from(aiSuggestions)
      .where(and(
        eq(aiSuggestions.businessId, businessId),
        gte(aiSuggestions.createdAt, startDate)
      ))
      .groupBy(aiSuggestions.suggestionType)
      .orderBy(desc(sql`COUNT(CASE WHEN customer_accepted = true THEN 1 END)`));

    // Peak violation times
    const peakTimes = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM created_at)`,
        dayOfWeek: sql<number>`EXTRACT(DOW FROM created_at)`,
        violationCount: count()
      })
      .from(businessCommunications)
      .where(and(
        eq(businessCommunications.businessId, businessId),
        gte(businessCommunications.createdAt, startDate),
        sql`communication_type IN ('constraint_violation', 'large_party', 'capacity_issue')`
      ))
      .groupBy(sql`EXTRACT(HOUR FROM created_at), EXTRACT(DOW FROM created_at)`)
      .orderBy(desc(count()));

    res.json({
      period: `${days} days`,
      dailyTrends,
      topConstraints,
      aiEffectiveness,
      peakTimes: {
        byHour: peakTimes.reduce((acc, curr) => {
          acc[curr.hour] = (acc[curr.hour] || 0) + curr.violationCount;
          return acc;
        }, {} as Record<number, number>),
        byDayOfWeek: peakTimes.reduce((acc, curr) => {
          acc[curr.dayOfWeek] = (acc[curr.dayOfWeek] || 0) + curr.violationCount;
          return acc;
        }, {} as Record<number, number>)
      },
      insights: {
        totalViolations: dailyTrends.reduce((sum, day) => sum + day.constraintViolations, 0),
        avgDailyViolations: dailyTrends.length > 0 ? 
          Math.round(dailyTrends.reduce((sum, day) => sum + day.constraintViolations, 0) / dailyTrends.length) : 0,
        mostCommonConstraint: topConstraints[0]?.constraintType || 'none',
        estimatedLostRevenue: topConstraints.reduce((sum, constraint) => sum + (constraint.potentialRevenue || 0), 0)
      }
    });

  } catch (error) {
    console.error('Error fetching constraint analytics:', error);
    res.status(500).json({ error: "Failed to fetch constraint analytics" });
  }
});

// =============================================================================
// ALERT MANAGEMENT ENDPOINTS
// =============================================================================

// Mark alert as acknowledged
router.post("/businesses/:businessId/alerts/:communicationId/acknowledge", requireBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const communicationId = parseInt(req.params.communicationId);

    await db
      .update(businessCommunications)
      .set({
        businessNotifiedAt: new Date(),
        status: 'in_progress',
        updatedAt: new Date()
      })
      .where(and(
        eq(businessCommunications.id, communicationId),
        eq(businessCommunications.businessId, businessId)
      ));

    res.json({ success: true, message: "Alert acknowledged" });

  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: "Failed to acknowledge alert" });
  }
});

// Bulk acknowledge alerts
router.post("/businesses/:businessId/alerts/bulk-acknowledge", requireBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { communicationIds } = req.body;

    if (!Array.isArray(communicationIds)) {
      return res.status(400).json({ error: "communicationIds must be an array" });
    }

    await db
      .update(businessCommunications)
      .set({
        businessNotifiedAt: new Date(),
        status: 'in_progress',
        updatedAt: new Date()
      })
      .where(and(
        sql`${businessCommunications.id} = ANY(${communicationIds})`,
        eq(businessCommunications.businessId, businessId)
      ));

    res.json({ 
      success: true, 
      message: `${communicationIds.length} alerts acknowledged`,
      acknowledgedCount: communicationIds.length
    });

  } catch (error) {
    console.error('Error bulk acknowledging alerts:', error);
    res.status(500).json({ error: "Failed to acknowledge alerts" });
  }
});

// Snooze alert (delay notification)
router.post("/businesses/:businessId/alerts/:communicationId/snooze", requireBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const communicationId = parseInt(req.params.communicationId);
    const { minutes } = req.body;

    if (!minutes || minutes < 5 || minutes > 1440) { // 5 min to 24 hours
      return res.status(400).json({ error: "Snooze minutes must be between 5 and 1440" });
    }

    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);

    // Create a delayed notification
    await db.insert(notificationQueue).values({
      businessId,
      notificationType: 'in_app',
      subject: 'Snoozed Alert Reminder',
      messageText: `Reminder: You have a snoozed customer communication that needs attention.`,
      data: { communicationId, originalSnoozeTime: new Date() },
      scheduledFor: snoozeUntil,
      priority: 2
    });

    res.json({ 
      success: true, 
      message: `Alert snoozed for ${minutes} minutes`,
      snoozeUntil
    });

  } catch (error) {
    console.error('Error snoozing alert:', error);
    res.status(500).json({ error: "Failed to snooze alert" });
  }
});

// =============================================================================
// AI SUGGESTION MANAGEMENT
// =============================================================================

// Approve/reject AI suggestion
router.post("/businesses/:businessId/ai-suggestions/:suggestionId/approve", requireBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const suggestionId = parseInt(req.params.suggestionId);
    const { approved, notes } = req.body;

    await db
      .update(aiSuggestions)
      .set({
        businessApproved: approved,
        businessNotes: notes,
        updatedAt: new Date()
      })
      .where(and(
        eq(aiSuggestions.id, suggestionId),
        eq(aiSuggestions.businessId, businessId)
      ));

    res.json({ 
      success: true, 
      message: `AI suggestion ${approved ? 'approved' : 'rejected'}` 
    });

  } catch (error) {
    console.error('Error updating AI suggestion approval:', error);
    res.status(500).json({ error: "Failed to update AI suggestion" });
  }
});

// Get pending AI suggestions for review
router.get("/businesses/:businessId/ai-suggestions/pending", requireBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);

    const pendingSuggestions = await db
      .select({
        id: aiSuggestions.id,
        communicationId: aiSuggestions.communicationId,
        suggestionType: aiSuggestions.suggestionType,
        primarySuggestion: aiSuggestions.primarySuggestion,
        confidenceScore: aiSuggestions.confidenceScore,
        reasoning: aiSuggestions.reasoning,
        customerViewed: aiSuggestions.customerViewed,
        createdAt: aiSuggestions.createdAt,
        communication: {
          subject: businessCommunications.subject,
          customerName: businessCommunications.customerName,
          priority: businessCommunications.priority
        }
      })
      .from(aiSuggestions)
      .innerJoin(businessCommunications, eq(aiSuggestions.communicationId, businessCommunications.id))
      .where(and(
        eq(aiSuggestions.businessId, businessId),
        sql`business_approved IS NULL`,
        gte(aiSuggestions.createdAt, sql`NOW() - INTERVAL '7 days'`)
      ))
      .orderBy(desc(aiSuggestions.confidenceScore), desc(aiSuggestions.createdAt));

    res.json({
      pendingSuggestions,
      count: pendingSuggestions.length,
      highConfidenceCount: pendingSuggestions.filter(s => parseFloat(s.confidenceScore.toString()) > 0.9).length
    });

  } catch (error) {
    console.error('Error fetching pending AI suggestions:', error);
    res.status(500).json({ error: "Failed to fetch pending AI suggestions" });
  }
});

export default router;