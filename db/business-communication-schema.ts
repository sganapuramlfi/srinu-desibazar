import { 
  pgTable, 
  serial, 
  integer, 
  text, 
  boolean, 
  decimal,
  timestamp, 
  jsonb,
  uuid,
  date,
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businessTenants, platformUsers, bookings } from "./schema.js";
import { bookingOperations } from "./booking-lifecycle-schema.js";

// =============================================================================
// BUSINESS COMMUNICATIONS
// =============================================================================

export const businessCommunications = pgTable("business_communications", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessTenants.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => platformUsers.id, { onDelete: "set null" }),
  
  // Communication context
  communicationType: text("communication_type").notNull(),
  constraintViolationId: integer("constraint_violation_id").references(() => bookingOperations.id),
  originalBookingRequest: jsonb("original_booking_request").default({}),
  constraintViolations: jsonb("constraint_violations").default([]),
  
  // Communication thread
  threadId: uuid("thread_id").defaultRandom(),
  subject: text("subject"),
  messages: jsonb("messages").default([]),
  status: text("status").default("open"),
  priority: integer("priority").default(3),
  
  // Customer information (for non-registered users)
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  
  // AI involvement
  aiSuggestions: jsonb("ai_suggestions").default({}),
  aiResolutionAttempted: boolean("ai_resolution_attempted").default(false),
  aiConfidenceScore: decimal("ai_confidence_score", { precision: 3, scale: 2 }),
  
  // Business response tracking
  businessNotifiedAt: timestamp("business_notified_at", { withTimezone: true }),
  businessRespondedAt: timestamp("business_responded_at", { withTimezone: true }),
  businessResponseTimeMinutes: integer("business_response_time_minutes"),
  firstResponseTimeMinutes: integer("first_response_time_minutes"),
  
  // Resolution tracking
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionType: text("resolution_type"),
  customerSatisfactionRating: integer("customer_satisfaction_rating"),
  
  // Business impact
  ledToBooking: boolean("led_to_booking").default(false),
  recoveredRevenue: decimal("recovered_revenue", { precision: 10, scale: 2 }).default("0"),
  
  // Metadata
  sourcePage: text("source_page"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// =============================================================================
// BUSINESS ALERT PREFERENCES
// =============================================================================

export const businessAlertPreferences = pgTable("business_alert_preferences", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessTenants.id, { onDelete: "cascade" }).unique(),
  
  // Alert channels
  emailAlerts: boolean("email_alerts").default(true),
  smsAlerts: boolean("sms_alerts").default(false),
  inAppAlerts: boolean("in_app_alerts").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  
  // Alert triggers
  constraintViolations: boolean("constraint_violations").default(true),
  largePartyRequests: boolean("large_party_requests").default(true),
  offHoursRequests: boolean("off_hours_requests").default(true),
  repeatCustomerIssues: boolean("repeat_customer_issues").default(true),
  newMessages: boolean("new_messages").default(true),
  bookingConflicts: boolean("booking_conflicts").default(true),
  
  // Alert timing
  immediateAlerts: text("immediate_alerts").array().default(["large_party_requests", "urgent_issues", "new_messages"]),
  dailyDigest: boolean("daily_digest").default(true),
  weeklySummary: boolean("weekly_summary").default(true),
  
  // Business hours for notifications
  notificationHours: jsonb("notification_hours").default({
    start: "09:00",
    end: "21:00",
    timezone: "UTC"
  }),
  weekendNotifications: boolean("weekend_notifications").default(false),
  
  // Contact information
  primaryEmail: text("primary_email"),
  smsPhone: text("sms_phone"),
  backupEmail: text("backup_email"),
  
  // Escalation rules
  escalationAfterMinutes: integer("escalation_after_minutes").default(60),
  escalationEmail: text("escalation_email"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// =============================================================================
// AI SUGGESTIONS
// =============================================================================

export const aiSuggestions = pgTable("ai_suggestions", {
  id: serial("id").primaryKey(),
  communicationId: integer("communication_id").references(() => businessCommunications.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull().references(() => businessTenants.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => platformUsers.id, { onDelete: "set null" }),
  
  // Suggestion context
  originalConstraintType: text("original_constraint_type").notNull(),
  constraintViolationData: jsonb("constraint_violation_data").default({}),
  suggestionType: text("suggestion_type").notNull(),
  
  // AI-generated suggestions
  primarySuggestion: jsonb("primary_suggestion").notNull(),
  alternativeSuggestions: jsonb("alternative_suggestions").default([]),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }).notNull(),
  reasoning: text("reasoning"),
  
  // Customer interaction tracking
  suggestionsShownAt: timestamp("suggestions_shown_at", { withTimezone: true }),
  customerViewed: boolean("customer_viewed").default(false),
  customerClickedSuggestion: boolean("customer_clicked_suggestion").default(false),
  selectedSuggestionType: text("selected_suggestion_type"),
  
  // Success tracking
  customerAccepted: boolean("customer_accepted").default(false),
  ledToBooking: boolean("led_to_booking").default(false),
  alternativeBookingId: integer("alternative_booking_id").references(() => bookings.id),
  revenueRecovered: decimal("revenue_recovered", { precision: 10, scale: 2 }).default("0"),
  
  // Business response
  businessApproved: boolean("business_approved"),
  businessNotes: text("business_notes"),
  
  // Learning data
  customerFeedback: text("customer_feedback"),
  suggestionQualityScore: integer("suggestion_quality_score"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// =============================================================================
// NOTIFICATION QUEUE
// =============================================================================

export const notificationQueue = pgTable("notification_queue", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => platformUsers.id, { onDelete: "cascade" }),
  communicationId: integer("communication_id").references(() => businessCommunications.id, { onDelete: "cascade" }),
  
  // Notification details
  notificationType: text("notification_type").notNull(),
  channelSpecificData: jsonb("channel_specific_data").default({}),
  
  // Message content
  subject: text("subject"),
  messageText: text("message_text").notNull(),
  messageHtml: text("message_html"),
  data: jsonb("data").default({}),
  
  // Delivery scheduling
  priority: integer("priority").default(3),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  
  // Delivery tracking
  status: text("status").default("pending"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  deliveryAttempts: integer("delivery_attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  
  // Error tracking
  lastError: text("last_error"),
  errorCount: integer("error_count").default(0),
  
  // External service tracking
  externalMessageId: text("external_message_id"),
  externalStatus: text("external_status"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// =============================================================================
// COMMUNICATION ANALYTICS
// =============================================================================

export const communicationAnalytics = pgTable("communication_analytics", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessTenants.id, { onDelete: "cascade" }),
  
  // Time period
  datePeriod: date("date_period").notNull(),
  periodType: text("period_type").default("daily"),
  
  // Communication metrics
  totalCommunications: integer("total_communications").default(0),
  newCommunications: integer("new_communications").default(0),
  resolvedCommunications: integer("resolved_communications").default(0),
  avgResponseTimeMinutes: decimal("avg_response_time_minutes", { precision: 10, scale: 2 }),
  avgResolutionTimeHours: decimal("avg_resolution_time_hours", { precision: 10, scale: 2 }),
  
  // Constraint violation patterns
  constraintViolations: jsonb("constraint_violations").default({}),
  aiSuggestionsGenerated: integer("ai_suggestions_generated").default(0),
  aiSuggestionsAccepted: integer("ai_suggestions_accepted").default(0),
  
  // Business impact
  bookingsRecovered: integer("bookings_recovered").default(0),
  revenueRecovered: decimal("revenue_recovered", { precision: 10, scale: 2 }).default("0"),
  customerSatisfactionAvg: decimal("customer_satisfaction_avg", { precision: 3, scale: 2 }),
  
  // Channel performance
  emailNotificationsSent: integer("email_notifications_sent").default(0),
  smsNotificationsSent: integer("sms_notifications_sent").default(0),
  inAppAlertsSent: integer("in_app_alerts_sent").default(0),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => ({
  uniqueBusinessPeriod: unique().on(table.businessId, table.datePeriod, table.periodType)
}));

// =============================================================================
// RELATIONS
// =============================================================================

export const businessCommunicationsRelations = relations(businessCommunications, ({ one, many }) => ({
  business: one(businessTenants, {
    fields: [businessCommunications.businessId],
    references: [businessTenants.id]
  }),
  customer: one(platformUsers, {
    fields: [businessCommunications.customerId],
    references: [platformUsers.id]
  }),
  constraintViolation: one(bookingOperations, {
    fields: [businessCommunications.constraintViolationId],
    references: [bookingOperations.id]
  }),
  aiSuggestions: many(aiSuggestions),
  notifications: many(notificationQueue)
}));

export const businessAlertPreferencesRelations = relations(businessAlertPreferences, ({ one }) => ({
  business: one(businessTenants, {
    fields: [businessAlertPreferences.businessId],
    references: [businessTenants.id]
  })
}));

export const aiSuggestionsRelations = relations(aiSuggestions, ({ one }) => ({
  communication: one(businessCommunications, {
    fields: [aiSuggestions.communicationId],
    references: [businessCommunications.id]
  }),
  business: one(businessTenants, {
    fields: [aiSuggestions.businessId],
    references: [businessTenants.id]
  }),
  customer: one(platformUsers, {
    fields: [aiSuggestions.customerId],
    references: [platformUsers.id]
  }),
  alternativeBooking: one(bookings, {
    fields: [aiSuggestions.alternativeBookingId],
    references: [bookings.id]
  })
}));

export const notificationQueueRelations = relations(notificationQueue, ({ one }) => ({
  business: one(businessTenants, {
    fields: [notificationQueue.businessId],
    references: [businessTenants.id]
  }),
  user: one(platformUsers, {
    fields: [notificationQueue.userId],
    references: [platformUsers.id]
  }),
  communication: one(businessCommunications, {
    fields: [notificationQueue.communicationId],
    references: [businessCommunications.id]
  })
}));

export const communicationAnalyticsRelations = relations(communicationAnalytics, ({ one }) => ({
  business: one(businessTenants, {
    fields: [communicationAnalytics.businessId],
    references: [businessTenants.id]
  })
}));