import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businessTenants, platformUsers } from "./schema";

// =============================================================================
// REAL-TIME MESSAGING SCHEMA
// =============================================================================

// Chat conversations between businesses and consumers
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  conversationId: uuid("conversation_id").defaultRandom().unique().notNull(),
  
  // Participants
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  consumerId: integer("consumer_id").references(() => platformUsers.id, { onDelete: 'cascade' }).notNull(),
  
  // Conversation metadata
  subject: text("subject"), // Optional subject/topic
  status: text("status", {
    enum: ["active", "archived", "blocked"]
  }).default("active").notNull(),
  
  // Last activity tracking for sorting
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  lastMessagePreview: text("last_message_preview"),
  
  // Unread counts
  businessUnreadCount: integer("business_unread_count").default(0),
  consumerUnreadCount: integer("consumer_unread_count").default(0),
  
  // Conversation context (booking, order, general inquiry)
  contextType: text("context_type", {
    enum: ["booking", "order", "inquiry", "support", "general"]
  }).default("general"),
  contextId: integer("context_id"), // Reference to booking/order if applicable
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  businessIdx: index("chat_conv_business_idx").on(table.businessId),
  consumerIdx: index("chat_conv_consumer_idx").on(table.consumerId),
  lastMessageIdx: index("chat_conv_last_msg_idx").on(table.lastMessageAt),
  uniqueParticipants: index("unique_participants_idx").on(table.businessId, table.consumerId),
}));

// Individual chat messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  messageId: uuid("message_id").defaultRandom().unique().notNull(),
  conversationId: integer("conversation_id").references(() => chatConversations.id, { onDelete: 'cascade' }).notNull(),
  
  // Sender info
  senderId: integer("sender_id").references(() => platformUsers.id).notNull(),
  senderType: text("sender_type", {
    enum: ["business", "consumer", "system"]
  }).notNull(),
  senderName: text("sender_name").notNull(), // Cached for performance
  
  // Message content
  content: text("content").notNull(),
  messageType: text("message_type", {
    enum: ["text", "image", "file", "location", "booking_update", "order_update"]
  }).default("text").notNull(),
  
  // Attachments/metadata
  attachments: jsonb("attachments").default([]), // URLs, file info
  metadata: jsonb("metadata").default({}), // Extra data for special message types
  
  // Message status
  status: text("status", {
    enum: ["sent", "delivered", "read", "failed"]
  }).default("sent").notNull(),
  
  // Timestamps
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  
  // Edit history
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  
  // Soft delete
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  conversationIdx: index("chat_msg_conversation_idx").on(table.conversationId),
  sentAtIdx: index("chat_msg_sent_at_idx").on(table.sentAt),
  senderIdx: index("chat_msg_sender_idx").on(table.senderId),
}));

// Typing indicators (for real-time "user is typing" feature)
export const typingIndicators = pgTable("typing_indicators", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => chatConversations.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => platformUsers.id, { onDelete: 'cascade' }).notNull(),
  userType: text("user_type", {
    enum: ["business", "consumer"]
  }).notNull(),
  
  // Auto-expire after 10 seconds
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  conversationUserIdx: index("typing_conv_user_idx").on(table.conversationId, table.userId),
}));

// Message read receipts (for group chats or multi-staff businesses)
export const messageReadReceipts = pgTable("message_read_receipts", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => chatMessages.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => platformUsers.id, { onDelete: 'cascade' }).notNull(),
  readAt: timestamp("read_at").defaultNow(),
}, (table) => ({
  messageUserIdx: index("receipt_msg_user_idx").on(table.messageId, table.userId),
}));

// Chat preferences and settings
export const chatPreferences = pgTable("chat_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => platformUsers.id, { onDelete: 'cascade' }).unique().notNull(),
  
  // Notification settings
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  
  // Auto-response for businesses
  autoResponseEnabled: boolean("auto_response_enabled").default(false),
  autoResponseMessage: text("auto_response_message"),
  businessHoursOnly: boolean("business_hours_only").default(true),
  
  // Privacy settings
  readReceipts: boolean("read_receipts").default(true),
  typingIndicators: boolean("typing_indicators").default(true),
  
  // Blocked users/businesses
  blockedUsers: jsonb("blocked_users").default([]), // Array of user IDs
  blockedBusinesses: jsonb("blocked_businesses").default([]), // Array of business IDs
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Spam prevention - rate limiting for consumers
export const messageRateLimits = pgTable("message_rate_limits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => platformUsers.id, { onDelete: 'cascade' }).notNull(),
  
  // Rate limit windows
  hourlyCount: integer("hourly_count").default(0),
  hourlyResetAt: timestamp("hourly_reset_at").notNull(),
  
  dailyCount: integer("daily_count").default(0),
  dailyResetAt: timestamp("daily_reset_at").notNull(),
  
  // Spam detection
  flaggedForSpam: boolean("flagged_for_spam").default(false),
  flaggedAt: timestamp("flagged_at"),
  flagReason: text("flag_reason"),
}, (table) => ({
  userIdx: index("rate_limit_user_idx").on(table.userId),
}));

// =============================================================================
// RELATIONS
// =============================================================================

export const chatConversationRelations = relations(chatConversations, ({ one, many }) => ({
  business: one(businessTenants, {
    fields: [chatConversations.businessId],
    references: [businessTenants.id],
  }),
  consumer: one(platformUsers, {
    fields: [chatConversations.consumerId],
    references: [platformUsers.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessageRelations = relations(chatMessages, ({ one, many }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
  sender: one(platformUsers, {
    fields: [chatMessages.senderId],
    references: [platformUsers.id],
  }),
  readReceipts: many(messageReadReceipts),
}));

// =============================================================================
// EXPORT TYPES
// =============================================================================

export type ChatConversation = typeof chatConversations.$inferSelect;
export type NewChatConversation = typeof chatConversations.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type ChatPreferences = typeof chatPreferences.$inferSelect;
export type MessageRateLimit = typeof messageRateLimits.$inferSelect;