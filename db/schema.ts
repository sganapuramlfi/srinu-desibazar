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

// Add new tables for service slots and staff management
export const salonStaff = pgTable("salon_staff", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  specialization: text("specialization"),
  status: text("status", { enum: ["active", "inactive", "on_leave"] }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const serviceSlots = pgTable("service_slots", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  staffId: integer("staff_id").references(() => salonStaff.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status", { enum: ["available", "booked", "blocked"] }).default("available").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Add new tables for salon services and staff skills 
export const salonServices = pgTable("salon_services", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  maxParticipants: integer("max_participants").default(1),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const staffSkills = pgTable("staff_skills", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => salonStaff.id, { onDelete: 'cascade' }).notNull(),
  serviceId: integer("service_id").references(() => salonServices.id, { onDelete: 'cascade' }).notNull(),
  proficiencyLevel: text("proficiency_level", { enum: ["junior", "intermediate", "senior"] }).default("junior").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const shiftTemplates = pgTable("shift_templates", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(), // Store as HH:mm format
  endTime: text("end_time").notNull(), // Store as HH:mm format
  breaks: jsonb("breaks").default([]).notNull(), // Array of break objects with start, end, and type
  daysOfWeek: jsonb("days_of_week").default([]).notNull(), // Array of days when this shift applies
  color: text("color").default("#000000"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const staffSchedules = pgTable("staff_schedules", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => salonStaff.id, { onDelete: 'cascade' }).notNull(),
  templateId: integer("template_id").references(() => shiftTemplates.id).notNull(),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["scheduled", "completed", "absent", "on_leave"] }).default("scheduled").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  notes: text("notes"),
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

// Add new relations
export const staffRelations = relations(salonStaff, ({ one, many }) => ({
  business: one(businesses, {
    fields: [salonStaff.businessId],
    references: [businesses.id],
  }),
  slots: many(serviceSlots),
}));

export const serviceSlotRelations = relations(serviceSlots, ({ one }) => ({
  business: one(businesses, {
    fields: [serviceSlots.businessId],
    references: [businesses.id],
  }),
  service: one(services, {
    fields: [serviceSlots.serviceId],
    references: [services.id],
  }),
  staff: one(salonStaff, {
    fields: [serviceSlots.staffId],
    references: [salonStaff.id],
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

// Add schemas for the new tables
export const insertSalonServiceSchema = createInsertSchema(salonServices);
export const insertStaffSkillSchema = createInsertSchema(staffSkills);
export const insertShiftTemplateSchema = createInsertSchema(shiftTemplates);
export const insertStaffScheduleSchema = createInsertSchema(staffSchedules);


// Export types
export type Service = typeof services.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Advertisement = typeof advertisements.$inferSelect;
// Add export types for new tables
export type SalonStaff = typeof salonStaff.$inferSelect;
export type ServiceSlot = typeof serviceSlots.$inferSelect;
export type SalonService = typeof salonServices.$inferSelect;
export type StaffSkill = typeof staffSkills.$inferSelect;
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;
export type StaffSchedule = typeof staffSchedules.$inferSelect;

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

// Add new tables for waitlist and notifications
export const waitlistEntries = pgTable("waitlist_entries", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  preferredStaffId: integer("preferred_staff_id").references(() => salonStaff.id),
  preferredTimeSlots: jsonb("preferred_time_slots").default({}).notNull(), // Store preferred days and time ranges
  status: text("status", {
    enum: ["pending", "allocated", "expired", "cancelled"]
  }).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const bookingNotifications = pgTable("booking_notifications", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  bookingId: integer("booking_id").references(() => bookings.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  type: text("type", {
    enum: ["reminder", "confirmation", "cancellation", "reschedule", "waitlist_available"]
  }).notNull(),
  status: text("status", {
    enum: ["pending", "sent", "failed"]
  }).default("pending").notNull(),
  content: text("content").notNull(),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add new table for service conflicts tracking
export const serviceConflicts = pgTable("service_conflicts", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  conflictingServiceId: integer("conflicting_service_id").references(() => services.id).notNull(),
  conflictType: text("conflict_type", {
    enum: ["time_overlap", "resource_conflict", "staff_unavailable"]
  }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Add new relations
export const waitlistRelations = relations(waitlistEntries, ({ one }) => ({
  business: one(businesses, {
    fields: [waitlistEntries.businessId],
    references: [businesses.id],
  }),
  customer: one(users, {
    fields: [waitlistEntries.customerId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [waitlistEntries.serviceId],
    references: [services.id],
  }),
  preferredStaff: one(salonStaff, {
    fields: [waitlistEntries.preferredStaffId],
    references: [salonStaff.id],
  }),
}));

export const notificationRelations = relations(bookingNotifications, ({ one }) => ({
  business: one(businesses, {
    fields: [bookingNotifications.businessId],
    references: [businesses.id],
  }),
  booking: one(bookings, {
    fields: [bookingNotifications.bookingId],
    references: [bookings.id],
  }),
  recipient: one(users, {
    fields: [bookingNotifications.recipientId],
    references: [users.id],
  }),
}));

export const conflictRelations = relations(serviceConflicts, ({ one }) => ({
  business: one(businesses, {
    fields: [serviceConflicts.businessId],
    references: [businesses.id],
  }),
  service: one(services, {
    fields: [serviceConflicts.serviceId],
    references: [services.id],
  }),
  conflictingService: one(services, {
    fields: [serviceConflicts.conflictingServiceId],
    references: [services.id],
  }),
}));

// Export types for new tables
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type BookingNotification = typeof bookingNotifications.$inferSelect;
export type ServiceConflict = typeof serviceConflicts.$inferSelect;

// Export schemas for new tables
export const waitlistEntrySchema = createInsertSchema(waitlistEntries);
export const notificationSchema = createInsertSchema(bookingNotifications);
export const conflictSchema = createInsertSchema(serviceConflicts);

// Add relations for the new tables
export const salonServiceRelations = relations(salonServices, ({ one, many }) => ({
  business: one(businesses, {
    fields: [salonServices.businessId],
    references: [businesses.id],
  }),
  staffSkills: many(staffSkills),
}));

export const staffSkillsRelations = relations(staffSkills, ({ one }) => ({
  staff: one(salonStaff, {
    fields: [staffSkills.staffId],
    references: [salonStaff.id],
  }),
  service: one(salonServices, {
    fields: [staffSkills.serviceId],
    references: [salonServices.id],
  }),
}));

export const shiftTemplateRelations = relations(shiftTemplates, ({ one, many }) => ({
  business: one(businesses, {
    fields: [shiftTemplates.businessId],
    references: [businesses.id],
  }),
  schedules: many(staffSchedules),
}));

export const staffScheduleRelations = relations(staffSchedules, ({ one }) => ({
  staff: one(salonStaff, {
    fields: [staffSchedules.staffId],
    references: [salonStaff.id],
  }),
  template: one(shiftTemplates, {
    fields: [staffSchedules.templateId],
    references: [shiftTemplates.id],
  }),
}));

// Add validation schema for break times
export const breakTimeSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  type: z.enum(["lunch", "coffee", "rest"]),
  duration: z.number().min(1).max(120), // Duration in minutes
});

export const shiftTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  breaks: z.array(breakTimeSchema).optional().default([]),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1, "Select at least one day"),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});