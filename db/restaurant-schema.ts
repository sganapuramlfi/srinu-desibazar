import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, date, time, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { businessTenants, platformUsers, bookings } from "./schema";

// =============================================================================
// RESTAURANT BUSINESS SCHEMA
// =============================================================================

// Menu categories
export const restaurantMenuCategories = pgTable("restaurant_menu_categories", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Category info
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  
  // Display
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  
  // Availability
  availableTimes: jsonb("available_times").default({}), // {start: "11:00", end: "15:00"}
  availableDays: jsonb("available_days").default([]), // ["monday", "tuesday"]
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu items
export const restaurantMenuItems = pgTable("restaurant_menu_items", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  categoryId: integer("category_id").references(() => restaurantMenuCategories.id, { onDelete: 'set null' }),
  
  // Item details
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  
  // Preparation
  prepTimeMinutes: integer("prep_time_minutes"),
  cookingMethod: text("cooking_method"),
  servingSize: text("serving_size"),
  
  // Nutrition
  calories: integer("calories"),
  nutritionInfo: jsonb("nutrition_info").default({}),
  
  // Dietary
  dietaryTags: jsonb("dietary_tags").default([]), // ["vegetarian", "vegan", "gluten-free", "halal"]
  allergens: jsonb("allergens").default([]), // ["nuts", "dairy", "shellfish"]
  spiceLevel: integer("spice_level"), // 0-5
  
  // Inventory
  inStock: boolean("in_stock").default(true),
  dailyLimit: integer("daily_limit"),
  
  // Display
  isFeatured: boolean("is_featured").default(false),
  isPopular: boolean("is_popular").default(false),
  displayOrder: integer("display_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurant tables
export const restaurantTables = pgTable("restaurant_tables", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Table info
  tableNumber: text("table_number").notNull(),
  floorArea: text("floor_area"), // "Main", "Patio", "Private"
  
  // Capacity
  minCapacity: integer("min_capacity").default(1),
  maxCapacity: integer("max_capacity").notNull(),
  idealCapacity: integer("ideal_capacity"),
  
  // Features
  tableShape: text("table_shape"), // "round", "square", "rectangle"
  isBooth: boolean("is_booth").default(false),
  hasWindowView: boolean("has_window_view").default(false),
  isWheelchairAccessible: boolean("is_wheelchair_accessible").default(true),
  
  // Availability
  isReservable: boolean("is_reservable").default(true),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueTableNumber: uniqueIndex("unique_table_number").on(table.businessId, table.tableNumber),
}));

// Table reservations
export const restaurantReservations = pgTable("restaurant_reservations", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Links to universal booking
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: 'cascade' }),
  
  // Restaurant-specific
  tableId: integer("table_id").references(() => restaurantTables.id),
  occasion: text("occasion"), // "birthday", "anniversary", "business"
  
  // Preferences
  seatingPreference: text("seating_preference"), // "window", "quiet", "near bar"
  dietaryRequirements: jsonb("dietary_requirements").default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Restaurant staff members
export const restaurantStaff = pgTable("restaurant_staff", {
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
  title: text("title"), // "Head Chef", "Server", "Bartender", "Host"
  bio: text("bio"),
  yearsExperience: integer("years_experience"),
  
  // Restaurant-specific roles
  department: text("department", {
    enum: ["kitchen", "front_of_house", "bar", "management"]
  }),
  position: text("position"), // "Sous Chef", "Line Cook", "Server", "Bartender", "Manager"
  
  // Certifications
  certifications: jsonb("certifications").default([]), // ["food_safety", "alcohol_service", "first_aid"]
  
  // Employment
  employeeId: text("employee_id"),
  hireDate: date("hire_date"),
  employmentType: text("employment_type", {
    enum: ["full_time", "part_time", "contractor", "casual"]
  }),
  
  // Schedule and availability
  workingHours: jsonb("working_hours").default({}), // {monday: {start: "09:00", end: "17:00"}}
  breakDurationMinutes: integer("break_duration_minutes").default(30),
  maxShiftHours: integer("max_shift_hours").default(8),
  
  // Skills and specializations
  cuisineSpecialties: jsonb("cuisine_specialties").default([]), // ["italian", "asian", "grill"]
  skills: jsonb("skills").default([]), // ["cocktails", "wine_service", "cash_handling"]
  languages: jsonb("languages").default([]), // ["english", "spanish", "mandarin"]
  
  // Performance
  performanceRating: decimal("performance_rating", { precision: 3, scale: 2 }), // 0.00-5.00
  customerRating: decimal("customer_rating", { precision: 3, scale: 2 }), // 0.00-5.00
  
  // Status
  isActive: boolean("is_active").default(true),
  canTakeOrders: boolean("can_take_orders").default(false),
  canHandlePayments: boolean("can_handle_payments").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Food orders
export const restaurantOrders = pgTable("restaurant_orders", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessTenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Order info
  orderNumber: text("order_number").unique().notNull(),
  orderType: text("order_type", {
    enum: ["dine_in", "takeout", "delivery"]
  }).notNull(),
  
  // Customer
  customerId: integer("customer_id").references(() => platformUsers.id, { onDelete: 'set null' }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  
  // Order items
  orderItems: jsonb("order_items").notNull(), // [{item_id, quantity, modifications, price}]
  
  // Totals
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  tip: decimal("tip", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  
  // Status
  status: text("status", {
    enum: ["received", "preparing", "ready", "delivered", "completed", "cancelled"]
  }).default("received"),
  
  // Timing
  orderedAt: timestamp("ordered_at").defaultNow(),
  estimatedReadyAt: timestamp("estimated_ready_at"),
  readyAt: timestamp("ready_at"),
  completedAt: timestamp("completed_at"),
  
  // Delivery info
  deliveryAddress: jsonb("delivery_address"),
  deliveryInstructions: text("delivery_instructions"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// RELATIONSHIPS
// =============================================================================

// Menu category relationships
export const restaurantMenuCategoryRelations = relations(restaurantMenuCategories, ({ one, many }) => ({
  business: one(businessTenants, {
    fields: [restaurantMenuCategories.businessId],
    references: [businessTenants.id],
  }),
  menuItems: many(restaurantMenuItems),
}));

// Menu item relationships
export const restaurantMenuItemRelations = relations(restaurantMenuItems, ({ one }) => ({
  business: one(businessTenants, {
    fields: [restaurantMenuItems.businessId],
    references: [businessTenants.id],
  }),
  category: one(restaurantMenuCategories, {
    fields: [restaurantMenuItems.categoryId],
    references: [restaurantMenuCategories.id],
  }),
}));

// Table relationships
export const restaurantTableRelations = relations(restaurantTables, ({ one, many }) => ({
  business: one(businessTenants, {
    fields: [restaurantTables.businessId],
    references: [businessTenants.id],
  }),
  reservations: many(restaurantReservations),
}));

// Restaurant staff relationships
export const restaurantStaffRelations = relations(restaurantStaff, ({ one }) => ({
  business: one(businessTenants, {
    fields: [restaurantStaff.businessId],
    references: [businessTenants.id],
  }),
  user: one(platformUsers, {
    fields: [restaurantStaff.userId],
    references: [platformUsers.id],
  }),
}));

// Reservation relationships
export const restaurantReservationRelations = relations(restaurantReservations, ({ one }) => ({
  business: one(businessTenants, {
    fields: [restaurantReservations.businessId],
    references: [businessTenants.id],
  }),
  booking: one(bookings, {
    fields: [restaurantReservations.bookingId],
    references: [bookings.id],
  }),
  table: one(restaurantTables, {
    fields: [restaurantReservations.tableId],
    references: [restaurantTables.id],
  }),
}));

// Order relationships
export const restaurantOrderRelations = relations(restaurantOrders, ({ one }) => ({
  business: one(businessTenants, {
    fields: [restaurantOrders.businessId],
    references: [businessTenants.id],
  }),
  customer: one(platformUsers, {
    fields: [restaurantOrders.customerId],
    references: [platformUsers.id],
  }),
}));

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const insertRestaurantMenuCategorySchema = createInsertSchema(restaurantMenuCategories);
export const selectRestaurantMenuCategorySchema = createSelectSchema(restaurantMenuCategories);

export const insertRestaurantMenuItemSchema = createInsertSchema(restaurantMenuItems);
export const selectRestaurantMenuItemSchema = createSelectSchema(restaurantMenuItems);

export const insertRestaurantTableSchema = createInsertSchema(restaurantTables);
export const selectRestaurantTableSchema = createSelectSchema(restaurantTables);

export const insertRestaurantReservationSchema = createInsertSchema(restaurantReservations);
export const selectRestaurantReservationSchema = createSelectSchema(restaurantReservations);

export const insertRestaurantStaffSchema = createInsertSchema(restaurantStaff);
export const selectRestaurantStaffSchema = createSelectSchema(restaurantStaff);

export const insertRestaurantOrderSchema = createInsertSchema(restaurantOrders);
export const selectRestaurantOrderSchema = createSelectSchema(restaurantOrders);

// Export types
export type RestaurantMenuCategory = typeof restaurantMenuCategories.$inferSelect;
export type RestaurantMenuItem = typeof restaurantMenuItems.$inferSelect;
export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type RestaurantStaff = typeof restaurantStaff.$inferSelect;
export type RestaurantReservation = typeof restaurantReservations.$inferSelect;
export type RestaurantOrder = typeof restaurantOrders.$inferSelect;