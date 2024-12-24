import { z } from "zod";

// Form Schemas
export const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  category: z.string().min(1, "Category is required"),
  isActive: z.boolean().default(true),
});

export const staffFormSchema = z.object({
  name: z.string().min(1, "Staff name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  specialization: z.string().min(1, "Specialization is required"),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
});

export interface SalonService {
  id: number;
  name: string;
  description?: string;
  duration: number;
  price: string;
  category: string;
  isActive: boolean;
}

export interface SalonStaff {
  id: number;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  status: "active" | "inactive" | "on_leave";
}

export interface ShiftTemplate {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  type: string;
}

export interface StaffSkill {
  id: number;
  staffId: number;
  serviceId: number;
  proficiencyLevel: "trainee" | "junior" | "senior" | "expert";
  createdAt: string;
}

export interface StaffSkillResponse {
  staff_skills: StaffSkill;
  salon_staff: SalonStaff;
}

export interface RosterShift {
  id: number;
  staffId: number;
  templateId: number;
  date: string;
  status: "scheduled" | "working" | "completed" | "leave" | "sick" | "absent";
}
