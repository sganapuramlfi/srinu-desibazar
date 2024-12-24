import { pgTable, text, serial, integer, boolean, timestamp, json, foreignKey, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations, type InferModel } from "drizzle-orm";
import { z } from "zod";

// Shared Tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  role: text("role", { enum: ["admin", "business", "customer"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  logo: text("logo_url"),
  industryType: text("industry_type", {
    enum: ["salon", "restaurant", "event", "realestate", "retail", "professional"]
  }).notNull(),
  status: text("status", {
    enum: ["pending", "active", "suspended"]
  }).default("pending"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  contactInfo: json("contact_info").$type<{
    phone: string;
    email: string;
    address: string;
    website?: string;
  }>(),
  workingHours: json("working_hours").$type<{
    [key: string]: { open: string; close: string };
  }>(),
  settings: json("settings").$type<{
    theme?: string;
    notifications?: boolean;
    autoConfirm?: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Schemas for user registration and business
export const userRegistrationSchema = createInsertSchema(users).extend({
  business: z.object({
    name: z.string().min(2),
    industryType: z.enum(["salon", "restaurant", "event", "realestate", "retail", "professional"]),
    description: z.string().optional(),
  }).optional(),
});

export const businessInsertSchema = createInsertSchema(businesses).extend({
  industryType: z.enum(["salon", "restaurant", "event", "realestate", "retail", "professional"]),
  contactInfo: z.object({
    phone: z.string().min(10),
    email: z.string().email(),
    address: z.string().min(5),
    website: z.string().url().optional(),
  }),
  workingHours: z.record(
    z.string(),
    z.object({
      open: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      close: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    })
  ).optional(),
});

// Salon-specific Tables with cascade delete
export const salonServices = pgTable("salon_services", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, {onDelete: 'cascade'}),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(), // e.g., 'hair', 'spa', 'nails'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salonStaff = pgTable("salon_staff", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, {onDelete: 'cascade'}),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  phone: text("phone"),
  specialization: text("specialization"),
  status: text("status", {
    enum: ["active", "inactive", "on_leave"]
  }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const staffSkills = pgTable("staff_skills", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => salonStaff.id, { onDelete: 'cascade' }),
  serviceId: integer("service_id").references(() => salonServices.id, { onDelete: 'cascade' }),
  proficiencyLevel: text("proficiency_level", {
    enum: ["trainee", "junior", "senior", "expert"]
  }).default("junior"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shiftTemplates = pgTable("shift_templates", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, {onDelete: 'cascade'}),
  name: text("name").notNull(),
  description: text("description"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  breaks: json("breaks").$type<Array<{
    startTime: string;
    endTime: string;
    duration: number;
    type: "lunch" | "short_break" | "other";
  }>>(),
  type: text("type", {
    enum: ["regular", "overtime", "holiday", "leave"]
  }).default("regular"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const staffShifts = pgTable("staff_shifts", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => salonStaff.id, {onDelete: 'cascade'}),
  templateId: integer("template_id").references(() => shiftTemplates.id, {onDelete: 'cascade'}),
  date: timestamp("date").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  status: text("status", {
    enum: ["scheduled", "in_progress", "completed", "cancelled"]
  }).default("scheduled"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceSlots = pgTable("service_slots", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, {onDelete: 'cascade'}),
  serviceId: integer("service_id").references(() => salonServices.id, { onDelete: 'cascade' }),
  staffId: integer("staff_id").references(() => salonStaff.id, { onDelete: 'cascade' }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status", {
    enum: ["available", "booked", "blocked"]
  }).default("available"),
  isManual: boolean("is_manual").default(false),
  conflictingSlotIds: json("conflicting_slot_ids").$type<number[]>(), // Track conflicting slots
  createdAt: timestamp("created_at").defaultNow(),
});

export const salonBookings = pgTable("salon_bookings", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, {onDelete: 'cascade'}),
  customerId: integer("customer_id").references(() => users.id, {onDelete: 'cascade'}),
  slotId: integer("slot_id").references(() => serviceSlots.id, { onDelete: 'cascade' }),
  serviceId: integer("service_id").references(() => salonServices.id, { onDelete: 'cascade' }),
  staffId: integer("staff_id").references(() => salonStaff.id, { onDelete: 'cascade' }),
  status: text("status", {
    enum: ["pending", "confirmed", "completed", "cancelled"]
  }).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const businessRelations = relations(businesses, ({ one }) => ({
  owner: one(users, {
    fields: [businesses.userId],
    references: [users.id],
  }),
}));

export const salonServiceRelations = relations(salonServices, ({ one, many }) => ({
  business: one(businesses, {
    fields: [salonServices.businessId],
    references: [businesses.id],
  }),
  staffSkills: many(staffSkills),
  slots: many(serviceSlots),
  bookings: many(salonBookings),
}));

export const salonStaffRelations = relations(salonStaff, ({ one, many }) => ({
  business: one(businesses, {
    fields: [salonStaff.businessId],
    references: [businesses.id],
  }),
  skills: many(staffSkills),
  shifts: many(staffShifts),
  slots: many(serviceSlots),
  bookings: many(salonBookings),
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


// Update the staff schema to better handle schedules and template assignments
export const staffSchedules = pgTable("staff_schedules", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => salonStaff.id, {onDelete: 'cascade'}),
  templateId: integer("template_id").references(() => shiftTemplates.id, {onDelete: 'cascade'}),
  date: timestamp("date").notNull(),
  status: text("status", {
    enum: ["scheduled", "working", "completed", "leave", "sick", "absent"]
  }).default("scheduled"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Basic schemas
export const insertUserSchema = createInsertSchema(users);
export const insertBusinessSchema = createInsertSchema(businesses);
export const insertSalonServiceSchema = createInsertSchema(salonServices);
export const insertSalonStaffSchema = createInsertSchema(salonStaff);
export const insertStaffSkillSchema = createInsertSchema(staffSkills);
export const insertShiftTemplateSchema = createInsertSchema(shiftTemplates);
export const insertStaffShiftSchema = createInsertSchema(staffShifts);
export const insertServiceSlotSchema = createInsertSchema(serviceSlots);
export const insertSalonBookingSchema = createInsertSchema(salonBookings);

// Create insert schemas
export const insertStaffScheduleSchema = createInsertSchema(staffSchedules);

// Create select schemas
export const selectStaffScheduleSchema = createSelectSchema(staffSchedules);

// Create zod schemas for the new template functionality
export const shiftTemplateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  breaks: z.array(z.object({
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    duration: z.number().min(1, "Break duration must be at least 1 minute"),
    type: z.enum(["lunch", "short_break", "other"]),
  })).default([]),
  type: z.enum(["regular", "overtime", "holiday", "leave"]).default("regular"),
  isActive: z.boolean().default(true),
});


// Update the staff form schema to handle all possible fields
export const staffFormSchema = z.object({
  name: z.string().min(1, "Staff name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  specialization: z.string().min(1, "Specialization is required"),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
  schedule: z.record(
    z.string(),
    z.object({
      start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
      end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    })
  ).optional(),
});

// Add relations
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;
export type BusinessRegistration = z.infer<typeof businessInsertSchema>;
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type SalonService = typeof salonServices.$inferSelect;
export type InsertSalonService = typeof salonServices.$inferInsert;
export type SalonStaff = typeof salonStaff.$inferSelect;
export type InsertSalonStaff = typeof salonStaff.$inferInsert;
export type StaffSkill = typeof staffSkills.$inferSelect;
export type InsertStaffSkill = typeof staffSkills.$inferInsert;
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;
export type InsertShiftTemplate = typeof shiftTemplates.$inferInsert;
export type StaffShift = typeof staffShifts.$inferSelect;
export type InsertStaffShift = typeof staffShifts.$inferInsert;
export type ServiceSlot = typeof serviceSlots.$inferSelect;
export type InsertServiceSlot = typeof serviceSlots.$inferInsert;
export type SalonBooking = typeof salonBookings.$inferSelect;
export type InsertSalonBooking = typeof salonBookings.$inferInsert;

// Add types
export type StaffSchedule = typeof staffSchedules.$inferSelect;
export type InsertStaffSchedule = typeof staffSchedules.$inferInsert;