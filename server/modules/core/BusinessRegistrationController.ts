import { db } from "../../db/index.js";
import { users, businessTenants } from "../../db/index.js";
import { eq } from "drizzle-orm";

export class BusinessRegistrationController {
  async getAvailableIndustries() {
    return [
      { id: "salon", name: "Salon & Spa", modules: ["salon"] },
      { id: "restaurant", name: "Restaurant & Cafés", modules: ["restaurant"] },
      { id: "event", name: "Event Management", modules: ["event"] },
      { id: "realestate", name: "Real Estate", modules: ["realestate"] },
      { id: "retail", name: "Retail Stores", modules: ["retail"] },
      { id: "professional", name: "Professional Services", modules: ["professional"] }
    ];
  }

  async getOnboardingSteps(industry: string) {
    const baseSteps = [
      { id: 1, title: "Business Details", description: "Basic business information" },
      { id: 2, title: "Location Setup", description: "Address and location details" },
      { id: 3, title: "Subscription", description: "Choose your plan" },
      { id: 4, title: "Module Selection", description: "Select business modules" }
    ];
    
    return baseSteps;
  }

  async validateBusinessRegistration(data: any) {
    console.log('🔍 [DEBUG] Validating registration data:', JSON.stringify(data, null, 2));
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredFields = ["name", "industryType", "address", "phone", "email"];
    const validIndustries = ["salon", "restaurant", "event", "realestate", "retail", "professional"];
    
    // Check required fields
    for (const field of requiredFields) {
      const fieldValue = data[field];
      const isEmpty = !fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '');
      console.log(`🔍 [DEBUG] Field ${field}: value="${fieldValue}", isEmpty=${isEmpty}`);
      
      if (isEmpty) {
        errors.push(`${field} is required`);
      }
    }
    
    // Validate business name length
    if (data.name && data.name.trim().length < 2) {
      errors.push("Business name must be at least 2 characters");
    }
    
    // Validate industry type
    console.log(`🔍 [DEBUG] Industry validation: "${data.industryType}" in [${validIndustries.join(', ')}] = ${validIndustries.includes(data.industryType)}`);
    
    if (data.industryType && !validIndustries.includes(data.industryType)) {
      errors.push("Invalid industry selection");
    }
    
    // Validate email format
    if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
      errors.push("Invalid email format");
    }
    
    // Validate phone
    if (data.phone && data.phone.length < 10) {
      errors.push("Phone number must be at least 10 digits");
    }
    
    // Validate modules selection
    if (!data.selectedModules || !Array.isArray(data.selectedModules) || data.selectedModules.length === 0) {
      errors.push("At least one module must be selected");
    }
    
    const result = {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiredFields: requiredFields.filter(field => !data[field] || (typeof data[field] === 'string' && data[field].trim() === ''))
    };
    
    console.log('🔍 [DEBUG] Validation result:', JSON.stringify(result, null, 2));
    return result;
  }

  async createBusinessProfile(data: any) {
    try {
      // For now, create a simple business profile
      // In a real implementation, this would create user and business records
      
      const businessId = Math.floor(Math.random() * 10000) + 1000;
      
      return {
        success: true,
        businessId,
        moduleConfig: {
          enabledModules: data.selectedModules || [],
          subscriptionTier: data.subscriptionTier || "free"
        },
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        businessId: null,
        moduleConfig: null,
        errors: [error instanceof Error ? error.message : "Registration failed"]
      };
    }
  }
}