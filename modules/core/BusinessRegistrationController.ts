import { ModuleRegistry } from './ModuleRegistry.js';
import { IndustryType } from './types.js';

export class BusinessRegistrationController {
  private moduleRegistry: ModuleRegistry;

  constructor() {
    this.moduleRegistry = ModuleRegistry.getInstance();
  }

  // Get available industry options based on enabled modules
  async getAvailableIndustries(): Promise<Array<{
    id: IndustryType;
    name: string;
    description: string;
    features: string[];
    isAvailable: boolean;
    comingSoon?: boolean;
  }>> {
    const enabledModules = this.moduleRegistry.getEnabledModules();
    const allModules = this.moduleRegistry.getAllModules();

    const industries = [
      {
        id: 'salon' as IndustryType,
        name: 'Salon & Spa',
        description: 'Hair salons, beauty spas, nail salons, and wellness centers',
        icon: '💅',
        examples: ['Hair Salon', 'Day Spa', 'Nail Salon', 'Massage Therapy']
      },
      {
        id: 'restaurant' as IndustryType,
        name: 'Restaurant & Dining',
        description: 'Restaurants, cafes, bars, and food service establishments',
        icon: '🍽️',
        examples: ['Restaurant', 'Cafe', 'Bar', 'Catering']
      },
      {
        id: 'realestate' as IndustryType,
        name: 'Real Estate',
        description: 'Real estate agencies, property management, and brokerages',
        icon: '🏠',
        examples: ['Real Estate Agency', 'Property Management', 'Brokerage']
      },
      {
        id: 'eventmanagement' as IndustryType,
        name: 'Event Management',
        description: 'Event planning, venue management, and coordination services',
        icon: '🎉',
        examples: ['Event Planner', 'Wedding Coordinator', 'Venue Management']
      },
      {
        id: 'retail' as IndustryType,
        name: 'Retail & Shopping',
        description: 'Retail stores, personal shopping, and fashion consultancy',
        icon: '🛍️',
        examples: ['Boutique', 'Personal Shopper', 'Fashion Consultant']
      },
      {
        id: 'professionalservices' as IndustryType,
        name: 'Professional Services',
        description: 'Legal, financial, consulting, and professional advisory services',
        icon: '⚖️',
        examples: ['Law Firm', 'Accounting', 'Business Consulting', 'Financial Advisory']
      }
    ];

    return industries.map(industry => {
      const module = allModules.find(m => m.config.industry === industry.id);
      const isEnabled = enabledModules.some(m => m.config.industry === industry.id);
      
      return {
        ...industry,
        features: module?.config.features || [],
        isAvailable: isEnabled,
        comingSoon: !isEnabled
      };
    });
  }

  // Validate business registration based on selected industry
  async validateBusinessRegistration(registrationData: {
    businessName: string;
    industry: IndustryType;
    email: string;
    phone: string;
    address?: any;
    additionalInfo?: Record<string, any>;
  }): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    requiredFields: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredFields: string[] = [];

    // Check if industry module is enabled
    const availableIndustries = await this.getAvailableIndustries();
    const selectedIndustry = availableIndustries.find(i => i.id === registrationData.industry);

    if (!selectedIndustry) {
      errors.push('Invalid industry selection');
    } else if (!selectedIndustry.isAvailable) {
      errors.push(`${selectedIndustry.name} module is currently not available. Please contact support.`);
    }

    // Basic validation
    if (!registrationData.businessName || registrationData.businessName.length < 2) {
      errors.push('Business name is required and must be at least 2 characters');
      requiredFields.push('businessName');
    }

    if (!registrationData.email || !this.isValidEmail(registrationData.email)) {
      errors.push('Valid email address is required');
      requiredFields.push('email');
    }

    if (!registrationData.phone || registrationData.phone.length < 10) {
      errors.push('Valid phone number is required');
      requiredFields.push('phone');
    }

    // Industry-specific validation
    if (selectedIndustry?.isAvailable) {
      const industryValidation = this.validateIndustrySpecificFields(registrationData);
      errors.push(...industryValidation.errors);
      warnings.push(...industryValidation.warnings);
      requiredFields.push(...industryValidation.requiredFields);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiredFields
    };
  }

  // Industry-specific field validation
  private validateIndustrySpecificFields(registrationData: any): {
    errors: string[];
    warnings: string[];
    requiredFields: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredFields: string[] = [];

    switch (registrationData.industry) {
      case 'salon':
        if (!registrationData.additionalInfo?.serviceTypes?.length) {
          warnings.push('Consider specifying your service types (hair, nails, spa, etc.)');
        }
        if (!registrationData.additionalInfo?.staffCount) {
          warnings.push('Staff count helps us customize your experience');
        }
        break;

      case 'restaurant':
        if (!registrationData.additionalInfo?.cuisineType) {
          warnings.push('Cuisine type helps customers find you better');
        }
        if (!registrationData.additionalInfo?.seatingCapacity) {
          warnings.push('Seating capacity helps with table management setup');
        }
        break;

      case 'realestate':
        if (!registrationData.additionalInfo?.licenseNumber) {
          errors.push('Real estate license number is required');
          requiredFields.push('licenseNumber');
        }
        if (!registrationData.additionalInfo?.serviceAreas?.length) {
          warnings.push('Service areas help potential clients find you');
        }
        break;

      case 'eventmanagement':
        if (!registrationData.additionalInfo?.eventTypes?.length) {
          warnings.push('Specify event types you handle (weddings, corporate, etc.)');
        }
        if (!registrationData.additionalInfo?.maxGuestCapacity) {
          warnings.push('Maximum guest capacity helps with venue planning');
        }
        break;

      case 'retail':
        if (!registrationData.additionalInfo?.productCategories?.length) {
          warnings.push('Product categories help customers understand your offerings');
        }
        break;

      case 'professionalservices':
        if (!registrationData.additionalInfo?.professionalLicense) {
          warnings.push('Professional license/certification adds credibility');
        }
        if (!registrationData.additionalInfo?.practiceAreas?.length) {
          warnings.push('Practice areas help clients find relevant services');
        }
        break;
    }

    return { errors, warnings, requiredFields };
  }

  // Get industry-specific onboarding steps
  async getOnboardingSteps(industry: IndustryType): Promise<Array<{
    step: number;
    title: string;
    description: string;
    fields: Array<{
      name: string;
      type: 'text' | 'email' | 'phone' | 'select' | 'multiselect' | 'textarea' | 'number';
      label: string;
      required: boolean;
      options?: string[];
      placeholder?: string;
    }>;
    estimatedTime: string;
  }>> {
    const baseSteps = [
      {
        step: 1,
        title: 'Business Information',
        description: 'Tell us about your business',
        fields: [
          { name: 'businessName', type: 'text' as const, label: 'Business Name', required: true, placeholder: 'Enter your business name' },
          { name: 'email', type: 'email' as const, label: 'Business Email', required: true, placeholder: 'business@example.com' },
          { name: 'phone', type: 'phone' as const, label: 'Business Phone', required: true, placeholder: '(555) 123-4567' }
        ],
        estimatedTime: '2 minutes'
      }
    ];

    const industrySpecificSteps = this.getIndustrySpecificSteps(industry);
    
    return [...baseSteps, ...industrySpecificSteps];
  }

  // Industry-specific onboarding steps
  private getIndustrySpecificSteps(industry: IndustryType): Array<any> {
    switch (industry) {
      case 'salon':
        return [
          {
            step: 2,
            title: 'Salon Details',
            description: 'Configure your salon services',
            fields: [
              {
                name: 'serviceTypes',
                type: 'multiselect',
                label: 'Service Types',
                required: false,
                options: ['Hair Services', 'Nail Services', 'Spa Services', 'Massage', 'Skincare', 'Makeup']
              },
              {
                name: 'staffCount',
                type: 'number',
                label: 'Number of Staff',
                required: false,
                placeholder: '5'
              }
            ],
            estimatedTime: '3 minutes'
          }
        ];

      case 'restaurant':
        return [
          {
            step: 2,
            title: 'Restaurant Details',
            description: 'Set up your restaurant information',
            fields: [
              {
                name: 'cuisineType',
                type: 'select',
                label: 'Cuisine Type',
                required: false,
                options: ['American', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'French', 'Other']
              },
              {
                name: 'seatingCapacity',
                type: 'number',
                label: 'Seating Capacity',
                required: false,
                placeholder: '50'
              }
            ],
            estimatedTime: '3 minutes'
          }
        ];

      case 'realestate':
        return [
          {
            step: 2,
            title: 'Real Estate License',
            description: 'Professional credentials and service areas',
            fields: [
              {
                name: 'licenseNumber',
                type: 'text',
                label: 'License Number',
                required: true,
                placeholder: 'Enter your real estate license number'
              },
              {
                name: 'serviceAreas',
                type: 'multiselect',
                label: 'Service Areas',
                required: false,
                options: ['Residential Sales', 'Commercial Sales', 'Property Management', 'Rentals', 'Investment Properties']
              }
            ],
            estimatedTime: '3 minutes'
          }
        ];

      case 'eventmanagement':
        return [
          {
            step: 2,
            title: 'Event Specialization',
            description: 'What types of events do you handle?',
            fields: [
              {
                name: 'eventTypes',
                type: 'multiselect',
                label: 'Event Types',
                required: false,
                options: ['Weddings', 'Corporate Events', 'Birthday Parties', 'Conferences', 'Trade Shows', 'Social Events']
              },
              {
                name: 'maxGuestCapacity',
                type: 'number',
                label: 'Maximum Guest Capacity',
                required: false,
                placeholder: '200'
              }
            ],
            estimatedTime: '3 minutes'
          }
        ];

      case 'retail':
        return [
          {
            step: 2,
            title: 'Store Information',
            description: 'Tell us about your retail business',
            fields: [
              {
                name: 'productCategories',
                type: 'multiselect',
                label: 'Product Categories',
                required: false,
                options: ['Clothing', 'Accessories', 'Shoes', 'Jewelry', 'Home Goods', 'Electronics', 'Other']
              },
              {
                name: 'storeType',
                type: 'select',
                label: 'Store Type',
                required: false,
                options: ['Physical Store', 'Online Only', 'Both Physical & Online']
              }
            ],
            estimatedTime: '3 minutes'
          }
        ];

      case 'professionalservices':
        return [
          {
            step: 2,
            title: 'Professional Credentials',
            description: 'Your professional background and services',
            fields: [
              {
                name: 'professionalLicense',
                type: 'text',
                label: 'Professional License/Certification',
                required: false,
                placeholder: 'Bar number, CPA license, etc.'
              },
              {
                name: 'practiceAreas',
                type: 'multiselect',
                label: 'Practice Areas',
                required: false,
                options: ['Legal Services', 'Accounting', 'Business Consulting', 'Financial Planning', 'Tax Services', 'HR Consulting']
              }
            ],
            estimatedTime: '4 minutes'
          }
        ];

      default:
        return [];
    }
  }

  // Create business profile with module-specific fields
  async createBusinessProfile(registrationData: any): Promise<{
    success: boolean;
    businessId?: number;
    moduleConfig?: any;
    errors?: string[];
  }> {
    try {
      // Validate registration
      const validation = await this.validateBusinessRegistration(registrationData);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Here would be the actual database insertion
      const businessId = Date.now(); // Mock ID generation

      // Get module-specific configuration
      const moduleConfig = await this.getModuleConfigurationForBusiness(registrationData.industry);

      // Initialize industry-specific data structures
      await this.initializeIndustrySpecificData(businessId, registrationData.industry, registrationData);

      return {
        success: true,
        businessId,
        moduleConfig
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Registration failed']
      };
    }
  }

  // Get module configuration for new business
  private async getModuleConfigurationForBusiness(industry: IndustryType): Promise<any> {
    const module = this.moduleRegistry.getEnabledModules().find(m => m.config.industry === industry);
    
    if (!module) {
      throw new Error(`Module for industry ${industry} is not available`);
    }

    return {
      moduleId: module.config.id,
      features: module.config.features,
      version: module.config.version,
      initialSettings: this.getInitialModuleSettings(industry)
    };
  }

  // Get initial settings for industry module
  private getInitialModuleSettings(industry: IndustryType): any {
    const defaultSettings = {
      salon: {
        bookingRules: { advanceBookingHours: 2, bufferMinutes: 15 },
        features: { walkInBookings: true, onlineBookings: true }
      },
      restaurant: {
        bookingRules: { advanceBookingHours: 1, bufferMinutes: 30 },
        features: { walkInBookings: true, onlineReservations: true }
      },
      realestate: {
        bookingRules: { advanceBookingHours: 24, bufferMinutes: 60 },
        features: { propertyViewings: true, agentSelection: true }
      },
      eventmanagement: {
        bookingRules: { advanceBookingHours: 168, bufferMinutes: 120 },
        features: { eventPlanning: true, venueBooking: true }
      },
      retail: {
        bookingRules: { advanceBookingHours: 1, bufferMinutes: 15 },
        features: { appointmentShopping: true, personalShopping: true }
      },
      professionalservices: {
        bookingRules: { advanceBookingHours: 4, bufferMinutes: 30 },
        features: { consultations: true, documentSharing: true }
      }
    };

    return defaultSettings[industry] || {};
  }

  // Initialize industry-specific data structures
  private async initializeIndustrySpecificData(businessId: number, industry: IndustryType, registrationData: any): Promise<void> {
    // This would create industry-specific database tables/records
    switch (industry) {
      case 'salon':
        // Initialize salon-specific tables (staff, services, etc.)
        break;
      case 'restaurant':
        // Initialize restaurant-specific tables (tables, menu, etc.)
        break;
      // ... other industries
    }
  }

  // Utility methods
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}