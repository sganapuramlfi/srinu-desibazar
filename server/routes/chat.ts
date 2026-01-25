import { Router } from "express";
import { db } from "../../db/index.js";
import { 
  chatConversations,
  chatMessages,
  typingIndicators,
  messageReadReceipts,
  chatPreferences,
  messageRateLimits,
  businessTenants,
  platformUsers
} from "../../db/index.js";
import { eq, and, desc, or, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/businessAccess.js";
import { z } from "zod";

const router = Router();

// =============================================================================
// RATE LIMITING HELPER
// =============================================================================

async function checkRateLimit(userId: number): Promise<{ allowed: boolean; reason?: string }> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get or create rate limit record
  let [rateLimit] = await db
    .select()
    .from(messageRateLimits)
    .where(eq(messageRateLimits.userId, userId))
    .limit(1);

  if (!rateLimit) {
    // Create new rate limit record
    [rateLimit] = await db
      .insert(messageRateLimits)
      .values({
        userId,
        hourlyCount: 0,
        hourlyResetAt: new Date(now.getTime() + 60 * 60 * 1000),
        dailyCount: 0,
        dailyResetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      })
      .returning();
  }

  // Check if flagged for spam
  if (rateLimit.flaggedForSpam) {
    return { allowed: false, reason: "Your account has been flagged for spam. Please contact support." };
  }

  // Reset counters if needed
  let needsUpdate = false;
  if (rateLimit.hourlyResetAt < now) {
    rateLimit.hourlyCount = 0;
    rateLimit.hourlyResetAt = new Date(now.getTime() + 60 * 60 * 1000);
    needsUpdate = true;
  }
  if (rateLimit.dailyResetAt < now) {
    rateLimit.dailyCount = 0;
    rateLimit.dailyResetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    needsUpdate = true;
  }

  // Check limits (30 messages per hour, 200 per day for consumers)
  if (rateLimit.hourlyCount >= 30) {
    return { allowed: false, reason: "Hourly message limit reached. Please try again later." };
  }
  if (rateLimit.dailyCount >= 200) {
    return { allowed: false, reason: "Daily message limit reached. Please try again tomorrow." };
  }

  // Update counters
  await db
    .update(messageRateLimits)
    .set({
      hourlyCount: rateLimit.hourlyCount + 1,
      dailyCount: rateLimit.dailyCount + 1,
      hourlyResetAt: rateLimit.hourlyResetAt,
      dailyResetAt: rateLimit.dailyResetAt
    })
    .where(eq(messageRateLimits.userId, userId));

  return { allowed: true };
}

// =============================================================================
// CONVERSATION MANAGEMENT
// =============================================================================

// Get all conversations for a user (consumer or business)
router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const userBusinessAccess = (req.user as any).businessAccess || [];
    const isConsumer = userBusinessAccess.length === 0;

    let conversations;
    
    if (isConsumer) {
      // Get consumer's conversations
      conversations = await db
        .select({
          conversation: chatConversations,
          business: {
            id: businessTenants.id,
            name: businessTenants.name,
            logoUrl: businessTenants.logoUrl,
            industryType: businessTenants.industryType
          }
        })
        .from(chatConversations)
        .innerJoin(businessTenants, eq(businessTenants.id, chatConversations.businessId))
        .where(eq(chatConversations.consumerId, userId))
        .orderBy(desc(chatConversations.lastMessageAt));
    } else {
      // Get business conversations
      const businessId = userBusinessAccess[0]?.businessId;
      if (!businessId) {
        return res.status(403).json({ error: "No business access" });
      }

      conversations = await db
        .select({
          conversation: chatConversations,
          consumer: {
            id: platformUsers.id,
            fullName: platformUsers.fullName,
            email: platformUsers.email,
            avatarUrl: platformUsers.avatarUrl
          }
        })
        .from(chatConversations)
        .innerJoin(platformUsers, eq(platformUsers.id, chatConversations.consumerId))
        .where(eq(chatConversations.businessId, businessId))
        .orderBy(desc(chatConversations.lastMessageAt));
    }

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Start or get existing conversation
router.post("/conversations/start", requireAuth, async (req, res) => {
  try {
    const { businessId, subject, contextType, contextId } = req.body;
    const userId = (req.user as any).id;
    const userBusinessAccess = (req.user as any).businessAccess || [];
    const isConsumer = userBusinessAccess.length === 0;

    if (!isConsumer) {
      return res.status(403).json({ error: "Only consumers can start conversations with businesses" });
    }

    if (!businessId) {
      return res.status(400).json({ error: "Business ID is required" });
    }

    // Check if conversation already exists
    let [existingConversation] = await db
      .select()
      .from(chatConversations)
      .where(and(
        eq(chatConversations.businessId, businessId),
        eq(chatConversations.consumerId, userId),
        eq(chatConversations.status, "active")
      ))
      .limit(1);

    if (existingConversation) {
      return res.json(existingConversation);
    }

    // Create new conversation
    const [newConversation] = await db
      .insert(chatConversations)
      .values({
        businessId,
        consumerId: userId,
        subject: subject || "New conversation",
        contextType: contextType || "general",
        contextId,
        status: "active"
      })
      .returning();

    res.json(newConversation);
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: "Failed to start conversation" });
  }
});

// =============================================================================
// MESSAGE HANDLING
// =============================================================================

// Get messages for a conversation
router.get("/conversations/:conversationId/messages", requireAuth, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const userId = (req.user as any).id;
    const { limit = 50, before } = req.query;

    // Verify user has access to this conversation
    const [conversation] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, conversationId))
      .limit(1);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Check if user is part of this conversation
    const userBusinessAccess = (req.user as any).businessAccess || [];
    const isConsumer = userBusinessAccess.length === 0;
    
    if (isConsumer && conversation.consumerId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    } else if (!isConsumer) {
      const businessId = userBusinessAccess[0]?.businessId;
      if (conversation.businessId !== businessId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Build query
    let query = db
      .select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.conversationId, conversationId),
        eq(chatMessages.isDeleted, false)
      ))
      .orderBy(desc(chatMessages.sentAt))
      .limit(parseInt(limit as string));

    // Add pagination
    if (before) {
      const beforeDate = new Date(before as string);
      query = query.where(and(
        eq(chatMessages.conversationId, conversationId),
        eq(chatMessages.isDeleted, false),
        lte(chatMessages.sentAt, beforeDate)
      ));
    }

    const messages = await query;

    // Mark messages as read if user is recipient
    if (messages.length > 0) {
      const unreadMessages = messages.filter(m => 
        m.senderId !== userId && m.status !== 'read'
      );

      if (unreadMessages.length > 0) {
        await db
          .update(chatMessages)
          .set({ 
            status: 'read',
            readAt: new Date()
          })
          .where(and(
            eq(chatMessages.conversationId, conversationId),
            eq(chatMessages.status, 'delivered')
          ));

        // Update unread count
        if (isConsumer) {
          await db
            .update(chatConversations)
            .set({ consumerUnreadCount: 0 })
            .where(eq(chatConversations.id, conversationId));
        } else {
          await db
            .update(chatConversations)
            .set({ businessUnreadCount: 0 })
            .where(eq(chatConversations.id, conversationId));
        }
      }
    }

    res.json(messages.reverse()); // Return in chronological order
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send a message
router.post("/conversations/:conversationId/messages", requireAuth, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const { content, messageType = "text", attachments = [], metadata = {} } = req.body;
    const userId = (req.user as any).id;
    const userFullName = (req.user as any).fullName || "User";

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Check rate limit for consumers
    const userBusinessAccess = (req.user as any).businessAccess || [];
    const isConsumer = userBusinessAccess.length === 0;
    
    if (isConsumer) {
      const rateLimitCheck = await checkRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ error: rateLimitCheck.reason });
      }
    }

    // Verify conversation exists and user has access
    const [conversation] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, conversationId))
      .limit(1);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Verify user is part of conversation
    if (isConsumer && conversation.consumerId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    } else if (!isConsumer) {
      const businessId = userBusinessAccess[0]?.businessId;
      if (conversation.businessId !== businessId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Create message
    const [newMessage] = await db
      .insert(chatMessages)
      .values({
        conversationId,
        senderId: userId,
        senderType: isConsumer ? "consumer" : "business",
        senderName: userFullName,
        content: content.trim(),
        messageType,
        attachments,
        metadata,
        status: "sent"
      })
      .returning();

    // Update conversation
    await db
      .update(chatConversations)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: content.trim().substring(0, 100),
        [isConsumer ? 'businessUnreadCount' : 'consumerUnreadCount']: sql`${isConsumer ? chatConversations.businessUnreadCount : chatConversations.consumerUnreadCount} + 1`
      })
      .where(eq(chatConversations.id, conversationId));

    // TODO: Send real-time notification via WebSocket/SSE

    res.json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// =============================================================================
// TYPING INDICATORS
// =============================================================================

// Start typing
router.post("/conversations/:conversationId/typing", requireAuth, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const userId = (req.user as any).id;
    const userBusinessAccess = (req.user as any).businessAccess || [];
    const isConsumer = userBusinessAccess.length === 0;

    // Set typing indicator (expires in 10 seconds)
    const expiresAt = new Date(Date.now() + 10 * 1000);

    await db
      .insert(typingIndicators)
      .values({
        conversationId,
        userId,
        userType: isConsumer ? "consumer" : "business",
        expiresAt
      })
      .onConflictDoUpdate({
        target: [typingIndicators.conversationId, typingIndicators.userId],
        set: { expiresAt }
      });

    // TODO: Notify other participant via WebSocket/SSE

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting typing indicator:', error);
    res.status(500).json({ error: "Failed to set typing indicator" });
  }
});

// =============================================================================
// CHAT PREFERENCES
// =============================================================================

// Get chat preferences
router.get("/preferences", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any).id;

    let [preferences] = await db
      .select()
      .from(chatPreferences)
      .where(eq(chatPreferences.userId, userId))
      .limit(1);

    if (!preferences) {
      // Create default preferences
      [preferences] = await db
        .insert(chatPreferences)
        .values({ userId })
        .returning();
    }

    res.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

// Update chat preferences
router.put("/preferences", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const updates = req.body;

    const [updatedPreferences] = await db
      .update(chatPreferences)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(chatPreferences.userId, userId))
      .returning();

    res.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

export default router;