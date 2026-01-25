import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Import all schemas
import * as coreSchema from "./schema";
import * as salonSchema from "./salon-schema";
import * as restaurantSchema from "./restaurant-schema";
import * as reviewSchema from "./review-schema";
import * as bookingLifecycleSchema from "./booking-lifecycle-schema";
import * as businessCommunicationSchema from "./business-communication-schema";
import * as messagingSchema from "./messaging-schema";

// Combine all schemas
const schema = {
  ...coreSchema,
  ...salonSchema,
  ...restaurantSchema,
  ...reviewSchema,
  ...bookingLifecycleSchema,
  ...businessCommunicationSchema,
  ...messagingSchema,
};

// Use default connection string if DATABASE_URL is not set
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:9100/desibazaar";

const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool, { schema });

// Export individual schema modules for convenient access
export { coreSchema, salonSchema, restaurantSchema, reviewSchema, bookingLifecycleSchema };

// Export commonly used tables
export const {
  // Core platform tables
  platformUsers,
  businessTenants,
  businessAccess,
  subscriptionPlans,
  businessSubscriptions,
  bookableItems,
  bookings,
  businessDirectory,
  advertisements,
  customerProfiles,
  businessSettings,
  aiSessions,
  aiInteractions,
} = coreSchema;

export const {
  // Salon-specific tables
  salonServices,
  salonStaff,
  salonStaffServices,
  salonAppointments,
  // Salon Zod schemas
  insertSalonServiceSchema,
  selectSalonServiceSchema,
  insertSalonStaffSchema,
  selectSalonStaffSchema,
  insertSalonStaffServiceSchema,
  selectSalonStaffServiceSchema,
  insertSalonAppointmentSchema,
  selectSalonAppointmentSchema,
} = salonSchema;

export const {
  // Restaurant-specific tables
  restaurantMenuCategories,
  restaurantMenuItems,
  restaurantTables,
  restaurantStaff,
  restaurantReservations,
  restaurantOrders,
  // Restaurant Zod schemas
  insertRestaurantMenuCategorySchema,
  selectRestaurantMenuCategorySchema,
  insertRestaurantMenuItemSchema,
  selectRestaurantMenuItemSchema,
  insertRestaurantTableSchema,
  selectRestaurantTableSchema,
  insertRestaurantStaffSchema,
  selectRestaurantStaffSchema,
  insertRestaurantReservationSchema,
  selectRestaurantReservationSchema,
  insertRestaurantOrderSchema,
  selectRestaurantOrderSchema,
} = restaurantSchema;

export const {
  // Review management tables
  businessReviews,
  reviewTemplates,
  reviewAnalytics,
  // Review Zod schemas
  insertBusinessReviewSchema,
  selectBusinessReviewSchema,
  insertReviewTemplateSchema,
  selectReviewTemplateSchema,
  insertReviewAnalyticsSchema,
  selectReviewAnalyticsSchema,
} = reviewSchema;

export const {
  // Booking lifecycle tables
  bookingOperations,
  bookingConstraints,
  businessConstraintOverrides,
  bookingPolicies,
  bookingStatusHistory,
  // Booking lifecycle Zod schemas
  insertBookingOperationSchema,
  selectBookingOperationSchema,
  insertBookingConstraintSchema,
  selectBookingConstraintSchema,
  insertBusinessConstraintOverrideSchema,
  selectBusinessConstraintOverrideSchema,
  insertBookingPolicySchema,
  selectBookingPolicySchema,
  insertBookingStatusHistorySchema,
  selectBookingStatusHistorySchema,
} = bookingLifecycleSchema;

export const {
  // Business communication tables
  businessCommunications,
  businessAlertPreferences,
  aiSuggestions,
  notificationQueue,
  communicationAnalytics,
  // Relations
  businessCommunicationsRelations,
  businessAlertPreferencesRelations,
  aiSuggestionsRelations,
  notificationQueueRelations,
  communicationAnalyticsRelations,
} = businessCommunicationSchema;

export const {
  // Messaging tables
  chatConversations,
  chatMessages,
  typingIndicators,
  messageReadReceipts,
  chatPreferences,
  messageRateLimits,
  // Relations
  chatConversationRelations,
  chatMessageRelations,
} = messagingSchema;