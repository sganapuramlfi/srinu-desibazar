import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { businessTenants, platformUsers } from "./schema";

// =============================================================================
// BUSINESS REVIEW MANAGEMENT SCHEMA
// =============================================================================

// Business reviews
export const businessReviews = pgTable("business_reviews", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  customerId: integer("customer_id").references(() => platformUsers.id, { onDelete: 'set null' }),
  
  // Review Content
  rating: integer("rating").notNull(), // 1-5
  title: varchar("title", { length: 255 }),
  comment: text("comment"),
  
  // Customer Info (for anonymous reviews)
  customerName: varchar("customer_name", { length: 255 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  
  // Business Response
  businessResponse: text("business_response"),
  respondedAt: timestamp("responded_at"),
  respondedBy: integer("responded_by").references(() => platformUsers.id, { onDelete: 'set null' }),
  
  // Review Source & Verification
  source: varchar("source", { length: 50 }).default("platform"), // "platform", "google", "facebook", "manual"
  isVerified: boolean("is_verified").default(false),
  isPublished: boolean("is_published").default(true),
  isHelpful: integer("is_helpful").default(0), // Helpful votes count
  
  // Response Management
  responseStatus: varchar("response_status", { length: 20 }).default("pending"), // "pending", "responded", "flagged", "ignored"
  flagReason: text("flag_reason"),
  flaggedAt: timestamp("flagged_at"),
  flaggedBy: integer("flagged_by").references(() => platformUsers.id, { onDelete: 'set null' }),
  
  // Metadata
  reviewDate: timestamp("review_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Review response templates
export const reviewTemplates = pgTable("review_templates", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Template Info
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // "positive", "negative", "neutral", "complaint", "compliment"
  
  // Template Content
  template: text("template").notNull(),
  description: text("description"),
  
  // Usage
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Review analytics (aggregated data for performance)
export const reviewAnalytics = pgTable("review_analytics", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Rating Distribution
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0.00"),
  totalReviews: integer("total_reviews").default(0),
  
  // Rating Breakdown
  fiveStarCount: integer("five_star_count").default(0),
  fourStarCount: integer("four_star_count").default(0),
  threeStarCount: integer("three_star_count").default(0),
  twoStarCount: integer("two_star_count").default(0),
  oneStarCount: integer("one_star_count").default(0),
  
  // Response Management
  totalResponses: integer("total_responses").default(0),
  responseRate: decimal("response_rate", { precision: 5, scale: 2 }).default("0.00"), // Percentage
  avgResponseTime: integer("avg_response_time").default(0), // Hours
  
  // Review Sources
  platformReviews: integer("platform_reviews").default(0),
  googleReviews: integer("google_reviews").default(0),
  facebookReviews: integer("facebook_reviews").default(0),
  manualReviews: integer("manual_reviews").default(0),
  
  // Time Periods
  periodType: varchar("period_type", { length: 20 }).notNull(), // "daily", "weekly", "monthly", "yearly", "all_time"
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  
  // Metadata
  lastCalculated: timestamp("last_calculated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// RELATIONSHIPS
// =============================================================================

// Business reviews relationships
export const businessReviewRelations = relations(businessReviews, ({ one }) => ({
  business: one(businessTenants, {
    fields: [businessReviews.businessId],
    references: [businessTenants.id],
  }),
  customer: one(platformUsers, {
    fields: [businessReviews.customerId],
    references: [platformUsers.id],
  }),
  respondedByUser: one(platformUsers, {
    fields: [businessReviews.respondedBy],
    references: [platformUsers.id],
  }),
}));

// Review templates relationships
export const reviewTemplateRelations = relations(reviewTemplates, ({ one }) => ({
  business: one(businessTenants, {
    fields: [reviewTemplates.businessId],
    references: [businessTenants.id],
  }),
}));

// Review analytics relationships
export const reviewAnalyticsRelations = relations(reviewAnalytics, ({ one }) => ({
  business: one(businessTenants, {
    fields: [reviewAnalytics.businessId],
    references: [businessTenants.id],
  }),
}));

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const insertBusinessReviewSchema = createInsertSchema(businessReviews);
export const selectBusinessReviewSchema = createSelectSchema(businessReviews);

export const insertReviewTemplateSchema = createInsertSchema(reviewTemplates);
export const selectReviewTemplateSchema = createSelectSchema(reviewTemplates);

export const insertReviewAnalyticsSchema = createInsertSchema(reviewAnalytics);
export const selectReviewAnalyticsSchema = createSelectSchema(reviewAnalytics);

// Export types
export type BusinessReview = typeof businessReviews.$inferSelect;
export type ReviewTemplate = typeof reviewTemplates.$inferSelect;
export type ReviewAnalytics = typeof reviewAnalytics.$inferSelect;