import { z } from "zod";
import { BaseService, BaseBooking, Resource } from '../core/types.js';
import { BookingRequest } from '../shared/booking-core/types.js';

// Restaurant-specific table extension
export interface RestaurantTable extends Resource {
  type: 'table';
  tableNumber: string;
  seats: number;
  location: 'indoor' | 'outdoor' | 'patio' | 'private' | 'bar';
  features: string[]; // ['window', 'wheelchair-accessible', 'quiet', 'view']
  minParty: number;
  maxParty: number;
  isActive: boolean;
}

// Restaurant reservation (extends BaseBooking)
export interface RestaurantReservation extends BaseBooking {
  tableId: number;
  partySize: number;
  specialRequests?: string;
  dietaryRestrictions?: string[];
  occasion?: 'birthday' | 'anniversary' | 'business' | 'date' | 'celebration' | 'other';
  contactPhone: string;
  seatingPreference?: 'indoor' | 'outdoor' | 'no-preference';
  highChair?: boolean;
  deposit?: {
    amount: number;
    required: boolean;
    paid: boolean;
    paidAt?: Date;
  };
}

// Restaurant service (extends BaseService)
export interface RestaurantService extends BaseService {
  category: 'dining' | 'private-event' | 'catering' | 'takeout' | 'delivery';
  requiresTable: boolean;
  minPartySize: number;
  maxPartySize: number;
  menuItems?: string[];
  priceRange: 'budget' | 'moderate' | 'upscale' | 'fine-dining';
}

// Menu management
export interface MenuItem {
  id: number;
  businessId: number;
  name: string;
  description?: string;
  price: number;
  category: 'appetizer' | 'main' | 'dessert' | 'beverage' | 'special';
  allergens: string[];
  dietary: string[]; // ['vegetarian', 'vegan', 'gluten-free', 'dairy-free']
  availability: {
    allDay: boolean;
    startTime?: string;
    endTime?: string;
    daysOfWeek: number[];
  };
  isActive: boolean;
}

// Restaurant staff
export interface RestaurantStaff extends Resource {
  type: 'staff';
  email: string;
  phone?: string;
  role: 'host' | 'server' | 'manager' | 'chef' | 'bartender';
  shift: 'morning' | 'afternoon' | 'evening' | 'split';
  languages: string[];
  experience: number; // years
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
}

// Restaurant-specific booking request
export interface RestaurantBookingRequest extends BookingRequest {
  tableId?: number; // Preferred table
  partySize: number;
  seatingPreference?: 'indoor' | 'outdoor' | 'no-preference';
  specialRequests?: string;
  dietaryRestrictions?: string[];
  occasion?: 'birthday' | 'anniversary' | 'business' | 'date' | 'celebration' | 'other';
  contactPhone: string;
  highChair?: boolean;
}

// Waitlist management
export interface WaitlistEntry {
  id: number;
  businessId: number;
  customerName: string;
  contactPhone: string;
  partySize: number;
  estimatedWait: number; // minutes
  seatingPreference?: 'indoor' | 'outdoor' | 'no-preference';
  specialRequests?: string;
  status: 'waiting' | 'seated' | 'cancelled' | 'no-show';
  createdAt: Date;
  notifiedAt?: Date;
}

// Restaurant analytics
export interface RestaurantAnalytics {
  date: string;
  totalReservations: number;
  walkIns: number;
  cancellations: number;
  noShows: number;
  averagePartySize: number;
  turnoverRate: number;
  revenue: number;
  peakHours: Array<{
    hour: number;
    reservations: number;
    occupancy: number;
  }>;
  popularTables: Array<{
    tableId: number;
    tableNumber: string;
    bookings: number;
  }>;
}

// Form validation schemas
export const restaurantTableFormSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required"),
  seats: z.coerce.number().min(1, "Must seat at least 1 person").max(20, "Maximum 20 seats"),
  location: z.enum(['indoor', 'outdoor', 'patio', 'private', 'bar']),
  features: z.array(z.string()).default([]),
  minParty: z.coerce.number().min(1, "Minimum party size required"),
  maxParty: z.coerce.number().min(1, "Maximum party size required"),
  isActive: z.boolean().default(true),
});

export const restaurantReservationFormSchema = z.object({
  serviceId: z.coerce.number(),
  startTime: z.string(),
  endTime: z.string(),
  partySize: z.coerce.number().min(1, "Party size is required").max(20, "Maximum 20 people"),
  tableId: z.coerce.number().optional(),
  specialRequests: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).default([]),
  occasion: z.enum(['birthday', 'anniversary', 'business', 'date', 'celebration', 'other']).optional(),
  contactPhone: z.string().min(10, "Valid phone number required"),
  seatingPreference: z.enum(['indoor', 'outdoor', 'no-preference']).default('no-preference'),
  highChair: z.boolean().default(false),
});

export const restaurantStaffFormSchema = z.object({
  name: z.string().min(1, "Staff name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  role: z.enum(['host', 'server', 'manager', 'chef', 'bartender']),
  shift: z.enum(['morning', 'afternoon', 'evening', 'split']),
  languages: z.array(z.string()).min(1, "At least one language is required"),
  experience: z.coerce.number().min(0, "Experience cannot be negative"),
  status: z.enum(['active', 'inactive', 'on_leave']).default('active'),
});

export const menuItemFormSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  category: z.enum(['appetizer', 'main', 'dessert', 'beverage', 'special']),
  allergens: z.array(z.string()).default([]),
  dietary: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

// Export form types
export type RestaurantTableFormData = z.infer<typeof restaurantTableFormSchema>;
export type RestaurantReservationFormData = z.infer<typeof restaurantReservationFormSchema>;
export type RestaurantStaffFormData = z.infer<typeof restaurantStaffFormSchema>;
export type MenuItemFormData = z.infer<typeof menuItemFormSchema>;