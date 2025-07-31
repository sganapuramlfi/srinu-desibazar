import { z } from "zod";
import { BaseService, BaseBooking, Resource } from '../core/types.js';
import { BookingRequest } from '../shared/booking-core/types.js';

// Professional consultation (extends BaseBooking)
export interface ProfessionalConsultation extends BaseBooking {
  consultationType: 'legal' | 'financial' | 'business' | 'tax' | 'hr' | 'marketing' | 'technical' | 'healthcare' | 'other';
  consultantId: number;
  clientId: number;
  contactPhone: string;
  consultationMode: 'in-person' | 'video-call' | 'phone-call' | 'hybrid';
  urgency: 'standard' | 'urgent' | 'emergency';
  caseBackground?: string;
  documents?: string[];
  specialRequests?: string;
  followUpRequired?: boolean;
  billingType: 'hourly' | 'flat-fee' | 'retainer' | 'pro-bono';
  estimatedHours?: number;
  retainer?: {
    amount: number;
    required: boolean;
    paid: boolean;
    paidAt?: Date;
  };
}

// Professional service (extends BaseService)
export interface ProfessionalService extends BaseService {
  category: 'consultation' | 'document-review' | 'representation' | 'advisory' | 'audit' | 'assessment';
  serviceType: 'legal' | 'financial' | 'business' | 'tax' | 'hr' | 'marketing' | 'technical' | 'healthcare' | 'other';
  duration: number; // minutes
  billingRate: number; // per hour
  requiresRetainer: boolean;
  retainerAmount?: number;
  canBeRemote: boolean;
  requiresDocuments?: boolean;
  followUpIncluded: boolean;
  certificationRequired?: string[];
  expertise: string[]; // ['corporate-law', 'tax-planning', 'startup-advisory']
}

// Professional consultant
export interface ProfessionalConsultant extends Resource {
  type: 'consultant';
  email: string;
  phone?: string;
  profession: 'lawyer' | 'accountant' | 'business-advisor' | 'hr-specialist' | 'marketing-expert' | 'it-consultant' | 'doctor' | 'other';
  specializations: string[];
  education: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    expiry?: Date;
  }>;
  experience: number; // years
  rating: number;
  totalConsultations: number;
  languages: string[];
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
  hourlyRate: number;
  availableForEmergency: boolean;
  maxConsultationsPerDay: number;
  bio?: string;
  linkedinProfile?: string;
}

// Professional booking request
export interface ProfessionalBookingRequest extends BookingRequest {
  consultationType: 'legal' | 'financial' | 'business' | 'tax' | 'hr' | 'marketing' | 'technical' | 'healthcare' | 'other';
  contactPhone: string;
  consultationMode: 'in-person' | 'video-call' | 'phone-call' | 'hybrid';
  urgency?: 'standard' | 'urgent' | 'emergency';
  caseBackground?: string;
  documents?: string[];
  specialRequests?: string;
  followUpRequired?: boolean;
  preferredConsultant?: number;
  billingType?: 'hourly' | 'flat-fee' | 'retainer' | 'pro-bono';
  estimatedHours?: number;
}

// Client profile
export interface ProfessionalClient {
  id: number;
  businessId: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  clientType: 'individual' | 'small-business' | 'corporation' | 'non-profit';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  consultationHistory: Array<{
    date: Date;
    consultantId: number;
    type: string;
    duration: number;
    billedAmount: number;
    consultationId: number;
  }>;
  totalSpent: number;
  preferredConsultants: number[];
  communicationPreference: 'email' | 'phone' | 'text' | 'in-person';
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod?: 'credit-card' | 'bank-transfer' | 'check' | 'cash';
  notes?: string;
  createdAt: Date;
  lastConsultation?: Date;
}

// Consultation room/office
export interface ConsultationRoom extends Resource {
  type: 'consultation-room';
  roomNumber: string;
  capacity: number;
  amenities: string[]; // ['video-conference', 'whiteboard', 'projector', 'privacy', 'recording']
  isPrivate: boolean;
  hasVideoConference: boolean;
  isAccessible: boolean;
  hourlyRate?: number;
  isActive: boolean;
}

// Document template
export interface DocumentTemplate {
  id: number;
  businessId: number;
  name: string;
  category: 'contract' | 'agreement' | 'invoice' | 'proposal' | 'report' | 'letter' | 'form';
  profession: 'legal' | 'financial' | 'business' | 'tax' | 'hr' | 'marketing' | 'technical' | 'healthcare' | 'general';
  template: string; // Template content with placeholders
  placeholders: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'list';
    required: boolean;
    defaultValue?: any;
  }>;
  isActive: boolean;
  createdBy: number;
  version: string;
  lastModified: Date;
}

// Case/matter management
export interface ProfessionalCase {
  id: number;
  clientId: number;
  consultantId: number;
  businessId: number;
  caseNumber: string;
  title: string;
  description: string;
  caseType: string;
  status: 'open' | 'in-progress' | 'pending' | 'closed' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  openedDate: Date;
  closedDate?: Date;
  estimatedHours: number;
  actualHours: number;
  billedHours: number;
  hourlyRate: number;
  totalBilled: number;
  consultations: number[];
  documents: Array<{
    name: string;
    type: string;
    uploadedAt: Date;
    uploadedBy: number;
    url: string;
  }>;
  notes: Array<{
    content: string;
    createdAt: Date;
    createdBy: number;
    type: 'note' | 'task' | 'reminder';
  }>;
  nextAction?: {
    description: string;
    dueDate: Date;
    assignedTo: number;
  };
}

// Billing/invoice
export interface ProfessionalInvoice {
  id: number;
  clientId: number;
  consultantId: number;
  businessId: number;
  caseId?: number;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  lineItems: Array<{
    description: string;
    hours?: number;
    rate?: number;
    amount: number;
    date: Date;
  }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  paidDate?: Date;
  paymentMethod?: string;
  notes?: string;
}

// Professional analytics
export interface ProfessionalAnalytics {
  date: string;
  totalConsultations: number;
  totalRevenue: number;
  averageConsultationLength: number;
  utilizationRate: number;
  consultationsByType: {
    legal: number;
    financial: number;
    business: number;
    tax: number;
    hr: number;
    marketing: number;
    technical: number;
    healthcare: number;
    other: number;
  };
  consultantPerformance: Array<{
    consultantId: number;
    name: string;
    consultations: number;
    hours: number;
    revenue: number;
    rating: number;
    utilization: number;
  }>;
  clientMetrics: {
    newClients: number;
    returningClients: number;
    totalActiveClients: number;
    averageClientValue: number;
  };
  revenueByService: Array<{
    serviceType: string;
    revenue: number;
    hours: number;
    consultations: number;
  }>;
  seasonalTrends: Array<{
    month: string;
    consultations: number;
    revenue: number;
    newClients: number;
  }>;
}

// Form validation schemas
export const professionalConsultationFormSchema = z.object({
  serviceId: z.coerce.number(),
  startTime: z.string(),
  endTime: z.string(),
  consultationType: z.enum(['legal', 'financial', 'business', 'tax', 'hr', 'marketing', 'technical', 'healthcare', 'other']),
  contactPhone: z.string().min(10, "Valid phone number required"),
  consultationMode: z.enum(['in-person', 'video-call', 'phone-call', 'hybrid']),
  urgency: z.enum(['standard', 'urgent', 'emergency']).default('standard'),
  caseBackground: z.string().optional(),
  documents: z.array(z.string()).default([]),
  specialRequests: z.string().optional(),
  followUpRequired: z.boolean().default(false),
  preferredConsultant: z.coerce.number().optional(),
  billingType: z.enum(['hourly', 'flat-fee', 'retainer', 'pro-bono']).default('hourly'),
  estimatedHours: z.coerce.number().min(0).optional(),
});

export const professionalConsultantFormSchema = z.object({
  name: z.string().min(1, "Consultant name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  profession: z.enum(['lawyer', 'accountant', 'business-advisor', 'hr-specialist', 'marketing-expert', 'it-consultant', 'doctor', 'other']),
  specializations: z.array(z.string()).min(1, "At least one specialization required"),
  education: z.array(z.object({
    degree: z.string().min(1, "Degree is required"),
    institution: z.string().min(1, "Institution is required"),
    year: z.coerce.number().min(1950, "Valid graduation year required"),
  })).min(1, "At least one education entry required"),
  certifications: z.array(z.object({
    name: z.string().min(1, "Certification name is required"),
    issuer: z.string().min(1, "Issuer is required"),
    expiry: z.string().optional(),
  })).default([]),
  experience: z.coerce.number().min(0, "Experience cannot be negative"),
  languages: z.array(z.string()).min(1, "At least one language required"),
  status: z.enum(['active', 'inactive', 'on_leave']).default('active'),
  hourlyRate: z.coerce.number().min(0, "Hourly rate cannot be negative"),
  availableForEmergency: z.boolean().default(false),
  maxConsultationsPerDay: z.coerce.number().min(1, "Must handle at least 1 consultation").max(20, "Maximum 20 consultations per day"),
  bio: z.string().optional(),
  linkedinProfile: z.string().url().optional(),
});

export const professionalClientFormSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  industry: z.string().optional(),
  clientType: z.enum(['individual', 'small-business', 'corporation', 'non-profit']),
  address: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(5, "Valid ZIP code required"),
    country: z.string().default('US'),
  }).optional(),
  preferredConsultants: z.array(z.coerce.number()).default([]),
  communicationPreference: z.enum(['email', 'phone', 'text', 'in-person']).default('email'),
  paymentMethod: z.enum(['credit-card', 'bank-transfer', 'check', 'cash']).optional(),
  notes: z.string().optional(),
});

export const documentTemplateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  category: z.enum(['contract', 'agreement', 'invoice', 'proposal', 'report', 'letter', 'form']),
  profession: z.enum(['legal', 'financial', 'business', 'tax', 'hr', 'marketing', 'technical', 'healthcare', 'general']),
  template: z.string().min(1, "Template content is required"),
  placeholders: z.array(z.object({
    key: z.string().min(1, "Placeholder key is required"),
    label: z.string().min(1, "Placeholder label is required"),
    type: z.enum(['text', 'number', 'date', 'boolean', 'list']),
    required: z.boolean().default(false),
    defaultValue: z.any().optional(),
  })).default([]),
  isActive: z.boolean().default(true),
  version: z.string().default('1.0'),
});

export const professionalCaseFormSchema = z.object({
  clientId: z.coerce.number(),
  consultantId: z.coerce.number(),
  title: z.string().min(1, "Case title is required"),
  description: z.string().min(1, "Case description is required"),
  caseType: z.string().min(1, "Case type is required"),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  estimatedHours: z.coerce.number().min(0, "Estimated hours cannot be negative"),
  hourlyRate: z.coerce.number().min(0, "Hourly rate cannot be negative"),
});

// Export form types
export type ProfessionalConsultationFormData = z.infer<typeof professionalConsultationFormSchema>;
export type ProfessionalConsultantFormData = z.infer<typeof professionalConsultantFormSchema>;
export type ProfessionalClientFormData = z.infer<typeof professionalClientFormSchema>;
export type DocumentTemplateFormData = z.infer<typeof documentTemplateFormSchema>;
export type ProfessionalCaseFormData = z.infer<typeof professionalCaseFormSchema>;