import { BookingService } from '../../shared/booking-core/BookingService.js';
import { PropertyViewing, RealEstateBookingRequest, Property, RealEstateAgent, RealEstateLead } from '../types.js';
import { BookingValidation, BookingSlot, BookingRules } from '../../shared/booking-core/types.js';

export class RealEstateBookingService extends BookingService {
  
  constructor(businessId: number) {
    // Real estate specific booking rules
    const realEstateRules: BookingRules = {
      advanceBookingHours: 2,
      maxAdvanceBookingDays: 60,
      cancellationHours: 4,
      bufferMinutes: 15, // Buffer between viewings
      allowDoubleBooking: true, // Multiple viewings can happen (open houses)
      requireDeposit: false,
    };
    
    super(businessId, realEstateRules);
  }

  // Real estate specific viewing validation
  validatePropertyViewing(
    request: RealEstateBookingRequest, 
    property: Property, 
    agents: RealEstateAgent[]
  ): BookingValidation {
    const baseValidation = this.validateBooking(request);
    const errors = [...baseValidation.errors];
    const warnings = [...baseValidation.warnings];

    // Validate property availability
    if (!property) {
      errors.push('Property not found');
    } else if (!property.isActive) {
      errors.push('Property is not available for viewing');
    } else if (property.status === 'sold' || property.status === 'rented') {
      errors.push('Property is no longer available');
    } else if (property.status === 'off-market') {
      errors.push('Property is currently off-market');
    }

    // Validate attendee count
    if (request.attendeeCount < 1) {
      errors.push('At least 1 attendee is required');
    }
    if (request.attendeeCount > 10) {
      errors.push('Maximum 10 attendees allowed for property viewings');
    }

    // Validate viewing type specific requirements
    if (request.viewingType === 'virtual') {
      // Virtual viewings may have different requirements
      if (!request.email) {
        errors.push('Email is required for virtual viewings');
      }
    }

    // Check if preferred agent is available
    if (request.preferredAgent) {
      const agent = agents.find(a => a.id === request.preferredAgent);
      if (!agent) {
        warnings.push('Preferred agent not found, will assign available agent');
      } else if (agent.status !== 'active') {
        warnings.push('Preferred agent is not available, will assign alternative agent');
      }
    }

    // Validate contact information
    if (!request.contactPhone || request.contactPhone.length < 10) {
      errors.push('Valid contact phone number is required');
    }

    // Check business hours
    const requestTime = new Date(request.startTime);
    if (!this.isBusinessOpen(requestTime)) {
      errors.push('Property viewings are not available at the requested time');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Find available agents for a viewing
  async findAvailableAgents(
    startTime: Date,
    endTime: Date,
    propertyLocation: string,
    existingViewings: PropertyViewing[] = [],
    agents: RealEstateAgent[] = [],
    preferredAgent?: number
  ): Promise<RealEstateAgent[]> {
    
    // Filter active agents who cover the property location
    let availableAgents = agents.filter(agent => 
      agent.status === 'active' &&
      (agent.territories.includes(propertyLocation) || agent.territories.includes('all'))
    );

    // Prioritize preferred agent if available
    if (preferredAgent) {
      const preferred = availableAgents.find(agent => agent.id === preferredAgent);
      if (preferred && this.isAgentAvailable(preferred, startTime, endTime, existingViewings)) {
        return [preferred, ...availableAgents.filter(a => a.id !== preferredAgent)];
      }
    }

    // Check agent availability
    availableAgents = availableAgents.filter(agent => 
      this.isAgentAvailable(agent, startTime, endTime, existingViewings)
    );

    // Sort by performance (rating and experience)
    return availableAgents.sort((a, b) => {
      const aScore = (a.rating * 0.7) + (a.experience * 0.3);
      const bScore = (b.rating * 0.7) + (b.experience * 0.3);
      return bScore - aScore;
    });
  }

  // Check if agent is available for viewing
  private isAgentAvailable(
    agent: RealEstateAgent,
    startTime: Date,
    endTime: Date,
    existingViewings: PropertyViewing[]
  ): boolean {
    // Check working hours
    const dayOfWeek = startTime.getDay().toString();
    const workingDay = agent.workingHours[dayOfWeek];
    
    if (!workingDay?.isWorking) {
      return false;
    }

    const timeMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const [openHour, openMinute] = workingDay.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = workingDay.closeTime.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    if (timeMinutes < openMinutes || timeMinutes > closeMinutes) {
      return false;
    }

    // Check for conflicting viewings
    const agentViewings = existingViewings.filter(viewing => 
      viewing.agentId === agent.id && 
      viewing.status !== 'cancelled'
    );

    return !this.hasScheduleConflict(startTime, endTime, agentViewings);
  }

  // Check for schedule conflicts
  private hasScheduleConflict(
    startTime: Date,
    endTime: Date,
    existingViewings: PropertyViewing[]
  ): boolean {
    return existingViewings.some(viewing => {
      const viewingStart = new Date(viewing.startTime);
      const viewingEnd = new Date(viewing.endTime);
      
      // Add buffer time
      viewingStart.setMinutes(viewingStart.getMinutes() - this.rules.bufferMinutes);
      viewingEnd.setMinutes(viewingEnd.getMinutes() + this.rules.bufferMinutes);

      return (
        (startTime >= viewingStart && startTime < viewingEnd) ||
        (endTime > viewingStart && endTime <= viewingEnd) ||
        (startTime <= viewingStart && endTime >= viewingEnd)
      );
    });
  }

  // Generate property viewing slots
  async generatePropertyViewingSlots(
    propertyId: number,
    date: Date,
    duration: number = 60, // 1 hour default
    property: Property,
    agents: RealEstateAgent[],
    existingViewings: PropertyViewing[] = [],
    viewingType: 'individual' | 'open-house' | 'virtual' | 'self-guided' = 'individual'
  ): Promise<Array<BookingSlot & { agentId?: number; agentName?: string }>> {
    
    const workingHours = this.getBusinessHours();
    const baseSlots = this.generateAvailableSlots(date, duration, workingHours, existingViewings);
    
    const propertySlots = [];

    for (const slot of baseSlots) {
      if (!slot.available) {
        propertySlots.push({ ...slot, agentId: undefined, agentName: undefined });
        continue;
      }

      // For virtual and self-guided tours, no agent assignment needed
      if (viewingType === 'virtual' || viewingType === 'self-guided') {
        propertySlots.push({
          ...slot,
          available: true,
          agentId: undefined,
          agentName: viewingType === 'virtual' ? 'Virtual Tour' : 'Self-Guided',
          price: this.calculateViewingPrice(viewingType, slot.startTime)
        });
        continue;
      }

      // Find available agents for this slot
      const availableAgents = await this.findAvailableAgents(
        slot.startTime,
        slot.endTime,
        property.address.zipCode,
        existingViewings,
        agents
      );

      if (availableAgents.length > 0) {
        // Assign the best available agent
        const assignedAgent = availableAgents[0];
        propertySlots.push({
          ...slot,
          available: true,
          agentId: assignedAgent.id,
          agentName: assignedAgent.name,
          price: this.calculateViewingPrice(viewingType, slot.startTime)
        });
      } else {
        propertySlots.push({
          ...slot,
          available: false,
          agentId: undefined,
          agentName: undefined
        });
      }
    }

    return propertySlots;
  }

  // Calculate viewing pricing (typically free for real estate)
  calculateViewingPrice(viewingType: string, viewingTime: Date): number {
    // Most property viewings are free, but premium services might have fees
    switch (viewingType) {
      case 'virtual':
        return 0; // Free virtual tours
      case 'self-guided':
        return 0; // Free self-guided tours
      case 'individual':
        return 0; // Free individual viewings
      case 'open-house':
        return 0; // Free open houses
      default:
        return 0;
    }
  }

  // Lead qualification scoring
  qualifyLead(lead: Partial<RealEstateLead>): {
    score: number;
    qualification: 'hot' | 'warm' | 'cold';
    reasons: string[];
  } {
    let score = 0;
    const reasons: string[] = [];

    // Timeline scoring
    switch (lead.timeline) {
      case 'immediate':
        score += 40;
        reasons.push('Ready to buy immediately');
        break;
      case '1-3-months':
        score += 30;
        reasons.push('Short-term buyer');
        break;
      case '3-6-months':
        score += 20;
        reasons.push('Medium-term buyer');
        break;
      case '6-months-plus':
        score += 10;
        reasons.push('Long-term buyer');
        break;
    }

    // Prequalification status
    if (lead.prequalified) {
      score += 25;
      reasons.push('Pre-qualified for financing');
    }

    // Price range (realistic vs market)
    if (lead.priceRange && lead.priceRange.min > 0 && lead.priceRange.max > lead.priceRange.min) {
      score += 15;
      reasons.push('Has realistic price range');
    }

    // Contact information completeness
    if (lead.email && lead.phone) {
      score += 10;
      reasons.push('Complete contact information');
    }

    // Lead source quality
    switch (lead.source) {
      case 'referral':
        score += 10;
        reasons.push('Referred by existing client');
        break;
      case 'website':
        score += 5;
        reasons.push('Found through website');
        break;
      default:
        score += 2;
        break;
    }

    // Determine qualification level
    let qualification: 'hot' | 'warm' | 'cold';
    if (score >= 70) {
      qualification = 'hot';
    } else if (score >= 40) {
      qualification = 'warm';
    } else {
      qualification = 'cold';
    }

    return { score, qualification, reasons };
  }

  // Property recommendation engine
  async recommendProperties(
    lead: RealEstateLead,
    availableProperties: Property[]
  ): Promise<Array<Property & { matchScore: number; reasons: string[] }>> {
    const recommendations = [];

    for (const property of availableProperties) {
      let matchScore = 0;
      const reasons: string[] = [];

      // Price matching
      if (property.price.amount >= lead.priceRange.min && 
          property.price.amount <= lead.priceRange.max) {
        matchScore += 30;
        reasons.push('Within price range');
      } else if (property.price.amount < lead.priceRange.max * 1.1) {
        matchScore += 15;
        reasons.push('Slightly above budget but negotiable');
      }

      // Property type matching
      if (lead.interestedPropertyTypes.includes(property.propertyType)) {
        matchScore += 25;
        reasons.push(`Matches preferred ${property.propertyType} type`);
      }

      // Location matching
      const propertyLocation = property.address.city.toLowerCase();
      const matchingLocation = lead.preferredLocations.some(loc => 
        propertyLocation.includes(loc.toLowerCase()) || 
        loc.toLowerCase().includes(propertyLocation)
      );
      if (matchingLocation) {
        matchScore += 20;
        reasons.push('In preferred location');
      }

      // Status and availability
      if (property.status === 'available' && property.isActive) {
        matchScore += 15;
        reasons.push('Currently available');
      }

      // Feature bonuses
      const desirableFeatures = ['pool', 'garage', 'hardwood-floors', 'updated-kitchen'];
      const matchingFeatures = property.features.filter(f => desirableFeatures.includes(f));
      if (matchingFeatures.length > 0) {
        matchScore += matchingFeatures.length * 2;
        reasons.push(`Has desirable features: ${matchingFeatures.join(', ')}`);
      }

      if (matchScore > 20) { // Only include reasonably matching properties
        recommendations.push({
          ...property,
          matchScore,
          reasons
        });
      }
    }

    // Sort by match score
    return recommendations.sort((a, b) => b.matchScore - a.matchScore);
  }

  // Market analysis helper
  async generateMarketInsights(
    property: Property,
    comparableProperties: Property[]
  ): Promise<{
    marketPosition: 'underpriced' | 'fairly-priced' | 'overpriced';
    recommendedPrice: number;
    insights: string[];
  }> {
    const insights: string[] = [];
    
    // Find similar properties
    const similarProperties = comparableProperties.filter(comp => 
      comp.propertyType === property.propertyType &&
      comp.address.city === property.address.city &&
      Math.abs((comp.details.squareFeet || 0) - (property.details.squareFeet || 0)) < 500
    );

    if (similarProperties.length === 0) {
      return {
        marketPosition: 'fairly-priced',
        recommendedPrice: property.price.amount,
        insights: ['Not enough comparable properties for analysis']
      };
    }

    // Calculate average price
    const avgPrice = similarProperties.reduce((sum, p) => sum + p.price.amount, 0) / similarProperties.length;
    const pricePerSqFt = property.price.amount / (property.details.squareFeet || 1);
    const avgPricePerSqFt = similarProperties.reduce((sum, p) => 
      sum + (p.price.amount / (p.details.squareFeet || 1)), 0) / similarProperties.length;

    // Determine market position
    let marketPosition: 'underpriced' | 'fairly-priced' | 'overpriced';
    if (property.price.amount < avgPrice * 0.9) {
      marketPosition = 'underpriced';
      insights.push('Property is priced below market average');
    } else if (property.price.amount > avgPrice * 1.1) {
      marketPosition = 'overpriced';
      insights.push('Property is priced above market average');
    } else {
      marketPosition = 'fairly-priced';
      insights.push('Property is competitively priced');
    }

    // Generate price recommendation
    const recommendedPrice = Math.round(avgPrice);
    
    insights.push(`Average market price: $${avgPrice.toLocaleString()}`);
    insights.push(`Price per sq ft: $${pricePerSqFt.toFixed(2)} vs market avg $${avgPricePerSqFt.toFixed(2)}`);
    insights.push(`Based on ${similarProperties.length} comparable properties`);

    return {
      marketPosition,
      recommendedPrice,
      insights
    };
  }

  // Get business hours for real estate
  private getBusinessHours() {
    return {
      '1': { isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Monday
      '2': { isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Tuesday
      '3': { isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Wednesday
      '4': { isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Thursday
      '5': { isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Friday
      '6': { isOpen: true, openTime: '10:00', closeTime: '17:00' }, // Saturday
      '0': { isOpen: true, openTime: '12:00', closeTime: '16:00' }  // Sunday
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