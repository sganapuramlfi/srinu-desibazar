// Client-side types without drizzle-orm imports
import { z } from "zod";

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "business" | "customer";
  createdAt?: Date | null;
}

// Business types
export interface Business {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  industryType: "salon" | "restaurant" | "event" | "realestate" | "retail" | "professional";
  status: "pending" | "active" | "suspended";
  logo?: string | null;
  gallery: any[];
  socialMedia: any;
  contactInfo: any;
  operatingHours: any;
  amenities: any[];
  onboardingCompleted: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface InsertBusiness {
  userId: number;
  name: string;
  description?: string;
  industryType: "salon" | "restaurant" | "event" | "realestate" | "retail" | "professional";
  status?: "pending" | "active" | "suspended";
  logo?: string;
  gallery?: any[];
  socialMedia?: any;
  contactInfo?: any;
  operatingHours?: any;
  amenities?: any[];
  onboardingCompleted?: boolean;
}

// Service types
export interface SalonService {
  id: number;
  businessId: number;
  name: string;
  description?: string | null;
  duration: number;
  price: string;
  category?: string | null;
  isActive: boolean;
  maxParticipants: number;
  settings: any;
  createdAt?: Date | null;
}

// Staff types
export interface SalonStaff {
  id: number;
  businessId: number;
  userId?: number | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  workSchedule: any;
  skillLevel: number;
  isActive: boolean;
  profileImage?: string | null;
  bio?: string | null;
  experience?: string | null;
  specializations: any[];
  commission?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt?: Date | null;
}

// Service Slot types
export interface ServiceSlot {
  id: number;
  businessId: number;
  serviceId: number;
  staffId?: number | null;
  date: Date;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  maxBookings: number;
  currentBookings: number;
  settings: any;
  createdAt?: Date | null;
}

// Schemas
export const businessProfileSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  description: z.string().optional(),
  industryType: z.enum(["salon", "restaurant", "event", "realestate", "retail", "professional"]),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    website: z.string().url().optional(),
  }).optional(),
  operatingHours: z.record(z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean().optional(),
  })).optional(),
  amenities: z.array(z.string()).optional(),
});

export const breakTimeSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  description: z.string().optional(),
});

export const shiftTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  startTime: z.string(),
  endTime: z.string(),
  breakTimes: z.array(breakTimeSchema).default([]),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1, "Select at least one day"),
  isDefault: z.boolean().default(false),
});