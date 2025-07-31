import { BookingService } from '../../shared/booking-core/BookingService.js';
import { ProfessionalConsultation, ProfessionalBookingRequest, ProfessionalConsultant, ProfessionalClient, ConsultationRoom } from '../types.js';
import { BookingValidation, BookingSlot, BookingRules } from '../../shared/booking-core/types.js';

export class ProfessionalBookingService extends BookingService {
  
  constructor(businessId: number) {
    // Professional services booking rules
    const professionalRules: BookingRules = {
      advanceBookingHours: 4,
      maxAdvanceBookingDays: 90,
      cancellationHours: 24,
      bufferMinutes: 15, // Buffer between consultations
      allowDoubleBooking: false, // Consultations are exclusive
      requireDeposit: true,
    };
    
    super(businessId, professionalRules);
  }

  // Professional-specific consultation validation
  validateProfessionalConsultation(
    request: ProfessionalBookingRequest, 
    consultants: ProfessionalConsultant[], 
    client?: ProfessionalClient,
    consultationRooms?: ConsultationRoom[]
  ): BookingValidation {
    const baseValidation = this.validateBooking(request);
    const errors = [...baseValidation.errors];
    const warnings = [...baseValidation.warnings];

    // Validate contact information
    if (!request.contactPhone || request.contactPhone.length < 10) {
      errors.push('Valid contact phone number is required');
    }

    // Validate emergency consultations
    if (request.urgency === 'emergency') {
      const emergencyConsultants = consultants.filter(c => 
        c.availableForEmergency && c.status === 'active'
      );
      
      if (emergencyConsultants.length === 0) {
        errors.push('No consultants available for emergency consultations');
      }
      
      // Emergency consultations need to be within next 4 hours
      const consultationTime = new Date(request.startTime);
      const now = new Date();
      const hoursDiff = (consultationTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 4) {
        warnings.push('Emergency consultations are typically scheduled within 4 hours');
      }
    }

    // Check if preferred consultant is available and qualified
    if (request.preferredConsultant) {
      const consultant = consultants.find(c => c.id === request.preferredConsultant);
      if (!consultant) {
        warnings.push('Preferred consultant not found, will assign available consultant');
      } else if (consultant.status !== 'active') {
        warnings.push('Preferred consultant is not available, will assign alternative');
      } else if (!this.hasRelevantExpertise(consultant, request.consultationType)) {
        warnings.push('Preferred consultant may not specialize in this area');
      }
    }

    // Validate consultation mode requirements
    if (request.consultationMode === 'video-call') {
      if (consultationRooms) {
        const videoRooms = consultationRooms.filter(room => room.hasVideoConference);
        if (videoRooms.length === 0) {
          errors.push('No video conference enabled rooms available');
        }
      }
    }

    // Validate billing type and estimated hours
    if (request.billingType === 'hourly' && !request.estimatedHours) {
      warnings.push('Estimated hours recommended for hourly billing');
    }

    if (request.estimatedHours && request.estimatedHours > 8) {
      warnings.push('Consultation over 8 hours may require multiple sessions');
    }

    // Check business hours for consultation type
    const consultationTime = new Date(request.startTime);
    if (!this.isBusinessOpen(consultationTime, request.urgency)) {
      if (request.urgency === 'emergency') {
        warnings.push('Emergency consultation scheduled outside normal hours');
      } else {
        errors.push('Consultations are not available at the requested time');
      }
    }

    // Validate case background for certain consultation types
    const complexTypes = ['legal', 'financial', 'business'];
    if (complexTypes.includes(request.consultationType) && !request.caseBackground) {
      warnings.push('Case background recommended for this consultation type');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Check if consultant has relevant expertise
  private hasRelevantExpertise(consultant: ProfessionalConsultant, consultationType: string): boolean {
    // Check if consultant's profession matches consultation type
    const professionMap: Record<string, string[]> = {
      'legal': ['lawyer'],
      'financial': ['accountant', 'business-advisor'],
      'business': ['business-advisor', 'accountant'],
      'tax': ['accountant'],
      'hr': ['hr-specialist'],
      'marketing': ['marketing-expert'],
      'technical': ['it-consultant'],
      'healthcare': ['doctor']
    };

    const relevantProfessions = professionMap[consultationType] || [];
    
    return relevantProfessions.includes(consultant.profession) ||
           consultant.specializations.some(spec => 
             spec.toLowerCase().includes(consultationType.toLowerCase())
           );
  }

  // Find available consultants
  async findAvailableConsultants(
    startTime: Date,
    endTime: Date,
    consultationType: string,
    urgency: string,
    existingConsultations: ProfessionalConsultation[] = [],
    consultants: ProfessionalConsultant[] = [],
    preferredConsultant?: number
  ): Promise<ProfessionalConsultant[]> {
    
    // Filter consultants by availability, expertise, and emergency capacity
    let availableConsultants = consultants.filter(consultant => 
      consultant.status === 'active' &&
      this.hasRelevantExpertise(consultant, consultationType) &&
      (urgency !== 'emergency' || consultant.availableForEmergency)
    );

    // Prioritize preferred consultant if available
    if (preferredConsultant) {
      const preferred = availableConsultants.find(c => c.id === preferredConsultant);
      if (preferred && this.isConsultantAvailable(preferred, startTime, endTime, existingConsultations)) {
        return [preferred, ...availableConsultants.filter(c => c.id !== preferredConsultant)];
      }
    }

    // Check consultant availability
    availableConsultants = availableConsultants.filter(consultant => 
      this.isConsultantAvailable(consultant, startTime, endTime, existingConsultations)
    );

    // Sort by performance and expertise match
    return availableConsultants.sort((a, b) => {
      const aScore = this.calculateConsultantScore(a, consultationType);
      const bScore = this.calculateConsultantScore(b, consultationType);
      return bScore - aScore;
    });
  }

  // Calculate consultant scoring for matching
  private calculateConsultantScore(consultant: ProfessionalConsultant, consultationType: string): number {
    let score = 0;
    
    // Base score from rating and experience
    score += consultant.rating * 20;
    score += Math.min(consultant.experience, 20) * 2;
    
    // Expertise bonus
    if (this.hasRelevantExpertise(consultant, consultationType)) {
      score += 30;
    }
    
    // Specialization bonus
    const matchingSpecs = consultant.specializations.filter(spec =>
      spec.toLowerCase().includes(consultationType.toLowerCase())
    );
    score += matchingSpecs.length * 10;
    
    // Experience bonus
    score += Math.min(consultant.totalConsultations / 10, 20);
    
    return score;
  }

  // Check if consultant is available
  private isConsultantAvailable(
    consultant: ProfessionalConsultant,
    startTime: Date,
    endTime: Date,
    existingConsultations: ProfessionalConsultation[]
  ): boolean {
    // Check working hours
    const dayOfWeek = startTime.getDay().toString();
    const workingDay = consultant.workingHours[dayOfWeek];
    
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

    // Check daily consultation limit
    const dayStart = new Date(startTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(startTime);
    dayEnd.setHours(23, 59, 59, 999);

    const dailyConsultations = existingConsultations.filter(consultation => {
      const consultationDate = new Date(consultation.startTime);
      return consultation.consultantId === consultant.id && 
             consultation.status !== 'cancelled' &&
             consultationDate >= dayStart && 
             consultationDate <= dayEnd;
    }).length;

    if (dailyConsultations >= consultant.maxConsultationsPerDay) {
      return false;
    }

    // Check for conflicting consultations
    const consultantConsultations = existingConsultations.filter(consultation => 
      consultation.consultantId === consultant.id && 
      consultation.status !== 'cancelled'
    );

    return !this.hasScheduleConflict(startTime, endTime, consultantConsultations);
  }

  // Check for schedule conflicts
  private hasScheduleConflict(
    startTime: Date,
    endTime: Date,
    existingConsultations: ProfessionalConsultation[]
  ): boolean {
    return existingConsultations.some(consultation => {
      const consultationStart = new Date(consultation.startTime);
      const consultationEnd = new Date(consultation.endTime);
      
      // Add buffer time
      consultationStart.setMinutes(consultationStart.getMinutes() - this.rules.bufferMinutes);
      consultationEnd.setMinutes(consultationEnd.getMinutes() + this.rules.bufferMinutes);

      return (
        (startTime >= consultationStart && startTime < consultationEnd) ||
        (endTime > consultationStart && endTime <= consultationEnd) ||
        (startTime <= consultationStart && endTime >= consultationEnd)
      );
    });
  }

  // Generate professional consultation slots
  async generateProfessionalBookingSlots(
    date: Date,
    consultationType: string,
    duration: number,
    consultants: ProfessionalConsultant[],
    existingConsultations: ProfessionalConsultation[] = [],
    urgency: string = 'standard',
    client?: ProfessionalClient
  ): Promise<Array<BookingSlot & { consultantId?: number; consultantName?: string; expertise?: string[] }>> {
    
    const workingHours = this.getBusinessHours(urgency);
    const baseSlots = this.generateAvailableSlots(date, duration, workingHours, existingConsultations);
    
    const professionalSlots = [];

    for (const slot of baseSlots) {
      if (!slot.available) {
        professionalSlots.push({ 
          ...slot, 
          consultantId: undefined, 
          consultantName: undefined,
          expertise: undefined
        });
        continue;
      }

      // Find available consultants for this slot
      const availableConsultants = await this.findAvailableConsultants(
        slot.startTime,
        slot.endTime,
        consultationType,
        urgency,
        existingConsultations,
        consultants
      );

      if (availableConsultants.length > 0) {
        // Assign the best available consultant
        const assignedConsultant = availableConsultants[0];
        professionalSlots.push({
          ...slot,
          available: true,
          consultantId: assignedConsultant.id,
          consultantName: assignedConsultant.name,
          expertise: assignedConsultant.specializations,
          price: this.calculateConsultationPrice(
            assignedConsultant.hourlyRate, 
            duration, 
            urgency, 
            client
          )
        });
      } else {
        professionalSlots.push({
          ...slot,
          available: false,
          consultantId: undefined,
          consultantName: undefined,
          expertise: undefined
        });
      }
    }

    return professionalSlots;
  }

  // Calculate consultation pricing
  calculateConsultationPrice(
    hourlyRate: number,
    duration: number,
    urgency: string,
    client?: ProfessionalClient
  ): number {
    let price = (hourlyRate * duration) / 60; // Convert minutes to hours
    
    // Urgency multipliers
    const urgencyMultipliers = {
      'standard': 1.0,
      'urgent': 1.5,
      'emergency': 2.0
    };
    
    price *= urgencyMultipliers[urgency as keyof typeof urgencyMultipliers] || 1.0;
    
    // Client type discounts
    if (client) {
      const clientDiscounts = {
        'individual': 0,
        'small-business': 0.05,
        'corporation': 0.10,
        'non-profit': 0.15
      };
      
      price *= (1 - clientDiscounts[client.clientType]);
    }
    
    // Minimum consultation fee
    const minimumFee = hourlyRate * 0.5; // 30 minutes minimum
    price = Math.max(price, minimumFee);
    
    return Math.round(price);
  }

  // Find available consultation rooms
  async findAvailableConsultationRooms(
    startTime: Date,
    endTime: Date,
    consultationMode: string,
    consultationRooms: ConsultationRoom[] = [],
    existingConsultations: ProfessionalConsultation[] = [],
    isPrivate: boolean = true
  ): Promise<ConsultationRoom[]> {
    
    // Filter rooms by requirements
    let availableRooms = consultationRooms.filter(room => 
      room.isActive &&
      (isPrivate ? room.isPrivate : true) &&
      (consultationMode === 'video-call' ? room.hasVideoConference : true)
    );

    // Check for conflicts with existing consultations
    availableRooms = availableRooms.filter(room => {
      const roomConsultations = existingConsultations.filter(consultation => 
        consultation.consultationMode === 'in-person' &&
        consultation.status !== 'cancelled'
        // Note: In a real implementation, you'd have a consultationRoomId field
      );

      return !this.hasScheduleConflict(startTime, endTime, roomConsultations);
    });

    // Sort by room features and capacity
    return availableRooms.sort((a, b) => {
      // Prioritize private rooms
      if (a.isPrivate && !b.isPrivate) return -1;
      if (!a.isPrivate && b.isPrivate) return 1;
      
      // Then by amenities count
      return b.amenities.length - a.amenities.length;
    });
  }

  // Consultation cost estimation
  estimateConsultationCost(
    consultationType: string,
    estimatedHours: number,
    consultants: ProfessionalConsultant[],
    urgency: string = 'standard'
  ): {
    minCost: number;
    maxCost: number;
    averageCost: number;
    recommendations: Array<{
      consultantId: number;
      name: string;
      cost: number;
      experience: number;
      rating: number;
    }>;
  } {
    // Filter relevant consultants
    const relevantConsultants = consultants.filter(consultant =>
      consultant.status === 'active' &&
      this.hasRelevantExpertise(consultant, consultationType) &&
      (urgency !== 'emergency' || consultant.availableForEmergency)
    );

    if (relevantConsultants.length === 0) {
      return {
        minCost: 0,
        maxCost: 0,
        averageCost: 0,
        recommendations: []
      };
    }

    // Calculate costs
    const costs = relevantConsultants.map(consultant => {
      const baseCost = consultant.hourlyRate * estimatedHours;
      const urgencyMultiplier = urgency === 'emergency' ? 2.0 : urgency === 'urgent' ? 1.5 : 1.0;
      return baseCost * urgencyMultiplier;
    });

    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const averageCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;

    // Generate recommendations (top 3 consultants by score)
    const recommendations = relevantConsultants
      .map((consultant, index) => ({
        consultantId: consultant.id,
        name: consultant.name,
        cost: costs[index],
        experience: consultant.experience,
        rating: consultant.rating,
        score: this.calculateConsultantScore(consultant, consultationType)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ consultantId, name, cost, experience, rating }) => ({
        consultantId,
        name,
        cost: Math.round(cost),
        experience,
        rating
      }));

    return {
      minCost: Math.round(minCost),
      maxCost: Math.round(maxCost),
      averageCost: Math.round(averageCost),
      recommendations
    };
  }

  // Generate consultation timeline
  generateConsultationTimeline(
    consultation: ProfessionalConsultation,
    consultant: ProfessionalConsultant
  ): Array<{ time: string; activity: string; duration: number; responsible: string }> {
    const timeline = [];
    const consultationStart = new Date(consultation.startTime);
    const consultationEnd = new Date(consultation.endTime);
    const duration = (consultationEnd.getTime() - consultationStart.getTime()) / (1000 * 60);

    // Pre-consultation preparation
    const prepTime = new Date(consultationStart.getTime() - (15 * 60 * 1000));
    timeline.push({
      time: prepTime.toTimeString().substring(0, 5),
      activity: 'Review case materials and prepare',
      duration: 15,
      responsible: consultant.name
    });

    // Consultation phases
    timeline.push({
      time: consultationStart.toTimeString().substring(0, 5),
      activity: 'Client consultation begins',
      duration: Math.round(duration * 0.8),
      responsible: consultant.name
    });

    // Documentation phase
    const docTime = new Date(consultationEnd.getTime() - (duration * 0.2 * 60 * 1000));
    timeline.push({
      time: docTime.toTimeString().substring(0, 5),
      activity: 'Document consultation and next steps',
      duration: Math.round(duration * 0.2),
      responsible: consultant.name
    });

    // Post-consultation follow-up
    if (consultation.followUpRequired) {
      const followUpTime = new Date(consultationEnd.getTime() + (30 * 60 * 1000));
      timeline.push({
        time: followUpTime.toTimeString().substring(0, 5),
        activity: 'Schedule follow-up and send summary',
        duration: 15,
        responsible: consultant.name
      });
    }

    return timeline;
  }

  // Client consultation history analysis
  analyzeClientHistory(
    client: ProfessionalClient,
    consultations: ProfessionalConsultation[]
  ): {
    totalConsultations: number;
    totalHours: number;
    totalSpent: number;
    averageConsultationLength: number;
    preferredConsultationTypes: string[];
    consultationFrequency: number; // consultations per month
    riskFactors: string[];
    recommendations: string[];
  } {
    const clientConsultations = consultations.filter(c => c.clientId === client.id);
    
    if (clientConsultations.length === 0) {
      return {
        totalConsultations: 0,
        totalHours: 0,
        totalSpent: 0,
        averageConsultationLength: 0,
        preferredConsultationTypes: [],
        consultationFrequency: 0,
        riskFactors: [],
        recommendations: []
      };
    }

    // Calculate metrics
    const totalConsultations = clientConsultations.length;
    const totalHours = clientConsultations.reduce((sum, c) => {
      const duration = (new Date(c.endTime).getTime() - new Date(c.startTime).getTime()) / (1000 * 60 * 60);
      return sum + duration;
    }, 0);
    
    const totalSpent = client.totalSpent;
    const averageConsultationLength = totalHours / totalConsultations;

    // Analyze consultation types
    const typeCount: Record<string, number> = {};
    clientConsultations.forEach(c => {
      typeCount[c.consultationType] = (typeCount[c.consultationType] || 0) + 1;
    });
    
    const preferredConsultationTypes = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    // Calculate consultation frequency (per month)
    const firstConsultation = new Date(Math.min(...clientConsultations.map(c => new Date(c.startTime).getTime())));
    const lastConsultation = new Date(Math.max(...clientConsultations.map(c => new Date(c.startTime).getTime())));
    const monthsDiff = Math.max(1, (lastConsultation.getTime() - firstConsultation.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const consultationFrequency = totalConsultations / monthsDiff;

    // Identify risk factors
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (consultationFrequency > 4) {
      riskFactors.push('High consultation frequency may indicate ongoing issues');
      recommendations.push('Consider retainer agreement for cost savings');
    }

    if (averageConsultationLength > 3) {
      riskFactors.push('Long consultation sessions may indicate complex issues');
      recommendations.push('Consider breaking complex matters into multiple sessions');
    }

    const urgentConsultations = clientConsultations.filter(c => c.urgency === 'urgent' || c.urgency === 'emergency').length;
    if (urgentConsultations / totalConsultations > 0.3) {
      riskFactors.push('High percentage of urgent consultations');
      recommendations.push('Consider proactive planning to reduce emergency consultations');
    }

    if (totalSpent > 50000) {
      recommendations.push('Client qualifies for volume discount consideration');
    }

    return {
      totalConsultations,
      totalHours: Math.round(totalHours * 100) / 100,
      totalSpent,
      averageConsultationLength: Math.round(averageConsultationLength * 100) / 100,
      preferredConsultationTypes,
      consultationFrequency: Math.round(consultationFrequency * 100) / 100,
      riskFactors,
      recommendations
    };
  }

  // Get business hours (different for emergency vs standard)
  private getBusinessHours(urgency: string = 'standard') {
    if (urgency === 'emergency') {
      // Extended hours for emergencies
      return {
        '1': { isOpen: true, openTime: '06:00', closeTime: '22:00' }, // Monday
        '2': { isOpen: true, openTime: '06:00', closeTime: '22:00' }, // Tuesday
        '3': { isOpen: true, openTime: '06:00', closeTime: '22:00' }, // Wednesday
        '4': { isOpen: true, openTime: '06:00', closeTime: '22:00' }, // Thursday
        '5': { isOpen: true, openTime: '06:00', closeTime: '22:00' }, // Friday
        '6': { isOpen: true, openTime: '08:00', closeTime: '20:00' }, // Saturday
        '0': { isOpen: true, openTime: '10:00', closeTime: '18:00' }  // Sunday
      };
    }
    
    // Standard business hours
    return {
      '1': { isOpen: true, openTime: '08:00', closeTime: '18:00' }, // Monday
      '2': { isOpen: true, openTime: '08:00', closeTime: '18:00' }, // Tuesday
      '3': { isOpen: true, openTime: '08:00', closeTime: '18:00' }, // Wednesday
      '4': { isOpen: true, openTime: '08:00', closeTime: '18:00' }, // Thursday
      '5': { isOpen: true, openTime: '08:00', closeTime: '18:00' }, // Friday
      '6': { isOpen: true, openTime: '09:00', closeTime: '15:00' }, // Saturday
      '0': { isOpen: false, openTime: '00:00', closeTime: '00:00' }  // Sunday closed
    };
  }

  // Check if business is open (considering urgency)
  private isBusinessOpen(dateTime: Date, urgency: string = 'standard'): boolean {
    const dayOfWeek = dateTime.getDay().toString();
    const hours = this.getBusinessHours(urgency);
    const dayHours = hours[dayOfWeek];

    if (!dayHours?.isOpen) {
      return urgency === 'emergency'; // Emergency consultations can happen even when "closed"
    }

    const timeMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();
    const [openHour, openMinute] = dayHours.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = dayHours.closeTime.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    return timeMinutes >= openMinutes && timeMinutes <= closeMinutes;
  }
}