import { z } from "zod";
import { BaseService, BaseBooking, Resource } from '../core/types.js';
import { BookingRequest } from '../shared/booking-core/types.js';

// Retail appointment (extends BaseBooking)
export interface RetailAppointment extends BaseBooking {
  appointmentType: 'personal-shopping' | 'styling' | 'consultation' | 'fitting' | 'custom-order' | 'alteration';
  customerId: number;
  contactPhone: string;
  preferredProducts?: string[];
  budget?: {
    min: number;
    max: number;
  };
  occasion?: string;
  stylePreferences?: string[];
  measurements?: Record<string, number>;
  specialRequests?: string;
  personalShopperId?: number;
  priority: 'standard' | 'vip' | 'urgent';
}

// Retail service (extends BaseService)
export interface RetailService extends BaseService {
  category: 'personal-shopping' | 'styling' | 'consultation' | 'fitting' | 'alteration' | 'custom-design';
  requiresProducts: boolean;
  maxBudget?: number;
  minBudget?: number;
  duration: number; // minutes
  includesFollowUp: boolean;
  expertiseRequired: string[]; // ['fashion', 'luxury', 'formal', 'casual', 'plus-size']
}

// Personal shopper/stylist
export interface PersonalShopper extends Resource {
  type: 'staff';
  email: string;
  phone?: string;
  role: 'personal-shopper' | 'stylist' | 'consultant' | 'fitter' | 'designer';
  specializations: string[]; // ['women', 'men', 'formal', 'casual', 'luxury', 'plus-size']
  languages: string[];
  experience: number; // years
  rating: number;
  portfolio?: string[];
  certifications?: string[];
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
  maxAppointmentsPerDay: number;
  commission: number; // percentage
}

// Product inventory
export interface RetailProduct {
  id: number;
  businessId: number;
  name: string;
  brand: string;
  category: 'clothing' | 'accessories' | 'shoes' | 'jewelry' | 'bags' | 'cosmetics';
  subcategory: string;
  price: number;
  salePrice?: number;
  sku: string;
  sizes?: string[];
  colors?: string[];
  materials?: string[];
  season?: 'spring' | 'summer' | 'fall' | 'winter' | 'all-season';
  gender: 'men' | 'women' | 'unisex' | 'kids';
  images: string[];
  description: string;
  features: string[];
  inventory: {
    [sizeColor: string]: number; // "M-Blue": 5
  };
  isActive: boolean;
  tags: string[];
}

// Retail booking request
export interface RetailBookingRequest extends BookingRequest {
  appointmentType: 'personal-shopping' | 'styling' | 'consultation' | 'fitting' | 'custom-order' | 'alteration';
  contactPhone: string;
  preferredProducts?: string[];
  budget?: {
    min: number;
    max: number;
  };
  occasion?: string;
  stylePreferences?: string[];
  measurements?: Record<string, number>;
  specialRequests?: string;
  preferredShopper?: number;
  priority?: 'standard' | 'vip' | 'urgent';
}

// Customer profile
export interface RetailCustomer {
  id: number;
  businessId: number;
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  measurements?: {
    [key: string]: number; // chest, waist, hips, etc.
  };
  styleProfile: {
    preferredStyles: string[];
    preferredColors: string[];
    preferredBrands: string[];
    budgetRange: {
      min: number;
      max: number;
    };
    sizes: {
      [category: string]: string; // "tops": "M", "bottoms": "32"
    };
  };
  purchaseHistory: Array<{
    date: Date;
    products: number[];
    totalAmount: number;
    appointmentId?: number;
  }>;
  loyaltyTier: 'standard' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  notes?: string;
  createdAt: Date;
  lastVisit?: Date;
}

// Fitting room
export interface FittingRoom extends Resource {
  type: 'fitting-room';
  roomNumber: string;
  size: 'small' | 'medium' | 'large' | 'accessible';
  amenities: string[]; // ['mirror', 'seating', 'hooks', 'lighting', 'wheelchair-accessible']
  isVIP: boolean;
  isActive: boolean;
  currentlyOccupied: boolean;
}

// Style consultation
export interface StyleConsultation {
  id: number;
  customerId: number;
  personalShopperId: number;
  appointmentId: number;
  consultationType: 'wardrobe-audit' | 'style-assessment' | 'color-analysis' | 'body-type' | 'occasion-styling';
  findings: {
    currentStyle: string;
    bodyType: string;
    colorPalette: string[];
    recommendedStyles: string[];
    wardrobeGaps: string[];
  };
  recommendations: Array<{
    productId: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  followUpScheduled?: Date;
  status: 'scheduled' | 'completed' | 'follow-up-needed';
  createdAt: Date;
}

// Alteration request
export interface AlterationRequest {
  id: number;
  customerId: number;
  productId?: number;
  appointmentId: number;
  alterationType: 'hemming' | 'taking-in' | 'letting-out' | 'shortening' | 'lengthening' | 'repair';
  description: string;
  measurements: Record<string, number>;
  urgency: 'standard' | 'rush' | 'same-day';
  estimatedPrice: number;
  estimatedCompletion: Date;
  status: 'quoted' | 'approved' | 'in-progress' | 'completed' | 'picked-up';
  notes?: string;
  createdAt: Date;
}

// Retail analytics
export interface RetailAnalytics {
  date: string;
  totalAppointments: number;
  totalSales: number;
  averageOrderValue: number;
  conversionRate: number;
  appointmentsByType: {
    personalShopping: number;
    styling: number;
    consultation: number;
    fitting: number;
    alteration: number;
  };
  topPerformers: Array<{
    shopperId: number;
    name: string;
    appointments: number;
    sales: number;
    rating: number;
  }>;
  popularProducts: Array<{
    productId: number;
    name: string;
    brand: string;
    unitsSold: number;
    revenue: number;
  }>;
  customerSegments: {
    new: number;
    returning: number;
    vip: number;
  };
  seasonalTrends: Array<{
    category: string;
    sales: number;
    growth: number;
  }>;
}

// Form validation schemas
export const retailAppointmentFormSchema = z.object({
  serviceId: z.coerce.number(),
  startTime: z.string(),
  endTime: z.string(),
  appointmentType: z.enum(['personal-shopping', 'styling', 'consultation', 'fitting', 'custom-order', 'alteration']),
  contactPhone: z.string().min(10, "Valid phone number required"),
  preferredProducts: z.array(z.string()).default([]),
  budget: z.object({
    min: z.coerce.number().min(0),
    max: z.coerce.number().min(0),
  }).optional(),
  occasion: z.string().optional(),
  stylePreferences: z.array(z.string()).default([]),
  measurements: z.record(z.coerce.number()).default({}),
  specialRequests: z.string().optional(),
  preferredShopper: z.coerce.number().optional(),
  priority: z.enum(['standard', 'vip', 'urgent']).default('standard'),
});

export const personalShopperFormSchema = z.object({
  name: z.string().min(1, "Shopper name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  role: z.enum(['personal-shopper', 'stylist', 'consultant', 'fitter', 'designer']),
  specializations: z.array(z.string()).min(1, "At least one specialization required"),
  languages: z.array(z.string()).min(1, "At least one language required"),
  experience: z.coerce.number().min(0, "Experience cannot be negative"),
  certifications: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive', 'on_leave']).default('active'),
  maxAppointmentsPerDay: z.coerce.number().min(1, "Must handle at least 1 appointment").max(15, "Maximum 15 appointments per day"),
  commission: z.coerce.number().min(0, "Commission cannot be negative").max(100, "Commission cannot exceed 100%"),
});

export const retailProductFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  brand: z.string().min(1, "Brand is required"),
  category: z.enum(['clothing', 'accessories', 'shoes', 'jewelry', 'bags', 'cosmetics']),
  subcategory: z.string().min(1, "Subcategory is required"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  salePrice: z.coerce.number().min(0).optional(),
  sku: z.string().min(1, "SKU is required"),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  materials: z.array(z.string()).default([]),
  season: z.enum(['spring', 'summer', 'fall', 'winter', 'all-season']).default('all-season'),
  gender: z.enum(['men', 'women', 'unisex', 'kids']),
  description: z.string().min(1, "Description is required"),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

export const retailCustomerFormSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']).optional(),
  measurements: z.record(z.coerce.number()).default({}),
  styleProfile: z.object({
    preferredStyles: z.array(z.string()).default([]),
    preferredColors: z.array(z.string()).default([]),
    preferredBrands: z.array(z.string()).default([]),
    budgetRange: z.object({
      min: z.coerce.number().min(0),
      max: z.coerce.number().min(0),
    }),
    sizes: z.record(z.string()).default({}),
  }),
  loyaltyTier: z.enum(['standard', 'silver', 'gold', 'platinum']).default('standard'),
  notes: z.string().optional(),
});

export const alterationRequestFormSchema = z.object({
  productId: z.coerce.number().optional(),
  alterationType: z.enum(['hemming', 'taking-in', 'letting-out', 'shortening', 'lengthening', 'repair']),
  description: z.string().min(1, "Description is required"),
  measurements: z.record(z.coerce.number()),
  urgency: z.enum(['standard', 'rush', 'same-day']).default('standard'),
  estimatedPrice: z.coerce.number().min(0, "Price cannot be negative"),
  estimatedCompletion: z.string(),
  notes: z.string().optional(),
});

// Export form types
export type RetailAppointmentFormData = z.infer<typeof retailAppointmentFormSchema>;
export type PersonalShopperFormData = z.infer<typeof personalShopperFormSchema>;
export type RetailProductFormData = z.infer<typeof retailProductFormSchema>;
export type RetailCustomerFormData = z.infer<typeof retailCustomerFormSchema>;
export type AlterationRequestFormData = z.infer<typeof alterationRequestFormSchema>;