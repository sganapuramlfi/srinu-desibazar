import { pgTable, text, serial, integer, boolean, timestamp, json, foreignKey, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

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
  contactInfo: json("contact_info").$type<{
    phone: string;
    email: string;
    address: string;
  }>(),
  workingHours: json("working_hours").$type<{
    [key: string]: { open: string; close: string };
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const advertisements = pgTable("advertisements", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id),
  title: text("title").notNull(),
  description: text("description"),
  imageUrls: json("image_urls").$type<string[]>(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id),
  customerId: integer("customer_id").references(() => users.id),
  serviceId: integer("service_id"),
  status: text("status", { enum: ["pending", "confirmed", "cancelled"] }).default("pending"),
  dateTime: timestamp("date_time").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id),
  customerId: integer("customer_id").references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Industry-specific Tables
export const salonServices = pgTable("salon_services", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  price: decimal("price").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salonStaff = pgTable("salon_staff", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id),
  name: text("name").notNull(),
  specialization: text("specialization"),
  schedule: json("schedule").$type<{
    [key: string]: { start: string; end: string };
  }>(),
});

export const restaurantTables = pgTable("restaurant_tables", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id),
  number: integer("number").notNull(),
  capacity: integer("capacity").notNull(),
  status: text("status", { enum: ["available", "occupied", "reserved"] }).default("available"),
});

export const restaurantMenu = pgTable("restaurant_menu", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  venue: text("venue").notNull(),
  date: timestamp("date").notNull(),
  capacity: integer("capacity").notNull(),
  ticketPrice: decimal("ticket_price").notNull(),
  imageUrl: text("image_url"),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", { enum: ["house", "apartment", "commercial", "land"] }).notNull(),
  price: decimal("price").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  area: decimal("area"),
  address: text("address").notNull(),
  imageUrls: json("image_urls").$type<string[]>(),
  status: text("status", { enum: ["available", "sold", "rented"] }).default("available"),
});

export const retailProducts = pgTable("retail_products", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price").notNull(),
  stock: integer("stock").notNull(),
  category: text("category").notNull(),
  imageUrls: json("image_urls").$type<string[]>(),
});

export const professionalServices = pgTable("professional_services", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  price: decimal("price").notNull(),
  category: text("category").notNull(),
});

// Relations
export const businessRelations = relations(businesses, ({ many, one }) => ({
  owner: one(users, {
    fields: [businesses.userId],
    references: [users.id],
  }),
  advertisements: many(advertisements),
  bookings: many(bookings),
  reviews: many(reviews),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertBusinessSchema = createInsertSchema(businesses);
export const selectBusinessSchema = createSelectSchema(businesses);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;
