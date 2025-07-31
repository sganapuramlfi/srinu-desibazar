import { z } from "zod";
import { BaseService, BaseBooking, Resource } from '../core/types.js';
import { BookingRequest } from '../shared/booking-core/types.js';

// Salon-specific service extension
export interface SalonService extends BaseService {
  category: 'haircut' | 'coloring' | 'styling' | 'treatment' | 'nails' | 'facial' | 'massage' | 'other';
  requiresStaff: boolean;
  preferredStaffGender?: 'male' | 'female' | 'any';
  skillLevel: 'trainee' | 'junior' | 'senior' | 'expert';
}

// Salon staff (extends Resource)
export interface SalonStaff extends Resource {
  type: 'staff';
  email: string;
  phone?: string;
  specializations: string[];
  skillLevel: 'trainee' | 'junior' | 'senior' | 'expert';
  gender: 'male' | 'female' | 'other';
  hireDate: Date;
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

// Salon booking (extends BaseBooking)
export interface SalonBooking extends BaseBooking {
  staffId: number;
  clientGender?: 'male' | 'female' | 'other';
  specialRequests?: string;
  serviceHistory?: number[]; // Previous service IDs
  loyaltyPoints?: number;
  deposit?: {
    amount: number;
    paid: boolean;
    paidAt?: Date;
  };
}

// Staff skills and proficiency
export interface StaffSkill {
  id: number;
  staffId: number;
  serviceId: number;
  proficiencyLevel: 'trainee' | 'junior' | 'senior' | 'expert';
  certifiedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

// Roster and scheduling
export interface ShiftTemplate {
  id: number;
  name: string;
  businessId: number;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  type: 'morning' | 'afternoon' | 'evening' | 'full_day' | 'split';
  breakDuration: number; // minutes
  isActive: boolean;
}

export interface RosterShift {
  id: number;
  staffId: number;
  templateId: number;
  date: string; // YYYY-MM-DD
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: 'scheduled' | 'working' | 'completed' | 'leave' | 'sick' | 'absent';
  notes?: string;
}

// Client management
export interface SalonClient {
  id: number;
  userId: number;
  businessId: number;
  preferences: {
    preferredStaff?: number[];
    preferredServices?: number[];
    allergies?: string[];
    skinType?: string;
    hairType?: string;
  };
  visitHistory: {
    totalVisits: number;
    lastVisit?: Date;
    favoriteServices: number[];
    totalSpent: number;
  };
  loyaltyStatus: {
    points: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    joinedAt: Date;
  };
}

// Salon-specific booking request
export interface SalonBookingRequest extends BookingRequest {
  staffId?: number; // Preferred staff
  staffGender?: 'male' | 'female' | 'any';
  clientGender?: 'male' | 'female' | 'other';
  specialRequests?: string;
  isWalkIn?: boolean;
}

// Form validation schemas
export const salonServiceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  duration: z.coerce.number().min(15, "Duration must be at least 15 minutes"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  category: z.enum(['haircut', 'coloring', 'styling', 'treatment', 'nails', 'facial', 'massage', 'other']),
  requiresStaff: z.boolean().default(true),
  preferredStaffGender: z.enum(['male', 'female', 'any']).optional(),
  skillLevel: z.enum(['trainee', 'junior', 'senior', 'expert']).default('junior'),
  isActive: z.boolean().default(true),
});

export const salonStaffFormSchema = z.object({
  name: z.string().min(1, "Staff name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  specializations: z.array(z.string()).min(1, "At least one specialization is required"),
  skillLevel: z.enum(['trainee', 'junior', 'senior', 'expert']).default('junior'),
  gender: z.enum(['male', 'female', 'other']),
  status: z.enum(['active', 'inactive', 'on_leave']).default('active'),
});

export const shiftTemplateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  type: z.enum(['morning', 'afternoon', 'evening', 'full_day', 'split']),
  breakDuration: z.coerce.number().min(0, "Break duration cannot be negative"),
});

// Export form types
export type SalonServiceFormData = z.infer<typeof salonServiceFormSchema>;
export type SalonStaffFormData = z.infer<typeof salonStaffFormSchema>;
export type ShiftTemplateFormData = z.infer<typeof shiftTemplateFormSchema>;