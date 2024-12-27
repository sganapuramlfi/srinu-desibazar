import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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

// Business profile schema for forms
export const businessProfileSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().optional(),
  industryType: z.enum(["salon", "restaurant", "event", "realestate", "retail", "professional"]),
  status: z.enum(["pending", "active", "suspended"]).default("pending"),
});

// Registration schema with business info
export const userRegistrationSchema = createInsertSchema(users).extend({
  business: z.object({
    name: z.string().min(2),
    industryType: z.enum(["salon", "restaurant", "event", "realestate", "retail", "professional"]),
    description: z.string().optional(),
  }).optional(),
});

export type UserRegistration = z.infer<typeof userRegistrationSchema>;

// Define relationships
export const businessRelations = relations(businesses, ({ one }) => ({
  owner: one(users, {
    fields: [businesses.userId],
    references: [users.id],
  }),
}));

export const userRelations = relations(users, ({ one }) => ({
  business: one(businesses, {
    fields: [users.id],
    references: [businesses.userId],
  }),
}));