import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Base table: Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  role: text("role", { enum: ["admin", "business", "customer"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business table (depends only on users)
export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  industryType: text("industry_type", {
    enum: ["salon", "restaurant", "event", "realestate", "retail", "professional"]
  }).notNull(),
  status: text("status", {
    enum: ["pending", "active", "suspended"]
  }).default("pending").notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// New table: Services offered by businesses
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  maxParticipants: integer("max_participants").default(1),
  settings: jsonb("settings").default({}).notNull(), // For service-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// New table: Service bookings
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status", {
    enum: ["pending", "confirmed", "completed", "cancelled", "no_show"]
  }).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// New table: Messages between users
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  bookingId: integer("booking_id").references(() => bookings.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// New table: Business advertisements
export const advertisements = pgTable("advertisements", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status", {
    enum: ["draft", "active", "paused", "ended"]
  }).default("draft").notNull(),
  type: text("type", {
    enum: ["banner", "featured", "promoted"]
  }).notNull(),
  targetAudience: jsonb("target_audience").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Basic schemas for users
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Business schemas
export const insertBusinessSchema = createInsertSchema(businesses);
export const selectBusinessSchema = createSelectSchema(businesses);
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;


// Define relationships
export const businessRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, {
    fields: [businesses.userId],
    references: [users.id],
  }),
  services: many(services),
  advertisements: many(advertisements),
}));

export const serviceRelations = relations(services, ({ one, many }) => ({
  business: one(businesses, {
    fields: [services.businessId],
    references: [businesses.id],
  }),
  bookings: many(bookings),
}));

export const bookingRelations = relations(bookings, ({ one, many }) => ({
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
  customer: one(users, {
    fields: [bookings.customerId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [messages.bookingId],
    references: [bookings.id],
  }),
}));

export const advertisementRelations = relations(advertisements, ({ one }) => ({
  business: one(businesses, {
    fields: [advertisements.businessId],
    references: [businesses.id],
  }),
}));

// Business profile schema for forms
export const businessProfileSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().optional(),
  industryType: z.enum(["salon", "restaurant", "event", "realestate", "retail", "professional"]),
  status: z.enum(["pending", "active", "suspended"]).default("pending"),
});

// Schemas for forms and validation
export const serviceSchema = createInsertSchema(services);
export const bookingSchema = createInsertSchema(bookings);
export const messageSchema = createInsertSchema(messages);
export const advertisementSchema = createInsertSchema(advertisements);

// Export types
export type Service = typeof services.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Advertisement = typeof advertisements.$inferSelect;

// Registration schema with business info
export const userRegistrationSchema = createInsertSchema(users).extend({
  business: z.object({
    name: z.string().min(2),
    industryType: z.enum(["salon", "restaurant", "event", "realestate", "retail", "professional"]),
    description: z.string().optional(),
  }).optional(),
});

export type UserRegistration = z.infer<typeof userRegistrationSchema>;

export const userRelations = relations(users, ({ one }) => ({
  business: one(businesses, {
    fields: [users.id],
    references: [businesses.userId],
  }),
}));