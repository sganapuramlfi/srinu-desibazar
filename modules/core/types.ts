// Core module system types
export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  industry: IndustryType;
  dependencies?: string[];
  features: string[];
}

export type IndustryType = 'salon' | 'restaurant' | 'event' | 'realestate' | 'retail' | 'professional';

export interface ModuleComponent {
  name: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

export interface ModuleRoute {
  path: string;
  component: React.ComponentType<any>;
  exact?: boolean;
  private?: boolean;
  roles?: string[];
}

export interface ModuleAPI {
  endpoints: ModuleEndpoint[];
  middleware?: any[];
}

export interface ModuleEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: Function;
  middleware?: any[];
  auth?: boolean;
}

export interface BaseModule {
  config: ModuleConfig;
  components?: ModuleComponent[];
  routes?: ModuleRoute[];
  api?: ModuleAPI;
  onInit?: () => Promise<void>;
  onDestroy?: () => Promise<void>;
}

// Shared booking types that all modules can extend
export interface BaseBooking {
  id: number;
  businessId: number;
  customerId: number;
  serviceId: number;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';

export interface BaseService {
  id: number;
  businessId: number;
  name: string;
  description?: string;
  duration: number; // in minutes
  price: number;
  category?: string;
  isActive: boolean;
  settings: Record<string, any>;
}

export interface BaseBusiness {
  id: number;
  userId: number;
  name: string;
  description?: string;
  industryType: IndustryType;
  status: 'pending' | 'active' | 'suspended';
  contactInfo: Record<string, any>;
  operatingHours: Record<string, any>;
  settings: Record<string, any>;
}