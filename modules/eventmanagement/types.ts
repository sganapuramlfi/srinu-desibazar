import { z } from "zod";
import { BaseService, BaseBooking, Resource } from '../core/types.js';
import { BookingRequest } from '../shared/booking-core/types.js';

// Event venue (extends Resource)
export interface EventVenue extends Resource {
  type: 'venue';
  venueName: string;
  capacity: {
    seated: number;
    standing: number;
    maximum: number;
  };
  location: 'indoor' | 'outdoor' | 'hybrid' | 'rooftop' | 'garden';
  venueType: 'ballroom' | 'conference' | 'banquet' | 'theater' | 'garden' | 'warehouse' | 'rooftop';
  amenities: string[]; // ['av-equipment', 'catering-kitchen', 'parking', 'wifi', 'stage']
  setupOptions: string[]; // ['theater', 'classroom', 'banquet', 'cocktail', 'u-shape', 'boardroom']
  pricePerHour: number;
  minimumHours: number;
  isActive: boolean;
  images: string[];
  floorPlan?: string;
  restrictions: string[]; // ['no-alcohol', 'no-music-after-10pm', 'no-smoking']
}

// Event booking (extends BaseBooking)
export interface EventBooking extends BaseBooking {
  venueId: number;
  eventType: 'wedding' | 'corporate' | 'birthday' | 'conference' | 'seminar' | 'exhibition' | 'party' | 'other';
  guestCount: number;
  setupType: 'theater' | 'classroom' | 'banquet' | 'cocktail' | 'u-shape' | 'boardroom' | 'custom';
  eventName: string;
  contactPhone: string;
  specialRequests?: string;
  cateringRequired?: boolean;
  avEquipment?: string[];
  decorationRequests?: string;
  alcohol?: boolean;
  parking?: number;
  deposit?: {
    amount: number;
    required: boolean;
    paid: boolean;
    paidAt?: Date;
  };
  eventCoordinator?: number; // staff ID
}

// Event service (extends BaseService)
export interface EventService extends BaseService {
  category: 'venue-rental' | 'catering' | 'decoration' | 'av-equipment' | 'photography' | 'coordination';
  requiresVenue: boolean;
  duration: number; // hours
  maxGuests: number;
  minGuests: number;
  setupTime: number; // hours needed for setup
  teardownTime: number; // hours needed for teardown
  includes: string[]; // What's included in the service
}

// Event staff/coordinator
export interface EventStaff extends Resource {
  type: 'staff';
  email: string;
  phone?: string;
  role: 'coordinator' | 'manager' | 'setup' | 'catering' | 'av-tech' | 'security';
  specializations: string[]; // ['weddings', 'corporate', 'av-setup', 'catering']
  languages: string[];
  experience: number; // years
  rating: number;
  status: 'active' | 'inactive' | 'on_leave';
  workingHours: {
    [key: string]: {
      isWorking: boolean;
      startTime: string;
      endTime: string;
      breaks?: Array<{
        startTime: string;
        endTime: string;
      }>;
    };
  };
  maxConcurrentEvents: number;
}

// Event booking request
export interface EventBookingRequest extends BookingRequest {
  venueId: number;
  eventType: 'wedding' | 'corporate' | 'birthday' | 'conference' | 'seminar' | 'exhibition' | 'party' | 'other';
  guestCount: number;
  setupType: 'theater' | 'classroom' | 'banquet' | 'cocktail' | 'u-shape' | 'boardroom' | 'custom';
  eventName: string;
  contactPhone: string;
  specialRequests?: string;
  cateringRequired?: boolean;
  avEquipment?: string[];
  decorationRequests?: string;
  alcohol?: boolean;
  parking?: number;
  preferredCoordinator?: number;
}

// Equipment inventory
export interface EventEquipment {
  id: number;
  businessId: number;
  name: string;
  category: 'av' | 'furniture' | 'lighting' | 'decor' | 'catering' | 'staging';
  description?: string;
  quantity: number;
  available: number;
  pricePerDay: number;
  requiresOperator: boolean;
  setupTime: number; // minutes
  specifications?: Record<string, any>;
  maintenanceSchedule?: Date;
  status: 'available' | 'rented' | 'maintenance' | 'damaged';
}

// Catering package
export interface CateringPackage {
  id: number;
  businessId: number;
  name: string;
  description: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'cocktail' | 'buffet' | 'plated' | 'appetizers';
  pricePerPerson: number;
  minimumGuests: number;
  maximumGuests: number;
  includes: string[];
  dietaryOptions: string[]; // ['vegetarian', 'vegan', 'gluten-free', 'kosher', 'halal']
  setupRequired: boolean;
  staffRequired: number;
  isActive: boolean;
}

// Event timeline/runsheet
export interface EventTimeline {
  id: number;
  eventBookingId: number;
  timeline: Array<{
    time: string;
    activity: string;
    responsible: string;
    duration: number; // minutes
    notes?: string;
  }>;
  setupStart: string;
  eventStart: string;
  eventEnd: string;
  teardownEnd: string;
  createdBy: number;
  approvedBy?: number;
  status: 'draft' | 'approved' | 'in-progress' | 'completed';
}

// Event analytics
export interface EventAnalytics {
  date: string;
  totalEvents: number;
  totalRevenue: number;
  averageEventSize: number;
  venueUtilization: number;
  eventsByType: {
    wedding: number;
    corporate: number;
    birthday: number;
    conference: number;
    other: number;
  };
  popularVenues: Array<{
    venueId: number;
    venueName: string;
    bookings: number;
    revenue: number;
    utilization: number;
  }>;
  coordinatorPerformance: Array<{
    coordinatorId: number;
    name: string;
    eventsManaged: number;
    clientSatisfaction: number;
    revenue: number;
  }>;
  seasonalTrends: Array<{
    month: string;
    bookings: number;
    revenue: number;
  }>;
}

// Form validation schemas
export const eventVenueFormSchema = z.object({
  venueName: z.string().min(1, "Venue name is required"),
  capacity: z.object({
    seated: z.coerce.number().min(1, "Seated capacity required"),
    standing: z.coerce.number().min(1, "Standing capacity required"),
    maximum: z.coerce.number().min(1, "Maximum capacity required"),
  }),
  location: z.enum(['indoor', 'outdoor', 'hybrid', 'rooftop', 'garden']),
  venueType: z.enum(['ballroom', 'conference', 'banquet', 'theater', 'garden', 'warehouse', 'rooftop']),
  amenities: z.array(z.string()).default([]),
  setupOptions: z.array(z.string()).min(1, "At least one setup option required"),
  pricePerHour: z.coerce.number().min(0, "Price cannot be negative"),
  minimumHours: z.coerce.number().min(1, "Minimum 1 hour required"),
  isActive: z.boolean().default(true),
  images: z.array(z.string()).default([]),
  restrictions: z.array(z.string()).default([]),
});

export const eventBookingFormSchema = z.object({
  serviceId: z.coerce.number(),
  venueId: z.coerce.number(),
  startTime: z.string(),
  endTime: z.string(),
  eventType: z.enum(['wedding', 'corporate', 'birthday', 'conference', 'seminar', 'exhibition', 'party', 'other']),
  guestCount: z.coerce.number().min(1, "Guest count is required").max(10000, "Maximum 10,000 guests"),
  setupType: z.enum(['theater', 'classroom', 'banquet', 'cocktail', 'u-shape', 'boardroom', 'custom']),
  eventName: z.string().min(1, "Event name is required"),
  contactPhone: z.string().min(10, "Valid phone number required"),
  specialRequests: z.string().optional(),
  cateringRequired: z.boolean().default(false),
  avEquipment: z.array(z.string()).default([]),
  decorationRequests: z.string().optional(),
  alcohol: z.boolean().default(false),
  parking: z.coerce.number().min(0).optional(),
  preferredCoordinator: z.coerce.number().optional(),
});

export const eventStaffFormSchema = z.object({
  name: z.string().min(1, "Staff name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  role: z.enum(['coordinator', 'manager', 'setup', 'catering', 'av-tech', 'security']),
  specializations: z.array(z.string()).min(1, "At least one specialization required"),
  languages: z.array(z.string()).min(1, "At least one language required"),
  experience: z.coerce.number().min(0, "Experience cannot be negative"),
  status: z.enum(['active', 'inactive', 'on_leave']).default('active'),
  maxConcurrentEvents: z.coerce.number().min(1, "Must handle at least 1 event").max(10, "Maximum 10 concurrent events"),
});

export const cateringPackageFormSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(['breakfast', 'lunch', 'dinner', 'cocktail', 'buffet', 'plated', 'appetizers']),
  pricePerPerson: z.coerce.number().min(0, "Price cannot be negative"),
  minimumGuests: z.coerce.number().min(1, "Minimum 1 guest required"),
  maximumGuests: z.coerce.number().min(1, "Maximum guests required"),
  includes: z.array(z.string()).min(1, "At least one item must be included"),
  dietaryOptions: z.array(z.string()).default([]),
  setupRequired: z.boolean().default(true),
  staffRequired: z.coerce.number().min(0, "Staff count cannot be negative"),
  isActive: z.boolean().default(true),
});

export const eventEquipmentFormSchema = z.object({
  name: z.string().min(1, "Equipment name is required"),
  category: z.enum(['av', 'furniture', 'lighting', 'decor', 'catering', 'staging']),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  pricePerDay: z.coerce.number().min(0, "Price cannot be negative"),
  requiresOperator: z.boolean().default(false),
  setupTime: z.coerce.number().min(0, "Setup time cannot be negative"),
  status: z.enum(['available', 'rented', 'maintenance', 'damaged']).default('available'),
});

// Export form types
export type EventVenueFormData = z.infer<typeof eventVenueFormSchema>;
export type EventBookingFormData = z.infer<typeof eventBookingFormSchema>;
export type EventStaffFormData = z.infer<typeof eventStaffFormSchema>;
export type CateringPackageFormData = z.infer<typeof cateringPackageFormSchema>;
export type EventEquipmentFormData = z.infer<typeof eventEquipmentFormSchema>;