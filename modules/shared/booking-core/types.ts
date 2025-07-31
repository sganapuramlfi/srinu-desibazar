import { BaseBooking, BaseService, BookingStatus } from '../../core/types.js';

// Extended booking types with shared functionality
export interface BookingRequest {
  serviceId: number;
  startTime: string;
  endTime: string;
  notes?: string;
  customData?: Record<string, any>;
}

export interface BookingSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
  price?: number;
  staffId?: number;
  resourceId?: number;
}

export interface AvailabilityQuery {
  businessId: number;
  serviceId?: number;
  staffId?: number;
  date: string;
  duration?: number;
}

export interface BookingRules {
  advanceBookingHours: number;
  maxAdvanceBookingDays: number;
  cancellationHours: number;
  bufferMinutes: number;
  allowDoubleBooking: boolean;
  requireDeposit: boolean;
  depositAmount?: number;
}

export interface BookingValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Time slot management
export interface TimeSlot {
  id: string;
  startTime: string; // HH:MM format
  endTime: string;
  dayOfWeek: number; // 0-6, Sunday = 0
  capacity: number;
  isActive: boolean;
}

export interface WorkingHours {
  [key: string]: { // day of week
    isOpen: boolean;
    openTime: string;
    closeTime: string;
    breaks?: Array<{
      startTime: string;
      endTime: string;
    }>;
  };
}

// Resource management (staff, tables, rooms, etc.)
export interface Resource {
  id: number;
  businessId: number;
  name: string;
  type: ResourceType;
  capacity: number;
  isActive: boolean;
  settings: Record<string, any>;
}

export type ResourceType = 'staff' | 'room' | 'table' | 'equipment' | 'vehicle' | 'other';

// Booking analytics
export interface BookingStats {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  revenue: number;
  averageBookingValue: number;
  occupancyRate: number;
  popularServices: Array<{
    serviceId: number;
    serviceName: string;
    bookingCount: number;
  }>;
}