import { BookingService } from '../../shared/booking-core/BookingService.js';
import { RetailAppointment, RetailBookingRequest, PersonalShopper, RetailCustomer, RetailProduct, FittingRoom } from '../types.js';
import { BookingValidation, BookingSlot, BookingRules } from '../../shared/booking-core/types.js';

export class RetailBookingService extends BookingService {
  
  constructor(businessId: number) {
    // Retail-specific booking rules
    const retailRules: BookingRules = {
      advanceBookingHours: 2,
      maxAdvanceBookingDays: 30,
      cancellationHours: 4,
      bufferMinutes: 15, // Buffer between appointments
      allowDoubleBooking: false, // Personal shopping is exclusive
      requireDeposit: false,
    };
    
    super(businessId, retailRules);
  }

  // Retail-specific appointment validation
  validateRetailAppointment(
    request: RetailBookingRequest, 
    personalShoppers: PersonalShopper[], 
    customer?: RetailCustomer,
    fittingRooms?: FittingRoom[]
  ): BookingValidation {
    const baseValidation = this.validateBooking(request);
    const errors = [...baseValidation.errors];
    const warnings = [...baseValidation.warnings];

    // Validate contact information
    if (!request.contactPhone || request.contactPhone.length < 10) {
      errors.push('Valid contact phone number is required');
    }

    // Validate budget if provided
    if (request.budget) {
      if (request.budget.min < 0 || request.budget.max < 0) {
        errors.push('Budget amounts cannot be negative');
      }
      if (request.budget.min > request.budget.max) {
        errors.push('Minimum budget cannot exceed maximum budget');
      }
    }

    // Check if preferred shopper is available
    if (request.preferredShopper) {
      const shopper = personalShoppers.find(s => s.id === request.preferredShopper);
      if (!shopper) {
        warnings.push('Preferred shopper not found, will assign available shopper');
      } else if (shopper.status !== 'active') {
        warnings.push('Preferred shopper is not available, will assign alternative');
      }
    }

    // Validate appointment type specific requirements
    if (request.appointmentType === 'fitting' && fittingRooms) {
      const availableRooms = fittingRooms.filter(room => room.isActive && !room.currentlyOccupied);
      if (availableRooms.length === 0) {
        errors.push('No fitting rooms available for the requested time');
      }
    }

    if (request.appointmentType === 'alteration' && !request.measurements) {
      warnings.push('Measurements recommended for alteration appointments');
    }

    // Check business hours
    const requestTime = new Date(request.startTime);
    if (!this.isBusinessOpen(requestTime)) {
      errors.push('Appointments are not available at the requested time');
    }

    // VIP priority validation
    if (request.priority === 'vip' && customer && customer.loyaltyTier === 'standard') {
      warnings.push('VIP priority requested for standard customer');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Find available personal shoppers
  async findAvailableShoppers(
    startTime: Date,
    endTime: Date,
    appointmentType: string,
    existingAppointments: RetailAppointment[] = [],
    shoppers: PersonalShopper[] = [],
    preferredShopper?: number
  ): Promise<PersonalShopper[]> {
    
    // Filter shoppers by availability and specialization
    let availableShoppers = shoppers.filter(shopper => 
      shopper.status === 'active' &&
      this.hasRelevantSpecialization(shopper, appointmentType)
    );

    // Prioritize preferred shopper if available
    if (preferredShopper) {
      const preferred = availableShoppers.find(s => s.id === preferredShopper);
      if (preferred && this.isShopperAvailable(preferred, startTime, endTime, existingAppointments)) {
        return [preferred, ...availableShoppers.filter(s => s.id !== preferredShopper)];
      }
    }

    // Check shopper availability
    availableShoppers = availableShoppers.filter(shopper => 
      this.isShopperAvailable(shopper, startTime, endTime, existingAppointments)
    );

    // Sort by performance (rating, experience, and commission)
    return availableShoppers.sort((a, b) => {
      const aScore = (a.rating * 0.5) + (a.experience * 0.3) + ((100 - a.commission) * 0.2);
      const bScore = (b.rating * 0.5) + (b.experience * 0.3) + ((100 - b.commission) * 0.2);
      return bScore - aScore;
    });
  }

  // Check if shopper has relevant specialization
  private hasRelevantSpecialization(shopper: PersonalShopper, appointmentType: string): boolean {
    switch (appointmentType) {
      case 'personal-shopping':
        return shopper.specializations.includes('personal-shopping') || 
               shopper.role === 'personal-shopper';
      case 'styling':
        return shopper.specializations.includes('styling') || 
               shopper.role === 'stylist';
      case 'fitting':
        return shopper.specializations.includes('fitting') || 
               shopper.role === 'fitter';
      case 'alteration':
        return shopper.specializations.includes('alteration') || 
               shopper.role === 'fitter';
      case 'consultation':
        return shopper.specializations.includes('consultation') || 
               shopper.role === 'consultant';
      default:
        return true;
    }
  }

  // Check if shopper is available
  private isShopperAvailable(
    shopper: PersonalShopper,
    startTime: Date,
    endTime: Date,
    existingAppointments: RetailAppointment[]
  ): boolean {
    // Check working hours
    const dayOfWeek = startTime.getDay().toString();
    const workingDay = shopper.workingHours[dayOfWeek];
    
    if (!workingDay?.isWorking) {
      return false;
    }

    const timeMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const [openHour, openMinute] = workingDay.startTime.split(':').map(Number);
    const [closeHour, closeMinute] = workingDay.endTime.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    if (timeMinutes < openMinutes || timeMinutes > closeMinutes) {
      return false;
    }

    // Check daily appointment limit
    const dayStart = new Date(startTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(startTime);
    dayEnd.setHours(23, 59, 59, 999);

    const dailyAppointments = existingAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.startTime);
      return appointment.personalShopperId === shopper.id && 
             appointment.status !== 'cancelled' &&
             appointmentDate >= dayStart && 
             appointmentDate <= dayEnd;
    }).length;

    if (dailyAppointments >= shopper.maxAppointmentsPerDay) {
      return false;
    }

    // Check for conflicting appointments
    const shopperAppointments = existingAppointments.filter(appointment => 
      appointment.personalShopperId === shopper.id && 
      appointment.status !== 'cancelled'
    );

    return !this.hasScheduleConflict(startTime, endTime, shopperAppointments);
  }

  // Check for schedule conflicts
  private hasScheduleConflict(
    startTime: Date,
    endTime: Date,
    existingAppointments: RetailAppointment[]
  ): boolean {
    return existingAppointments.some(appointment => {
      const appointmentStart = new Date(appointment.startTime);
      const appointmentEnd = new Date(appointment.endTime);
      
      // Add buffer time
      appointmentStart.setMinutes(appointmentStart.getMinutes() - this.rules.bufferMinutes);
      appointmentEnd.setMinutes(appointmentEnd.getMinutes() + this.rules.bufferMinutes);

      return (
        (startTime >= appointmentStart && startTime < appointmentEnd) ||
        (endTime > appointmentStart && endTime <= appointmentEnd) ||
        (startTime <= appointmentStart && endTime >= appointmentEnd)
      );
    });
  }

  // Generate retail appointment slots
  async generateRetailBookingSlots(
    date: Date,
    appointmentType: string,
    duration: number = 60,
    shoppers: PersonalShopper[],
    existingAppointments: RetailAppointment[] = [],
    customer?: RetailCustomer
  ): Promise<Array<BookingSlot & { shopperId?: number; shopperName?: string }>> {
    
    const workingHours = this.getBusinessHours();
    const baseSlots = this.generateAvailableSlots(date, duration, workingHours, existingAppointments);
    
    const retailSlots = [];

    for (const slot of baseSlots) {
      if (!slot.available) {
        retailSlots.push({ ...slot, shopperId: undefined, shopperName: undefined });
        continue;
      }

      // Find available shoppers for this slot
      const availableShoppers = await this.findAvailableShoppers(
        slot.startTime,
        slot.endTime,
        appointmentType,
        existingAppointments,
        shoppers
      );

      if (availableShoppers.length > 0) {
        // Assign the best available shopper
        const assignedShopper = availableShoppers[0];
        retailSlots.push({
          ...slot,
          available: true,
          shopperId: assignedShopper.id,
          shopperName: assignedShopper.name,
          price: this.calculateAppointmentPrice(appointmentType, duration, customer)
        });
      } else {
        retailSlots.push({
          ...slot,
          available: false,
          shopperId: undefined,
          shopperName: undefined
        });
      }
    }

    return retailSlots;
  }

  // Calculate appointment pricing
  calculateAppointmentPrice(
    appointmentType: string,
    duration: number,
    customer?: RetailCustomer
  ): number {
    // Base pricing by appointment type
    const basePrices: Record<string, number> = {
      'personal-shopping': 100,
      'styling': 150,
      'consultation': 75,
      'fitting': 50,
      'custom-order': 200,
      'alteration': 25
    };
    
    let price = basePrices[appointmentType] || 100;
    
    // Duration multiplier (for appointments longer than 1 hour)
    if (duration > 60) {
      price = price * (duration / 60);
    }
    
    // Customer loyalty discount
    if (customer) {
      const discounts = {
        'standard': 0,
        'silver': 0.05,
        'gold': 0.10,
        'platinum': 0.15
      };
      price *= (1 - discounts[customer.loyaltyTier]);
    }
    
    return Math.round(price);
  }

  // Product recommendation engine
  async recommendProducts(
    customer: RetailCustomer,
    occasion?: string,
    budget?: { min: number; max: number },
    availableProducts: RetailProduct[] = []
  ): Promise<Array<RetailProduct & { matchScore: number; reasons: string[] }>> {
    const recommendations = [];

    for (const product of availableProducts) {
      if (!product.isActive) continue;

      let matchScore = 0;
      const reasons: string[] = [];

      // Price matching
      if (budget) {
        if (product.price >= budget.min && product.price <= budget.max) {
          matchScore += 25;
          reasons.push('Within budget');
        } else if (product.salePrice && product.salePrice >= budget.min && product.salePrice <= budget.max) {
          matchScore += 30;
          reasons.push('On sale within budget');
        }
      } else if (customer.styleProfile.budgetRange) {
        if (product.price >= customer.styleProfile.budgetRange.min && 
            product.price <= customer.styleProfile.budgetRange.max) {
          matchScore += 20;
          reasons.push('Within customer budget range');
        }
      }

      // Style preferences
      const matchingStyles = customer.styleProfile.preferredStyles.filter(style =>
        product.tags.includes(style.toLowerCase()) || 
        product.subcategory.toLowerCase().includes(style.toLowerCase())
      );
      if (matchingStyles.length > 0) {
        matchScore += matchingStyles.length * 15;
        reasons.push(`Matches style preferences: ${matchingStyles.join(', ')}`);
      }

      // Color preferences
      const matchingColors = customer.styleProfile.preferredColors.filter(color =>
        product.colors?.includes(color)
      );
      if (matchingColors.length > 0) {
        matchScore += matchingColors.length * 10;
        reasons.push(`Available in preferred colors: ${matchingColors.join(', ')}`);
      }

      // Brand preferences
      if (customer.styleProfile.preferredBrands.includes(product.brand)) {
        matchScore += 20;
        reasons.push(`Preferred brand: ${product.brand}`);
      }

      // Size availability
      const customerSizes = customer.styleProfile.sizes;
      if (customerSizes[product.category] && product.sizes?.includes(customerSizes[product.category])) {
        matchScore += 15;
        reasons.push('Available in customer size');
      }

      // Gender matching
      if (customer.gender && (product.gender === customer.gender || product.gender === 'unisex')) {
        matchScore += 10;
        reasons.push('Gender appropriate');
      }

      // Occasion matching
      if (occasion) {
        const occasionTags = this.getOccasionTags(occasion);
        const matchingOccasionTags = occasionTags.filter(tag => 
          product.tags.includes(tag) || product.features.includes(tag)
        );
        if (matchingOccasionTags.length > 0) {
          matchScore += 25;
          reasons.push(`Perfect for ${occasion}`);
        }
      }

      // Purchase history (avoid recommending recently purchased items)
      const recentPurchases = customer.purchaseHistory.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return purchaseDate > thirtyDaysAgo;
      });

      const recentlyPurchased = recentPurchases.some(purchase => 
        purchase.products.includes(product.id)
      );

      if (recentlyPurchased) {
        matchScore -= 30;
        reasons.push('Recently purchased - may want variety');
      }

      // Seasonal appropriateness
      const currentMonth = new Date().getMonth();
      const currentSeason = this.getCurrentSeason(currentMonth);
      if (product.season === currentSeason || product.season === 'all-season') {
        matchScore += 10;
        reasons.push('Seasonally appropriate');
      }

      if (matchScore > 15) { // Only include reasonably matching products
        recommendations.push({
          ...product,
          matchScore,
          reasons
        });
      }
    }

    // Sort by match score
    return recommendations.sort((a, b) => b.matchScore - a.matchScore);
  }

  // Get occasion-specific tags
  private getOccasionTags(occasion: string): string[] {
    const occasionMap: Record<string, string[]> = {
      'work': ['professional', 'business', 'formal', 'conservative'],
      'wedding': ['formal', 'elegant', 'dressy', 'special-occasion'],
      'party': ['party', 'fun', 'trendy', 'statement'],
      'casual': ['casual', 'comfortable', 'everyday', 'relaxed'],
      'date': ['romantic', 'flattering', 'confident', 'stylish'],
      'vacation': ['comfortable', 'versatile', 'travel-friendly', 'casual'],
      'interview': ['professional', 'conservative', 'polished', 'confident']
    };

    return occasionMap[occasion.toLowerCase()] || [];
  }

  // Get current season
  private getCurrentSeason(month: number): 'spring' | 'summer' | 'fall' | 'winter' {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  // Find available fitting rooms
  async findAvailableFittingRooms(
    startTime: Date,
    endTime: Date,
    fittingRooms: FittingRoom[] = [],
    existingAppointments: RetailAppointment[] = [],
    isVIP: boolean = false
  ): Promise<FittingRoom[]> {
    
    // Filter by availability and VIP preference
    let availableRooms = fittingRooms.filter(room => 
      room.isActive && 
      !room.currentlyOccupied &&
      (isVIP ? room.isVIP : true)
    );

    // Check for conflicts with existing appointments
    availableRooms = availableRooms.filter(room => {
      const roomAppointments = existingAppointments.filter(appointment => 
        appointment.appointmentType === 'fitting' &&
        appointment.status !== 'cancelled'
        // Note: In a real implementation, you'd have a fittingRoomId field
      );

      return !this.hasScheduleConflict(startTime, endTime, roomAppointments);
    });

    // Sort by room preference (VIP first, then by size)
    return availableRooms.sort((a, b) => {
      if (a.isVIP && !b.isVIP) return -1;
      if (!a.isVIP && b.isVIP) return 1;
      
      const sizeOrder = { 'small': 1, 'medium': 2, 'large': 3, 'accessible': 4 };
      return sizeOrder[b.size] - sizeOrder[a.size];
    });
  }

  // Customer loyalty tier calculation
  calculateLoyaltyTier(totalSpent: number, appointmentCount: number): 'standard' | 'silver' | 'gold' | 'platinum' {
    if (totalSpent >= 10000 && appointmentCount >= 20) return 'platinum';
    if (totalSpent >= 5000 && appointmentCount >= 10) return 'gold';
    if (totalSpent >= 2000 && appointmentCount >= 5) return 'silver';
    return 'standard';
  }

  // Style profile analysis
  analyzeStyleProfile(purchaseHistory: Array<{ products: RetailProduct[]; date: Date }>): {
    dominantStyles: string[];
    preferredColors: string[];
    budgetRange: { min: number; max: number };
    seasonalPreferences: Record<string, number>;
  } {
    const allProducts = purchaseHistory.flatMap(purchase => purchase.products);
    
    // Analyze dominant styles
    const styleCount: Record<string, number> = {};
    allProducts.forEach(product => {
      product.tags.forEach(tag => {
        styleCount[tag] = (styleCount[tag] || 0) + 1;
      });
    });
    
    const dominantStyles = Object.entries(styleCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([style]) => style);

    // Analyze preferred colors
    const colorCount: Record<string, number> = {};
    allProducts.forEach(product => {
      product.colors?.forEach(color => {
        colorCount[color] = (colorCount[color] || 0) + 1;
      });
    });
    
    const preferredColors = Object.entries(colorCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([color]) => color);

    // Calculate budget range
    const prices = allProducts.map(product => product.price);
    const budgetRange = {
      min: Math.min(...prices) * 0.8,
      max: Math.max(...prices) * 1.2
    };

    // Analyze seasonal preferences
    const seasonalPreferences: Record<string, number> = {
      'spring': 0,
      'summer': 0,
      'fall': 0,
      'winter': 0
    };
    
    allProducts.forEach(product => {
      if (product.season && product.season !== 'all-season') {
        seasonalPreferences[product.season]++;
      }
    });

    return {
      dominantStyles,
      preferredColors,
      budgetRange,
      seasonalPreferences
    };
  }

  // Get business hours for retail
  private getBusinessHours() {
    return {
      '1': { isOpen: true, openTime: '10:00', closeTime: '20:00' }, // Monday
      '2': { isOpen: true, openTime: '10:00', closeTime: '20:00' }, // Tuesday
      '3': { isOpen: true, openTime: '10:00', closeTime: '20:00' }, // Wednesday
      '4': { isOpen: true, openTime: '10:00', closeTime: '20:00' }, // Thursday
      '5': { isOpen: true, openTime: '10:00', closeTime: '21:00' }, // Friday
      '6': { isOpen: true, openTime: '09:00', closeTime: '21:00' }, // Saturday
      '0': { isOpen: true, openTime: '11:00', closeTime: '19:00' }  // Sunday
    };
  }

  // Check if business is open
  private isBusinessOpen(dateTime: Date): boolean {
    const dayOfWeek = dateTime.getDay().toString();
    const hours = this.getBusinessHours();
    const dayHours = hours[dayOfWeek];

    if (!dayHours?.isOpen) {
      return false;
    }

    const timeMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();
    const [openHour, openMinute] = dayHours.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = dayHours.closeTime.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    return timeMinutes >= openMinutes && timeMinutes <= closeMinutes;
  }
}