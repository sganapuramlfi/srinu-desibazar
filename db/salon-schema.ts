import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, date, time } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { businessTenants, platformUsers, bookings } from "./schema";

// =============================================================================
// SALON BUSINESS SCHEMA
// =============================================================================

// Salon services/treatments
export const salonServices = pgTable("salon_services", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Service details
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // "hair", "nails", "facial", "massage", "spa"
  
  // Duration and pricing
  durationMinutes: integer("duration_minutes").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  
  // Service requirements
  requiresConsultation: boolean("requires_consultation").default(false),
  requiresPatchTest: boolean("requires_patch_test").default(false),
  minAge: integer("min_age"),
  
  // Booking rules
  bufferTimeMinutes: integer("buffer_time_minutes").default(0), // cleanup time after service
  maxAdvanceDays: integer("max_advance_days").default(30),
  cancellationHours: integer("cancellation_hours").default(24),
  
  // Status
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Salon staff members
export const salonStaff = pgTable("salon_staff", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => platformUsers.id, { onDelete: 'set null' }),
  
  // Staff info
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  displayName: text("display_name"),
  email: text("email"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  
  // Professional details
  title: text("title"), // "Senior Stylist", "Nail Technician"
  bio: text("bio"),
  yearsExperience: integer("years_experience"),
  
  // Employment
  employeeId: text("employee_id"),
  hireDate: date("hire_date"),
  employmentType: text("employment_type", {
    enum: ["full_time", "part_time", "contractor"]
  }),
  
  // Availability
  workingHours: jsonb("working_hours").default({}), // {monday: {start: "09:00", end: "17:00"}}
  breakDurationMinutes: integer("break_duration_minutes").default(30),
  
  // Status
  isActive: boolean("is_active").default(true),
  isBookable: boolean("is_bookable").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff service specializations
export const salonStaffServices = pgTable("salon_staff_services", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => salonStaff.id, { onDelete: 'cascade' }).notNull(),
  serviceId: integer("service_id").references(() => salonServices.id, { onDelete: 'cascade' }).notNull(),
  
  // Skill level
  proficiencyLevel: text("proficiency_level", {
    enum: ["learning", "capable", "expert"]
  }).default("capable"),
  
  // Custom pricing (if different from standard)
  customPrice: decimal("custom_price", { precision: 10, scale: 2 }),
  customDurationMinutes: integer("custom_duration_minutes"),
});

// Salon appointments
export const salonAppointments = pgTable("salon_appointments", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Links to universal booking
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: 'cascade' }),
  
  // Salon-specific details
  serviceId: integer("service_id").references(() => salonServices.id).notNull(),
  staffId: integer("staff_id").references(() => salonStaff.id).notNull(),
  
  // Additional salon data
  colorFormula: text("color_formula"), // for hair coloring
  patchTestDate: date("patch_test_date"),
  previousAppointmentId: integer("previous_appointment_id").references(() => salonAppointments.id),
  
  // Products used (for tracking)
  productsUsed: jsonb("products_used").default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// RELATIONSHIPS
// =============================================================================

// Salon service relationships
export const salonServiceRelations = relations(salonServices, ({ one, many }) => ({
  business: one(businessTenants, {
    fields: [salonServices.businessId],
    references: [businessTenants.id],
  }),
  staffServices: many(salonStaffServices),
  appointments: many(salonAppointments),
}));

// Salon staff relationships
export const salonStaffRelations = relations(salonStaff, ({ one, many }) => ({
  business: one(businessTenants, {
    fields: [salonStaff.businessId],
    references: [businessTenants.id],
  }),
  user: one(platformUsers, {
    fields: [salonStaff.userId],
    references: [platformUsers.id],
  }),
  staffServices: many(salonStaffServices),
  appointments: many(salonAppointments),
}));

// Staff service relationships
export const salonStaffServiceRelations = relations(salonStaffServices, ({ one }) => ({
  staff: one(salonStaff, {
    fields: [salonStaffServices.staffId],
    references: [salonStaff.id],
  }),
  service: one(salonServices, {
    fields: [salonStaffServices.serviceId],
    references: [salonServices.id],
  }),
}));

// Appointment relationships
export const salonAppointmentRelations = relations(salonAppointments, ({ one }) => ({
  business: one(businessTenants, {
    fields: [salonAppointments.businessId],
    references: [businessTenants.id],
  }),
  booking: one(bookings, {
    fields: [salonAppointments.bookingId],
    references: [bookings.id],
  }),
  service: one(salonServices, {
    fields: [salonAppointments.serviceId],
    references: [salonServices.id],
  }),
  staff: one(salonStaff, {
    fields: [salonAppointments.staffId],
    references: [salonStaff.id],
  }),
  previousAppointment: one(salonAppointments, {
    fields: [salonAppointments.previousAppointmentId],
    references: [salonAppointments.id],
  }),
}));

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const insertSalonServiceSchema = createInsertSchema(salonServices);
export const selectSalonServiceSchema = createSelectSchema(salonServices);

export const insertSalonStaffSchema = createInsertSchema(salonStaff);
export const selectSalonStaffSchema = createSelectSchema(salonStaff);

export const insertSalonStaffServiceSchema = createInsertSchema(salonStaffServices);
export const selectSalonStaffServiceSchema = createSelectSchema(salonStaffServices);

export const insertSalonAppointmentSchema = createInsertSchema(salonAppointments);
export const selectSalonAppointmentSchema = createSelectSchema(salonAppointments);

// Export types
export type SalonService = typeof salonServices.$inferSelect;
export type SalonStaff = typeof salonStaff.$inferSelect;
export type SalonStaffService = typeof salonStaffServices.$inferSelect;
export type SalonAppointment = typeof salonAppointments.$inferSelect;