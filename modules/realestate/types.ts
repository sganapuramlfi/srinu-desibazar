import { z } from "zod";
import { BaseService, BaseBooking, Resource } from '../core/types.js';
import { BookingRequest } from '../shared/booking-core/types.js';

// Real Estate property (extends Resource)
export interface Property extends Resource {
  type: 'property';
  propertyType: 'house' | 'apartment' | 'condo' | 'townhouse' | 'commercial' | 'land';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  details: {
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    lotSize?: number;
    yearBuilt?: number;
    parking?: number;
  };
  price: {
    amount: number;
    type: 'sale' | 'rent';
    rentPeriod?: 'monthly' | 'weekly' | 'daily';
  };
  features: string[]; // ['pool', 'garage', 'fireplace', 'hardwood-floors']
  images: string[];
  status: 'available' | 'pending' | 'sold' | 'rented' | 'off-market';
  isActive: boolean;
  listingAgent?: number; // staff ID
}

// Property viewing (extends BaseBooking)
export interface PropertyViewing extends BaseBooking {
  propertyId: number;
  viewingType: 'individual' | 'open-house' | 'virtual' | 'self-guided';
  attendeeCount: number;
  contactPhone: string;
  prequalified?: boolean;
  financingType?: 'cash' | 'mortgage' | 'other';
  specialRequests?: string;
  agentId?: number;
  reminderSent?: boolean;
}

// Real estate service (extends BaseService)
export interface RealEstateService extends BaseService {
  category: 'property-viewing' | 'consultation' | 'appraisal' | 'inspection' | 'open-house';
  requiresProperty: boolean;
  duration: number; // minutes
  maxAttendees: number;
  allowsVirtualViewing: boolean;
  requiresPrequalification?: boolean;
}

// Real estate agent/staff
export interface RealEstateAgent extends Resource {
  type: 'agent';
  email: string;
  phone?: string;
  licenseNumber: string;
  specializations: string[]; // ['residential', 'commercial', 'luxury', 'investment']
  languages: string[];
  experience: number; // years
  rating: number;
  totalSales: number;
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
  territories: string[]; // ZIP codes or areas they cover
}

// Real estate booking request
export interface RealEstateBookingRequest extends BookingRequest {
  propertyId: number;
  viewingType: 'individual' | 'open-house' | 'virtual' | 'self-guided';
  attendeeCount: number;
  contactPhone: string;
  prequalified?: boolean;
  financingType?: 'cash' | 'mortgage' | 'other';
  specialRequests?: string;
  preferredAgent?: number;
}

// Lead management
export interface RealEstateLead {
  id: number;
  businessId: number;
  customerName: string;
  email: string;
  phone: string;
  interestedPropertyTypes: string[];
  priceRange: {
    min: number;
    max: number;
  };
  preferredLocations: string[];
  timeline: 'immediate' | '1-3-months' | '3-6-months' | '6-months-plus';
  prequalified: boolean;
  source: 'website' | 'referral' | 'social' | 'advertising' | 'walk-in';
  assignedAgent?: number;
  status: 'new' | 'contacted' | 'qualified' | 'viewing' | 'offer' | 'closed' | 'lost';
  notes: string;
  createdAt: Date;
  lastContactAt?: Date;
}

// Property market analysis
export interface MarketAnalysis {
  propertyId: number;
  analysisDate: Date;
  comparableProperties: Array<{
    propertyId: number;
    address: string;
    price: number;
    similarity: number; // 0-1 score
    soldDate?: Date;
  }>;
  marketValue: {
    estimated: number;
    range: {
      low: number;
      high: number;
    };
    confidence: number; // 0-1 score
  };
  marketTrends: {
    priceChange30Days: number;
    priceChange90Days: number;
    averageDaysOnMarket: number;
    marketActivity: 'hot' | 'warm' | 'cool' | 'cold';
  };
}

// Real estate analytics
export interface RealEstateAnalytics {
  date: string;
  totalViewings: number;
  uniqueVisitors: number;
  conversionRate: number;
  averageViewingDuration: number;
  propertiesViewed: number;
  leadsGenerated: number;
  viewingsByType: {
    individual: number;
    openHouse: number;
    virtual: number;
    selfGuided: number;
  };
  topPerformingProperties: Array<{
    propertyId: number;
    address: string;
    viewings: number;
    leads: number;
  }>;
  agentPerformance: Array<{
    agentId: number;
    name: string;
    viewingsScheduled: number;
    showRate: number;
    leadsGenerated: number;
  }>;
}

// Form validation schemas
export const propertyFormSchema = z.object({
  propertyType: z.enum(['house', 'apartment', 'condo', 'townhouse', 'commercial', 'land']),
  address: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(5, "Valid ZIP code required"),
    country: z.string().default('US'),
  }),
  details: z.object({
    bedrooms: z.coerce.number().min(0).optional(),
    bathrooms: z.coerce.number().min(0).optional(),
    squareFeet: z.coerce.number().min(1).optional(),
    lotSize: z.coerce.number().min(0).optional(),
    yearBuilt: z.coerce.number().min(1800).max(new Date().getFullYear()).optional(),
    parking: z.coerce.number().min(0).optional(),
  }),
  price: z.object({
    amount: z.coerce.number().min(0, "Price must be positive"),
    type: z.enum(['sale', 'rent']),
    rentPeriod: z.enum(['monthly', 'weekly', 'daily']).optional(),
  }),
  features: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  status: z.enum(['available', 'pending', 'sold', 'rented', 'off-market']).default('available'),
  isActive: z.boolean().default(true),
  listingAgent: z.coerce.number().optional(),
});

export const propertyViewingFormSchema = z.object({
  serviceId: z.coerce.number(),
  propertyId: z.coerce.number(),
  startTime: z.string(),
  endTime: z.string(),
  viewingType: z.enum(['individual', 'open-house', 'virtual', 'self-guided']),
  attendeeCount: z.coerce.number().min(1, "At least 1 attendee required").max(10, "Maximum 10 attendees"),
  contactPhone: z.string().min(10, "Valid phone number required"),
  prequalified: z.boolean().default(false),
  financingType: z.enum(['cash', 'mortgage', 'other']).optional(),
  specialRequests: z.string().optional(),
  preferredAgent: z.coerce.number().optional(),
});

export const realEstateAgentFormSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  licenseNumber: z.string().min(1, "License number is required"),
  specializations: z.array(z.string()).min(1, "At least one specialization required"),
  languages: z.array(z.string()).min(1, "At least one language required"),
  experience: z.coerce.number().min(0, "Experience cannot be negative"),
  status: z.enum(['active', 'inactive', 'on_leave']).default('active'),
  territories: z.array(z.string()).min(1, "At least one territory required"),
});

export const realEstateLeadFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  interestedPropertyTypes: z.array(z.string()).min(1, "At least one property type required"),
  priceRange: z.object({
    min: z.coerce.number().min(0, "Minimum price cannot be negative"),
    max: z.coerce.number().min(0, "Maximum price cannot be negative"),
  }),
  preferredLocations: z.array(z.string()).min(1, "At least one preferred location required"),
  timeline: z.enum(['immediate', '1-3-months', '3-6-months', '6-months-plus']),
  prequalified: z.boolean().default(false),
  source: z.enum(['website', 'referral', 'social', 'advertising', 'walk-in']),
  assignedAgent: z.coerce.number().optional(),
  notes: z.string().optional(),
});

// Export form types
export type PropertyFormData = z.infer<typeof propertyFormSchema>;
export type PropertyViewingFormData = z.infer<typeof propertyViewingFormSchema>;
export type RealEstateAgentFormData = z.infer<typeof realEstateAgentFormSchema>;
export type RealEstateLeadFormData = z.infer<typeof realEstateLeadFormSchema>;