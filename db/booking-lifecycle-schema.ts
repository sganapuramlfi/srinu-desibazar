import { pgTable, text, serial, integer, boolean, timestamp, jsonb, inet } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { businessTenants, platformUsers, bookings, bookableItems } from "./schema";

// =============================================================================
// BOOKING LIFECYCLE OPERATIONS TABLES
// =============================================================================

// Booking operations log (tracks all operations on bookings)
export const bookingOperations = pgTable("booking_operations", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: 'cascade' }).notNull(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Operation details
  operationType: text("operation_type", {
    enum: ['create', 'confirm', 'cancel', 'reschedule', 'no_show', 'complete', 'modify', 'refund', 'charge', 'reminder_sent']
  }).notNull(),
  
  // Who performed the operation
  performedByUserId: integer("performed_by_user_id").references(() => platformUsers.id),
  performedByRole: text("performed_by_role", {
    enum: ['customer', 'staff', 'system', 'admin']
  }),
  
  // Operation data
  operationData: jsonb("operation_data").default('{}'),
  previousState: jsonb("previous_state").default('{}'),
  newState: jsonb("new_state").default('{}'),
  
  // Business logic
  constraintsApplied: jsonb("constraints_applied").default('[]'),
  constraintsPassed: boolean("constraints_passed").default(true),
  constraintViolations: jsonb("constraint_violations").default('[]'),
  
  // Financial impact
  financialImpact: jsonb("financial_impact").default('{}'),
  
  // Metadata
  ipAddress: text("ip_address"), // Using text instead of inet for compatibility
  userAgent: text("user_agent"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow()
});

// Industry-specific constraint definitions
export const bookingConstraints = pgTable("booking_constraints", {
  id: serial("id").primaryKey(),
  
  // Constraint identification
  constraintName: text("constraint_name").notNull(),
  industryType: text("industry_type", {
    enum: ['salon', 'restaurant', 'event', 'realestate', 'retail', 'professional',
           'healthcare', 'fitness', 'automotive', 'home_services', 'education', 'recreation']
  }).notNull(),
  
  // Constraint details
  constraintType: text("constraint_type", {
    enum: ['availability', 'capacity', 'timing', 'staffing', 'equipment', 
           'cancellation', 'reschedule', 'payment', 'safety', 'compliance']
  }).notNull(),
  
  // Constraint rules (stored as JSON for flexibility)
  rules: jsonb("rules").notNull().default('{}'),
  
  // Priority and status
  priority: integer("priority").notNull().default(5), // 1=critical, 10=nice-to-have
  isMandatory: boolean("is_mandatory").default(true),
  isActive: boolean("is_active").default(true),
  
  // Business customization
  businessCustomizable: boolean("business_customizable").default(false),
  defaultBusinessOverride: jsonb("default_business_override").default('{}'),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Business-specific constraint overrides
export const businessConstraintOverrides = pgTable("business_constraint_overrides", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  constraintId: integer("constraint_id").references(() => bookingConstraints.id, { onDelete: 'cascade' }).notNull(),
  
  // Override details
  isEnabled: boolean("is_enabled").default(true),
  customRules: jsonb("custom_rules").default('{}'),
  customPriority: integer("custom_priority"),
  
  // Reason for override
  overrideReason: text("override_reason"),
  approvedBy: integer("approved_by").references(() => platformUsers.id),
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Business booking policies
export const bookingPolicies = pgTable("booking_policies", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Policy scope
  appliesToIndustry: boolean("applies_to_industry").default(true),
  specificItemTypes: text("specific_item_types").array(),
  
  // Cancellation policy
  cancellationPolicy: jsonb("cancellation_policy").default(`{
    "free_cancellation_hours": 24,
    "fee_structure": "flat",
    "fee_amount": 0,
    "fee_percentage": 0,
    "no_refund_hours": 2,
    "emergency_exceptions": true
  }`),
  
  // Reschedule policy
  reschedulePolicy: jsonb("reschedule_policy").default(`{
    "allowed_until_hours": 24,
    "max_reschedules": 3,
    "fee_after_limit": 0,
    "same_day_allowed": false,
    "advance_booking_limit": 30
  }`),
  
  // No-show policy
  noShowPolicy: jsonb("no_show_policy").default(`{
    "grace_period_minutes": 15,
    "auto_cancel_minutes": 30,
    "fee_amount": 0,
    "fee_percentage": 0,
    "repeat_offender_limit": 3,
    "blocking_period_days": 30
  }`),
  
  // Payment policy
  paymentPolicy: jsonb("payment_policy").default(`{
    "payment_timing": "pay_at_shop",
    "deposit_required": false,
    "deposit_percentage": 0,
    "deposit_amount": 0,
    "refund_processing_days": 7,
    "payment_methods": ["cash", "card"]
  }`),
  
  // Policy metadata
  policyVersion: integer("policy_version").default(1),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveUntil: timestamp("effective_until"),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Track all booking status changes
export const bookingStatusHistory = pgTable("booking_status_history", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: 'cascade' }).notNull(),
  
  // Status change details
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changeReason: text("change_reason"),
  
  // Who made the change
  changedByUserId: integer("changed_by_user_id").references(() => platformUsers.id),
  changedByRole: text("changed_by_role", {
    enum: ['customer', 'staff', 'system', 'admin']
  }),
  
  // Timing
  scheduledFor: timestamp("scheduled_for"),
  actualTime: timestamp("actual_time").defaultNow(),
  
  // Related operation
  operationId: integer("operation_id").references(() => bookingOperations.id),
  
  // Metadata
  metadata: jsonb("metadata").default('{}'),
  notes: text("notes")
});

// =============================================================================
// RELATIONSHIPS
// =============================================================================

export const bookingOperationRelations = relations(bookingOperations, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingOperations.bookingId],
    references: [bookings.id],
  }),
  business: one(businessTenants, {
    fields: [bookingOperations.businessId],
    references: [businessTenants.id],
  }),
  performedByUser: one(platformUsers, {
    fields: [bookingOperations.performedByUserId],
    references: [platformUsers.id],
  }),
}));

export const bookingConstraintRelations = relations(bookingConstraints, ({ many }) => ({
  businessOverrides: many(businessConstraintOverrides),
}));

export const businessConstraintOverrideRelations = relations(businessConstraintOverrides, ({ one }) => ({
  business: one(businessTenants, {
    fields: [businessConstraintOverrides.businessId],
    references: [businessTenants.id],
  }),
  constraint: one(bookingConstraints, {
    fields: [businessConstraintOverrides.constraintId],
    references: [bookingConstraints.id],
  }),
  approvedByUser: one(platformUsers, {
    fields: [businessConstraintOverrides.approvedBy],
    references: [platformUsers.id],
  }),
}));

export const bookingPolicyRelations = relations(bookingPolicies, ({ one }) => ({
  business: one(businessTenants, {
    fields: [bookingPolicies.businessId],
    references: [businessTenants.id],
  }),
}));

export const bookingStatusHistoryRelations = relations(bookingStatusHistory, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingStatusHistory.bookingId],
    references: [bookings.id],
  }),
  changedByUser: one(platformUsers, {
    fields: [bookingStatusHistory.changedByUserId],
    references: [platformUsers.id],
  }),
  operation: one(bookingOperations, {
    fields: [bookingStatusHistory.operationId],
    references: [bookingOperations.id],
  }),
}));

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const insertBookingOperationSchema = createInsertSchema(bookingOperations);
export const selectBookingOperationSchema = createSelectSchema(bookingOperations);

export const insertBookingConstraintSchema = createInsertSchema(bookingConstraints);
export const selectBookingConstraintSchema = createSelectSchema(bookingConstraints);

export const insertBusinessConstraintOverrideSchema = createInsertSchema(businessConstraintOverrides);
export const selectBusinessConstraintOverrideSchema = createSelectSchema(businessConstraintOverrides);

export const insertBookingPolicySchema = createInsertSchema(bookingPolicies);
export const selectBookingPolicySchema = createSelectSchema(bookingPolicies);

export const insertBookingStatusHistorySchema = createInsertSchema(bookingStatusHistory);
export const selectBookingStatusHistorySchema = createSelectSchema(bookingStatusHistory);

// Export types
export type BookingOperation = typeof bookingOperations.$inferSelect;
export type BookingConstraint = typeof bookingConstraints.$inferSelect;
export type BusinessConstraintOverride = typeof businessConstraintOverrides.$inferSelect;
export type BookingPolicy = typeof bookingPolicies.$inferSelect;
export type BookingStatusHistory = typeof bookingStatusHistory.$inferSelect;