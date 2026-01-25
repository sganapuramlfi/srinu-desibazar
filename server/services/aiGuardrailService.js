/**
 * AI Guardrail Service - Intelligent Intention Verification & Context Protection
 * 
 * Prevents AI mistakes that lose customers by verifying context and intentions
 * before providing responses in both Public and Registered tiers
 */

console.log('🛡️ [AI Guardrails] Service loading...');

class AIGuardrailService {
  constructor() {
    this.guardrailRules = this.initializeGuardrailRules();
  }

  /**
   * Main guardrail verification - called before AI responds
   */
  async verifyUserIntention(query, userContext = {}, businessContext = {}) {
    console.log('🛡️ [AI Guardrails] Verifying user intention for:', query);
    
    const verifications = {
      locationVerification: await this.checkLocationContext(query, userContext),
      businessClarification: await this.ensureBusinessSpecific(query, businessContext),
      timeContextCheck: this.verifyTimeAndDate(query),
      expectationManagement: this.preventAssumptions(query),
      userHistoryAlignment: await this.checkUserPatterns(query, userContext),
      policyAwareness: await this.verifyBusinessPolicies(query, businessContext),
      riskAssessment: await this.assessRisks(query, userContext)
    };

    const issues = this.identifyIssues(verifications);
    
    return {
      needsVerification: issues.length > 0,
      issues: issues,
      verifications: verifications,
      suggestedResponse: issues.length > 0 ? this.generateVerificationResponse(issues, query) : null
    };
  }

  // =========================
  // PUBLIC TIER GUARDRAILS
  // =========================

  async checkLocationContext(query, userContext) {
    const locationKeywords = ['open', 'hours', 'parking', 'address', 'directions', 'near'];
    const businessNames = this.extractBusinessNames(query);
    
    const issues = [];
    
    // Check if user asks location-specific questions without specifying location
    if (locationKeywords.some(keyword => query.toLowerCase().includes(keyword))) {
      if (!businessNames.length && !this.hasLocationSpecified(query)) {
        issues.push({
          type: 'location_unclear',
          message: "Which business and location are you asking about? Melbourne has multiple locations for many businesses.",
          suggestion: "Please specify: 'Spice Pavilion CBD' or 'Italian restaurant South Yarra'"
        });
      }
    }

    // Check for ambiguous location references
    if (query.toLowerCase().includes('you') && !userContext.isAuthenticated) {
      issues.push({
        type: 'business_confusion',
        message: "I'm Abrakadabra AI assistant. Are you asking about a specific business?",
        suggestion: "Try: 'What time does Spice Pavilion open?' or 'Does Thai Garden have parking?'"
      });
    }

    return { issues, hasLocationContext: businessNames.length > 0 };
  }

  async ensureBusinessSpecific(query, businessContext) {
    const genericQuestions = ['menu', 'prices', 'hours', 'booking', 'reservation', 'table'];
    const hasGenericQuestion = genericQuestions.some(q => query.toLowerCase().includes(q));
    
    const issues = [];
    
    if (hasGenericQuestion && !this.hasBusinessSpecified(query)) {
      issues.push({
        type: 'business_unclear',
        message: "Which restaurant are you asking about?",
        suggestion: "I can help better if you specify: 'Spice Pavilion menu' or 'book table at Thai Garden'"
      });
    }

    // Check for assumption traps
    if (query.toLowerCase().includes('do you') || query.toLowerCase().includes('are you')) {
      issues.push({
        type: 'assumption_trap',
        message: "I'm an AI assistant helping you find businesses. Which business are you interested in?",
        suggestion: "Try: 'Does Spice Pavilion have vegetarian options?' or 'Is Thai Garden open now?'"
      });
    }

    return { issues, businessSpecified: this.hasBusinessSpecified(query) };
  }

  verifyTimeAndDate(query) {
    const timeKeywords = ['today', 'tonight', 'tomorrow', 'weekend', 'now', 'open', 'hours'];
    const hasTimeReference = timeKeywords.some(keyword => query.toLowerCase().includes(keyword));
    
    const issues = [];
    const now = new Date();
    const currentHour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isHoliday = this.checkHolidays(now);

    if (hasTimeReference) {
      // Check for context that affects availability
      if (isHoliday) {
        issues.push({
          type: 'holiday_hours',
          message: `Today is ${isHoliday.name}. Business hours may be different.`,
          suggestion: "I'll check current holiday hours for you."
        });
      }

      // Late night queries
      if ((currentHour > 22 || currentHour < 6) && query.toLowerCase().includes('open')) {
        issues.push({
          type: 'late_hours',
          message: "It's quite late/early. Most restaurants are closed now.",
          suggestion: "Would you like me to check what's open 24/7 or show tomorrow's availability?"
        });
      }

      // Weekend context
      if (isWeekend && query.toLowerCase().includes('book')) {
        issues.push({
          type: 'weekend_booking',
          message: "Weekend bookings fill up fast. Should I show immediate availability or help you book ahead?",
          suggestion: null
        });
      }
    }

    return { issues, hasTimeContext: hasTimeReference };
  }

  preventAssumptions(query) {
    const issues = [];
    const vaguePhrases = ['best', 'good', 'nice', 'decent', 'popular', 'famous'];
    
    if (vaguePhrases.some(phrase => query.toLowerCase().includes(phrase))) {
      issues.push({
        type: 'vague_preference',
        message: "I'd love to help you find great options! What makes it 'best' for you?",
        suggestion: "Consider: cuisine type, price range, atmosphere, location, or specific dishes?"
      });
    }

    // Check for incomplete booking intentions
    if (query.toLowerCase().includes('book') && !this.hasBookingDetails(query)) {
      issues.push({
        type: 'incomplete_booking',
        message: "I can help you book! I'll need a few details:",
        suggestion: "• Which restaurant?\n• What date and time?\n• How many people?\n• Any special requirements?"
      });
    }

    return { issues };
  }

  // =========================
  // REGISTERED TIER GUARDRAILS  
  // =========================

  async checkUserPatterns(query, userContext) {
    if (!userContext.isAuthenticated) return { issues: [] };

    const issues = [];
    const userHistory = userContext.bookingHistory || [];
    const userPreferences = userContext.preferences || {};

    // Pattern change detection
    if (query.toLowerCase().includes('book')) {
      const usualCuisine = this.getMostFrequentCuisine(userHistory);
      const requestedCuisine = this.extractCuisineFromQuery(query);
      
      if (requestedCuisine && requestedCuisine !== usualCuisine) {
        issues.push({
          type: 'cuisine_change',
          message: `I notice you usually enjoy ${usualCuisine} food. Trying something new, or would you like ${usualCuisine} options too?`,
          suggestion: null
        });
      }

      // Party size changes
      const usualPartySize = this.getAveragePartySize(userHistory);
      const requestedSize = this.extractPartySizeFromQuery(query);
      
      if (requestedSize && Math.abs(requestedSize - usualPartySize) > 2) {
        issues.push({
          type: 'party_size_change',
          message: `You usually book for ${usualPartySize} people. Is this a special occasion?`,
          suggestion: "Should I check if high chairs or special seating arrangements are needed?"
        });
      }

      // Location pattern changes
      if (userContext.currentLocation && userContext.currentLocation !== userContext.usualLocation) {
        issues.push({
          type: 'location_change',
          message: `I notice you're in ${userContext.currentLocation} today, not your usual ${userContext.usualLocation}.`,
          suggestion: "Looking for restaurants here, or back in your usual area?"
        });
      }
    }

    return { issues };
  }

  async verifyBusinessPolicies(query, businessContext) {
    const issues = [];
    
    if (query.toLowerCase().includes('cancel')) {
      const timeUntilBooking = this.calculateTimeUntilBooking(businessContext.nextBooking);
      
      if (timeUntilBooking < 2) { // Less than 2 hours
        issues.push({
          type: 'cancellation_policy',
          message: "Your booking is in less than 2 hours. Cancelling now may incur fees.",
          suggestion: "Would you prefer to reschedule instead? Or should I check the cancellation policy?"
        });
      }
    }

    if (query.toLowerCase().includes('modify') || query.toLowerCase().includes('change')) {
      issues.push({
        type: 'modification_check',
        message: "I can help modify your booking. What would you like to change?",
        suggestion: "• Date/time\n• Party size\n• Special requests\n• Contact details"
      });
    }

    return { issues };
  }

  async assessRisks(query, userContext) {
    const issues = [];
    
    if (userContext.isAuthenticated) {
      // Payment method checks
      if (query.toLowerCase().includes('book') && userContext.paymentMethods) {
        const primaryCard = userContext.paymentMethods.find(pm => pm.isPrimary);
        if (primaryCard && this.isCardExpiringSoon(primaryCard.expiryDate)) {
          issues.push({
            type: 'payment_expiry',
            message: `Your primary card ending in ${primaryCard.lastFour} expires soon.`,
            suggestion: "Should I update payment details before booking?"
          });
        }
      }

      // No-show pattern detection
      const recentNoShows = userContext.bookingHistory?.filter(b => 
        b.status === 'no-show' && this.isRecentBooking(b.date)
      ).length || 0;

      if (recentNoShows > 0 && query.toLowerCase().includes('book')) {
        issues.push({
          type: 'no_show_pattern',
          message: "I'll add extra reminders for this booking to ensure you don't miss it.",
          suggestion: "Would you like SMS and email reminders 2 hours before?"
        });
      }

      // Rapid booking changes
      const recentChanges = userContext.bookingHistory?.filter(b => 
        b.modifications && b.modifications.length > 2
      ).length || 0;

      if (recentChanges > 2 && query.toLowerCase().includes('book')) {
        issues.push({
          type: 'booking_stability',
          message: "I notice you've made several booking changes recently.",
          suggestion: "Would you like me to find restaurants with flexible cancellation policies?"
        });
      }
    }

    return { issues };
  }

  // =========================
  // HELPER METHODS
  // =========================

  identifyIssues(verifications) {
    const allIssues = [];
    
    Object.values(verifications).forEach(verification => {
      if (verification.issues) {
        allIssues.push(...verification.issues);
      }
    });

    return allIssues;
  }

  generateVerificationResponse(issues, originalQuery) {
    const highPriorityIssues = issues.filter(issue => 
      ['business_unclear', 'location_unclear', 'incomplete_booking'].includes(issue.type)
    );

    const contextualIssues = issues.filter(issue => 
      ['holiday_hours', 'payment_expiry', 'cancellation_policy'].includes(issue.type)
    );

    let response = "🧞‍♂️ **Let me help you better!**\n\n";

    if (highPriorityIssues.length > 0) {
      response += "**I need a bit more information:**\n";
      highPriorityIssues.forEach(issue => {
        response += `• ${issue.message}\n`;
        if (issue.suggestion) {
          response += `  💡 ${issue.suggestion}\n`;
        }
      });
      response += "\n";
    }

    if (contextualIssues.length > 0) {
      response += "**Important context to consider:**\n";
      contextualIssues.forEach(issue => {
        response += `• ${issue.message}\n`;
        if (issue.suggestion) {
          response += `  ➡️ ${issue.suggestion}\n`;
        }
      });
      response += "\n";
    }

    response += "**Once I have these details, I can give you exactly what you need!** ✨";

    return response;
  }

  // Business name extraction
  extractBusinessNames(query) {
    const commonBusinessWords = ['restaurant', 'cafe', 'bistro', 'kitchen', 'palace', 'pavilion', 'garden', 'house'];
    const words = query.toLowerCase().split(' ');
    const businessNames = [];

    // Look for capitalized words that might be business names
    const originalWords = query.split(' ');
    for (let i = 0; i < originalWords.length; i++) {
      if (originalWords[i][0] && originalWords[i][0] === originalWords[i][0].toUpperCase()) {
        businessNames.push(originalWords[i]);
      }
    }

    // Look for common business name patterns
    commonBusinessWords.forEach(businessWord => {
      if (words.includes(businessWord)) {
        const index = words.indexOf(businessWord);
        if (index > 0) {
          businessNames.push(words[index - 1] + ' ' + businessWord);
        }
      }
    });

    return businessNames;
  }

  hasLocationSpecified(query) {
    const locations = ['cbd', 'city', 'south yarra', 'fitzroy', 'brunswick', 'richmond', 'melbourne'];
    return locations.some(loc => query.toLowerCase().includes(loc));
  }

  hasBusinessSpecified(query) {
    return this.extractBusinessNames(query).length > 0 || 
           query.toLowerCase().includes('spice') ||
           query.toLowerCase().includes('pavilion') ||
           query.toLowerCase().includes('thai') ||
           query.toLowerCase().includes('italian');
  }

  hasBookingDetails(query) {
    const hasDate = /\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2})\b/i.test(query);
    const hasTime = /\b(\d{1,2}:\d{2}|\d{1,2}\s?(am|pm)|morning|afternoon|evening|lunch|dinner)\b/i.test(query);
    const hasPartySize = /\b(\d+\s?(people|person|pax)|for\s?\d+)\b/i.test(query);
    
    return hasDate || hasTime || hasPartySize;
  }

  checkHolidays(date) {
    const holidays = {
      '01-01': { name: 'New Year\'s Day' },
      '01-26': { name: 'Australia Day' },
      '12-25': { name: 'Christmas Day' },
      '12-26': { name: 'Boxing Day' }
    };
    
    const dateKey = date.toISOString().slice(5, 10);
    return holidays[dateKey] || null;
  }

  getMostFrequentCuisine(bookingHistory) {
    if (!bookingHistory.length) return null;
    
    const cuisineCounts = {};
    bookingHistory.forEach(booking => {
      const cuisine = booking.cuisine || 'general';
      cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
    });
    
    return Object.keys(cuisineCounts).reduce((a, b) => 
      cuisineCounts[a] > cuisineCounts[b] ? a : b
    );
  }

  getAveragePartySize(bookingHistory) {
    if (!bookingHistory.length) return 2;
    
    const totalSize = bookingHistory.reduce((sum, booking) => 
      sum + (booking.partySize || 2), 0
    );
    
    return Math.round(totalSize / bookingHistory.length);
  }

  extractCuisineFromQuery(query) {
    const cuisines = ['italian', 'chinese', 'thai', 'indian', 'japanese', 'mexican', 'vietnamese'];
    return cuisines.find(cuisine => query.toLowerCase().includes(cuisine));
  }

  extractPartySizeFromQuery(query) {
    const match = query.match(/\b(\d+)\s?(people|person|pax)\b/i) || query.match(/\bfor\s?(\d+)\b/i);
    return match ? parseInt(match[1]) : null;
  }

  calculateTimeUntilBooking(nextBooking) {
    if (!nextBooking) return Infinity;
    
    const bookingTime = new Date(nextBooking.dateTime);
    const now = new Date();
    return (bookingTime - now) / (1000 * 60 * 60); // Hours
  }

  isCardExpiringSoon(expiryDate) {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const monthsUntilExpiry = (expiry - now) / (1000 * 60 * 60 * 24 * 30);
    return monthsUntilExpiry < 1; // Less than 1 month
  }

  isRecentBooking(bookingDate) {
    const booking = new Date(bookingDate);
    const now = new Date();
    const daysAgo = (now - booking) / (1000 * 60 * 60 * 24);
    return daysAgo < 30; // Within last 30 days
  }

  initializeGuardrailRules() {
    return {
      publicTier: {
        requireBusinessSpecification: ['menu', 'hours', 'booking', 'prices'],
        requireLocationContext: ['directions', 'parking', 'nearby'],
        preventAssumptions: ['best', 'good', 'you have']
      },
      registeredTier: {
        checkPaymentMethods: ['book', 'reserve', 'order'],
        verifyPatternChanges: ['book', 'cancel', 'modify'],
        assessRisks: ['book', 'cancel', 'pay']
      }
    };
  }
}

export const aiGuardrails = new AIGuardrailService();
console.log('🛡️ [AI Guardrails] Service ready with intelligent verification!');