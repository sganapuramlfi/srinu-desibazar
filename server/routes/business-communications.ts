import { Router } from "express";
import { db } from "../../db/index.js";
import { 
  businessCommunications,
  businessAlertPreferences,
  aiSuggestions,
  notificationQueue,
  businessTenants,
  platformUsers
} from "../../db/index.js";
import { eq, and, desc, gte, lte, sql, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireBusinessAccess } from "../middleware/businessAccess.js";

const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const communicationSchema = z.object({
  communicationType: z.enum([
    'constraint_violation', 'special_request', 'complaint', 
    'inquiry', 'booking_issue', 'ai_escalation', 'large_party',
    'off_hours_request', 'capacity_issue', 'general_inquiry'
  ]),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  priority: z.number().min(1).max(5).default(3),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  originalBookingRequest: z.object({}).optional(),
  constraintViolations: z.array(z.object({})).optional()
});

const messageSchema = z.object({
  message: z.string().min(1).max(2000),
  sender: z.enum(['customer', 'business', 'system', 'ai']),
  messageType: z.enum(['text', 'suggestion', 'resolution', 'system']).default('text')
});

const alertPreferencesSchema = z.object({
  emailAlerts: z.boolean().default(true),
  smsAlerts: z.boolean().default(false),
  inAppAlerts: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  constraintViolations: z.boolean().default(true),
  largePartyRequests: z.boolean().default(true),
  offHoursRequests: z.boolean().default(true),
  repeatCustomerIssues: z.boolean().default(true),
  newMessages: z.boolean().default(true),
  bookingConflicts: z.boolean().default(true),
  primaryEmail: z.string().email().optional(),
  smsPhone: z.string().optional(),
  notificationHours: z.object({
    start: z.string(),
    end: z.string(),
    timezone: z.string().default('UTC')
  }).optional()
});

// =============================================================================
// CUSTOMER COMMUNICATION ENDPOINTS
// =============================================================================

// Create new communication thread (public endpoint - no auth required)
router.post("/businesses/:businessId/communications", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const result = communicationSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: result.error.issues 
      });
    }

    // Verify business exists
    const [business] = await db
      .select()
      .from(businessTenants)
      .where(eq(businessTenants.id, businessId))
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Create initial message
    const initialMessage = {
      id: Date.now(),
      message: result.data.message,
      sender: 'customer',
      messageType: 'text',
      timestamp: new Date().toISOString(),
      customerName: result.data.customerName
    };

    // Create communication thread
    const [communication] = await db
      .insert(businessCommunications)
      .values({
        businessId,
        customerId: req.user?.id || null,
        communicationType: result.data.communicationType,
        subject: result.data.subject,
        messages: [initialMessage],
        priority: result.data.priority,
        customerName: result.data.customerName,
        customerPhone: result.data.customerPhone,
        customerEmail: result.data.customerEmail,
        originalBookingRequest: result.data.originalBookingRequest || {},
        constraintViolations: result.data.constraintViolations || [],
        sourcePage: req.headers.referer || 'direct',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Queue notification to business owner
    await queueBusinessNotification(communication, 'new_communication');

    // Generate AI suggestions if this is a constraint violation
    if (result.data.communicationType === 'constraint_violation' && result.data.constraintViolations) {
      await generateAISuggestions(communication, result.data.constraintViolations);
    }

    res.status(201).json({
      id: communication.id,
      threadId: communication.threadId,
      status: communication.status,
      message: "Communication thread created successfully"
    });

  } catch (error) {
    console.error('Error creating communication:', error);
    res.status(500).json({ error: "Failed to create communication thread" });
  }
});

// Get communication thread (accessible by customer or business)
router.get("/communications/:threadId", async (req, res) => {
  try {
    const threadId = req.params.threadId;

    const [communication] = await db
      .select({
        communication: businessCommunications,
        business: {
          id: businessTenants.id,
          name: businessTenants.name,
          email: businessTenants.email,
          phone: businessTenants.phone
        }
      })
      .from(businessCommunications)
      .leftJoin(businessTenants, eq(businessCommunications.businessId, businessTenants.id))
      .where(eq(businessCommunications.threadId, threadId))
      .limit(1);

    if (!communication) {
      return res.status(404).json({ error: "Communication thread not found" });
    }

    // Check access permissions
    const isBusinessOwner = req.user?.id && req.user.id === communication.business.id;
    const isCustomer = req.user?.id && req.user.id === communication.communication.customerId;
    const isPublicAccess = !req.user?.id; // Allow public access for guest customers

    if (!isBusinessOwner && !isCustomer && !isPublicAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get AI suggestions if available
    const suggestions = await db
      .select()
      .from(aiSuggestions)
      .where(eq(aiSuggestions.communicationId, communication.communication.id))
      .orderBy(desc(aiSuggestions.createdAt));

    res.json({
      ...communication.communication,
      business: communication.business,
      aiSuggestions: suggestions
    });

  } catch (error) {
    console.error('Error fetching communication:', error);
    res.status(500).json({ error: "Failed to fetch communication thread" });
  }
});

// Add message to communication thread
router.post("/communications/:threadId/messages", async (req, res) => {
  try {
    const threadId = req.params.threadId;
    const result = messageSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid message format", 
        details: result.error.issues 
      });
    }

    // Get current communication
    const [communication] = await db
      .select()
      .from(businessCommunications)
      .where(eq(businessCommunications.threadId, threadId))
      .limit(1);

    if (!communication) {
      return res.status(404).json({ error: "Communication thread not found" });
    }

    // Create new message
    const newMessage = {
      id: Date.now(),
      message: result.data.message,
      sender: result.data.sender,
      messageType: result.data.messageType,
      timestamp: new Date().toISOString(),
      senderName: req.user?.name || communication.customerName
    };

    // Append to messages array
    const currentMessages = communication.messages as any[] || [];
    const updatedMessages = [...currentMessages, newMessage];

    // Update communication
    const updateData: any = {
      messages: updatedMessages,
      updatedAt: new Date()
    };

    // Track business response time
    if (result.data.sender === 'business' && !communication.businessRespondedAt) {
      updateData.businessRespondedAt = new Date();
    }

    // Auto-update status if needed
    if (communication.status === 'open' && result.data.sender !== 'customer') {
      updateData.status = 'in_progress';
    }

    await db
      .update(businessCommunications)
      .set(updateData)
      .where(eq(businessCommunications.threadId, threadId));

    // Queue notification to the other party
    if (result.data.sender === 'customer') {
      await queueBusinessNotification(communication, 'new_message');
    } else if (result.data.sender === 'business') {
      await queueCustomerNotification(communication, 'business_response');
    }

    res.json({ 
      success: true, 
      messageId: newMessage.id,
      message: "Message added successfully" 
    });

  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: "Failed to add message" });
  }
});

// =============================================================================
// BUSINESS MANAGEMENT ENDPOINTS
// =============================================================================

// Get business communications dashboard
router.get("/businesses/:businessId/communications", requireBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let query = db
      .select({
        communication: businessCommunications,
        customer: {
          id: platformUsers.id,
          name: platformUsers.name,
          email: platformUsers.email
        }
      })
      .from(businessCommunications)
      .leftJoin(platformUsers, eq(businessCommunications.customerId, platformUsers.id))
      .where(eq(businessCommunications.businessId, businessId));

    if (status) {
      query = query.where(eq(businessCommunications.status, status));
    }

    const communications = await query
      .orderBy(desc(businessCommunications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get summary statistics
    const stats = await db
      .select({
        status: businessCommunications.status,
        count: sql<number>`count(*)`
      })
      .from(businessCommunications)
      .where(eq(businessCommunications.businessId, businessId))
      .groupBy(businessCommunications.status);

    res.json({
      communications,
      stats: stats.reduce((acc, stat) => {
        acc[stat.status] = stat.count;
        return acc;
      }, {} as Record<string, number>),
      pagination: {
        page,
        limit,
        hasMore: communications.length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching business communications:', error);
    res.status(500).json({ error: "Failed to fetch communications" });
  }
});

// Update communication status
router.put("/communications/:threadId/status", requireBusinessAccess, async (req, res) => {
  try {
    const threadId = req.params.threadId;
    const { status, resolution_type, customer_satisfaction_rating } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await db
      .update(businessCommunications)
      .set({
        status,
        resolutionType: resolution_type,
        customerSatisfactionRating: customer_satisfaction_rating,
        updatedAt: new Date()
      })
      .where(eq(businessCommunications.threadId, threadId));

    res.json({ success: true, message: "Status updated successfully" });

  } catch (error) {
    console.error('Error updating communication status:', error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// =============================================================================
// ALERT PREFERENCES ENDPOINTS
// =============================================================================

// Get business alert preferences
router.get("/businesses/:businessId/alert-preferences", requireBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);

    const [preferences] = await db
      .select()
      .from(businessAlertPreferences)
      .where(eq(businessAlertPreferences.businessId, businessId))
      .limit(1);

    if (!preferences) {
      // Create default preferences
      const [newPreferences] = await db
        .insert(businessAlertPreferences)
        .values({ businessId })
        .returning();
      
      return res.json(newPreferences);
    }

    res.json(preferences);

  } catch (error) {
    console.error('Error fetching alert preferences:', error);
    res.status(500).json({ error: "Failed to fetch alert preferences" });
  }
});

// Update business alert preferences
router.put("/businesses/:businessId/alert-preferences", requireBusinessAccess, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const result = alertPreferencesSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid preferences", 
        details: result.error.issues 
      });
    }

    await db
      .insert(businessAlertPreferences)
      .values({
        businessId,
        ...result.data,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: businessAlertPreferences.businessId,
        set: {
          ...result.data,
          updatedAt: new Date()
        }
      });

    res.json({ success: true, message: "Alert preferences updated successfully" });

  } catch (error) {
    console.error('Error updating alert preferences:', error);
    res.status(500).json({ error: "Failed to update alert preferences" });
  }
});

// =============================================================================
// AI SUGGESTIONS ENDPOINTS
// =============================================================================

// Get AI suggestions for a communication
router.get("/communications/:threadId/ai-suggestions", async (req, res) => {
  try {
    const threadId = req.params.threadId;

    // Get communication
    const [communication] = await db
      .select()
      .from(businessCommunications)
      .where(eq(businessCommunications.threadId, threadId))
      .limit(1);

    if (!communication) {
      return res.status(404).json({ error: "Communication not found" });
    }

    // Get AI suggestions
    const suggestions = await db
      .select()
      .from(aiSuggestions)
      .where(eq(aiSuggestions.communicationId, communication.id))
      .orderBy(desc(aiSuggestions.confidenceScore));

    res.json(suggestions);

  } catch (error) {
    console.error('Error fetching AI suggestions:', error);
    res.status(500).json({ error: "Failed to fetch AI suggestions" });
  }
});

// Accept AI suggestion
router.post("/ai-suggestions/:suggestionId/accept", async (req, res) => {
  try {
    const suggestionId = parseInt(req.params.suggestionId);

    await db
      .update(aiSuggestions)
      .set({
        customerAccepted: true,
        updatedAt: new Date()
      })
      .where(eq(aiSuggestions.id, suggestionId));

    res.json({ success: true, message: "AI suggestion accepted" });

  } catch (error) {
    console.error('Error accepting AI suggestion:', error);
    res.status(500).json({ error: "Failed to accept suggestion" });
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function queueBusinessNotification(communication: any, type: string) {
  try {
    // Get business alert preferences
    const [preferences] = await db
      .select()
      .from(businessAlertPreferences)
      .where(eq(businessAlertPreferences.businessId, communication.businessId))
      .limit(1);

    if (!preferences) return;

    const notifications = [];

    // Email notification
    if (preferences.emailAlerts) {
      notifications.push({
        businessId: communication.businessId,
        notificationType: 'email',
        subject: `New ${type.replace('_', ' ')} - ${communication.subject}`,
        messageText: `You have a new customer communication: ${communication.subject}`,
        data: { communicationId: communication.id, threadId: communication.threadId },
        priority: communication.priority
      });
    }

    // SMS notification for high priority
    if (preferences.smsAlerts && communication.priority <= 2) {
      notifications.push({
        businessId: communication.businessId,
        notificationType: 'sms',
        messageText: `Urgent: New customer request - ${communication.subject}`,
        data: { communicationId: communication.id }
      });
    }

    // Queue notifications
    if (notifications.length > 0) {
      await db.insert(notificationQueue).values(notifications);
    }

  } catch (error) {
    console.error('Error queuing business notification:', error);
  }
}

async function queueCustomerNotification(communication: any, type: string) {
  try {
    if (!communication.customerId) return;

    await db.insert(notificationQueue).values({
      userId: communication.customerId,
      notificationType: 'email',
      subject: `Response to your inquiry - ${communication.subject}`,
      messageText: `The business has responded to your inquiry.`,
      data: { threadId: communication.threadId }
    });

  } catch (error) {
    console.error('Error queuing customer notification:', error);
  }
}

async function generateAISuggestions(communication: any, violations: any[]) {
  try {
    // This is a simplified AI suggestion generator
    // In production, this would integrate with AbrakadabraAI
    
    for (const violation of violations) {
      let suggestionType = 'direct_contact';
      let primarySuggestion = {};
      let confidence = 0.8;

      switch (violation.constraintName) {
        case 'table_capacity':
          suggestionType = 'split_booking';
          primarySuggestion = {
            message: "I can help you split your party across multiple tables",
            action: "Show available table combinations",
            tables: [] // Would be populated with actual available tables
          };
          confidence = 0.9;
          break;

        case 'restaurant_policy':
          suggestionType = 'direct_contact';
          primarySuggestion = {
            message: "Let me connect you with the restaurant for special arrangements",
            action: "Initiate direct communication",
            contactInfo: communication.business
          };
          confidence = 0.95;
          break;

        case 'operating_hours':
          suggestionType = 'alternative_time';
          primarySuggestion = {
            message: "Here are available times during business hours",
            suggestedTimes: [], // Would be populated with actual available slots
            action: "Show alternative booking times"
          };
          confidence = 0.85;
          break;
      }

      await db.insert(aiSuggestions).values({
        communicationId: communication.id,
        businessId: communication.businessId,
        customerId: communication.customerId,
        originalConstraintType: violation.constraintName,
        constraintViolationData: violation,
        suggestionType,
        primarySuggestion,
        confidenceScore: confidence,
        reasoning: `Generated based on ${violation.constraintName} constraint violation`
      });
    }

  } catch (error) {
    console.error('Error generating AI suggestions:', error);
  }
}

export default router;