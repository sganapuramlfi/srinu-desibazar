/**
 * AI Booking Intelligence Service
 * 
 * Provides smart booking insights, availability predictions,
 * and personalized recommendations for AbrakadabraAI
 * 
 * Features:
 * - Real-time availability insights
 * - Optimal booking time suggestions  
 * - Industry-specific booking tips
 * - Conflict resolution and alternatives
 * - Personalized preferences learning
 */

class AIBookingIntelligence {
  
  constructor() {
    // Booking patterns by industry
    this.industryPatterns = {
      restaurant: {
        peakHours: ['12:00-14:00', '19:00-21:00'],
        optimalBookingWindow: 120, // minutes in advance
        averageStayDuration: 90,
        busyDays: ['friday', 'saturday'],
        quietDays: ['monday', 'tuesday']
      },
      salon: {
        peakHours: ['10:00-12:00', '14:00-17:00'],
        optimalBookingWindow: 10080, // 1 week in advance
        averageServiceDuration: 60,
        busyDays: ['friday', 'saturday'],
        quietDays: ['monday', 'wednesday']
      },
      spa: {
        peakHours: ['11:00-15:00'],
        optimalBookingWindow: 20160, // 2 weeks in advance
        averageServiceDuration: 90,
        busyDays: ['saturday', 'sunday'],
        quietDays: ['tuesday', 'wednesday']
      }
    };
    
    // Time-based insights
    this.timeInsights = {
      morning: { mood: 'energetic', recommended: ['fitness', 'hair'], avoid: ['heavy meals'] },
      afternoon: { mood: 'productive', recommended: ['business lunch', 'meetings'], avoid: ['spa'] },
      evening: { mood: 'social', recommended: ['dinner', 'entertainment'], avoid: ['fitness'] },
      weekend: { mood: 'relaxed', recommended: ['spa', 'family dining'], avoid: ['quick service'] }
    };
  }

  /**
   * Analyze booking intent and provide intelligent recommendations
   */
  async analyzeBookingIntent(query, businesses, userContext = {}) {
    const analysis = {
      intent: this.parseBookingIntent(query),
      timing: this.analyzeTimingPreferences(query),
      party: this.analyzePartyDetails(query),
      preferences: this.extractPreferences(query),
      urgency: this.assessUrgency(query)
    };

    const recommendations = await this.generateIntelligentRecommendations(
      businesses, 
      analysis, 
      userContext
    );

    return {
      analysis,
      recommendations,
      insights: this.generateBookingInsights(businesses, analysis),
      tips: this.generateBookingTips(businesses[0], analysis)
    };
  }

  /**
   * Parse specific booking intent from user query
   */
  parseBookingIntent(query) {
    const queryLower = query.toLowerCase();
    
    const intents = {
      immediate: /\b(now|asap|tonight|today|right now|immediately)\b/i,
      future: /\b(tomorrow|next week|weekend|friday|saturday|sunday)\b/i,
      flexible: /\b(sometime|flexible|whenever|any time|open)\b/i,
      specific: /\b(\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)|\d{1,2}\s*o'clock)\b/i,
      occasion: /\b(birthday|anniversary|date|celebration|business|meeting)\b/i
    };

    const detected = {};
    for (const [type, pattern] of Object.entries(intents)) {
      if (pattern.test(queryLower)) {
        detected[type] = queryLower.match(pattern)[0];
      }
    }

    return {
      type: Object.keys(detected)[0] || 'general',
      details: detected,
      confidence: Object.keys(detected).length > 0 ? 0.8 : 0.3
    };
  }

  /**
   * Analyze timing preferences from query
   */
  analyzeTimingPreferences(query) {
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    // Time-specific patterns
    const timePatterns = {
      lunch: /\b(lunch|midday|noon|12|1pm)\b/i,
      dinner: /\b(dinner|evening|night|7|8|9pm)\b/i,
      breakfast: /\b(breakfast|morning|brunch|9|10am)\b/i,
      late: /\b(late|after 9|after 8|night out)\b/i
    };

    const timePreference = Object.entries(timePatterns)
      .find(([, pattern]) => pattern.test(query.toLowerCase()))?.[0] || 'flexible';

    return {
      preference: timePreference,
      currentContext: this.getCurrentTimeContext(currentHour, currentDay),
      suggestedTimes: this.suggestOptimalTimes(timePreference, currentHour)
    };
  }

  /**
   * Extract party size and composition from query
   */
  analyzePartyDetails(query) {
    const partyPatterns = {
      size: /(\d+)\s*(?:people|person|guests?|diners?|of us)/i,
      couple: /\b(couple|two of us|date|romantic|me and my)\b/i,
      family: /\b(family|kids|children|baby|toddler|elderly)/i,
      business: /\b(business|meeting|colleagues|clients|work)/i,
      large: /\b(large group|big table|party of|celebration)/i
    };

    const detected = {};
    for (const [type, pattern] of Object.entries(partyPatterns)) {
      const match = query.match(pattern);
      if (match) {
        detected[type] = type === 'size' ? parseInt(match[1]) : true;
      }
    }

    return {
      size: detected.size || (detected.couple ? 2 : null),
      type: detected.family ? 'family' : detected.business ? 'business' : 
            detected.large ? 'large' : detected.couple ? 'couple' : 'casual',
      specialNeeds: this.identifySpecialNeeds(query)
    };
  }

  /**
   * Generate intelligent business recommendations with booking insights
   */
  async generateIntelligentRecommendations(businesses, analysis, userContext) {
    const recommendations = [];

    for (const business of businesses.slice(0, 5)) {
      const bookingInsight = await this.generateBusinessBookingInsight(business, analysis);
      const availabilityPrediction = this.predictAvailability(business, analysis.timing);
      const personalizedScore = this.calculatePersonalizedScore(business, analysis, userContext);

      recommendations.push({
        ...business,
        bookingInsight,
        availabilityPrediction,
        personalizedScore,
        aiRecommendation: this.generateAIRecommendation(business, analysis),
        bookingTips: this.generateSpecificBookingTips(business, analysis)
      });
    }

    // Sort by AI-enhanced relevance score
    recommendations.sort((a, b) => {
      const scoreA = (a._vectorScore || 0) + (a.personalizedScore * 10);
      const scoreB = (b._vectorScore || 0) + (b.personalizedScore * 10);
      return scoreB - scoreA;
    });

    return recommendations;
  }

  /**
   * Generate specific booking insight for a business
   */
  async generateBusinessBookingInsight(business, analysis) {
    const industryPattern = this.industryPatterns[business.industryType] || this.industryPatterns.restaurant;
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();

    let insight = '';
    let availability = 'moderate';

    // Peak time analysis
    const isPeakTime = industryPattern.peakHours.some(range => {
      const [start, end] = range.split('-').map(time => parseInt(time.split(':')[0]));
      return currentHour >= start && currentHour <= end;
    });

    // Day analysis
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const isQuietDay = industryPattern.quietDays.includes(dayNames[currentDay]);
    const isBusyDay = industryPattern.busyDays.includes(dayNames[currentDay]);

    if (analysis.intent.type === 'immediate') {
      if (isPeakTime && isBusyDay) {
        insight = '⚡ High demand right now - book quickly or consider off-peak alternatives';
        availability = 'limited';
      } else if (isQuietDay) {
        insight = '✨ Great timing! Quieter period means better availability';
        availability = 'good';
      } else {
        insight = '📱 Good chance of availability - worth checking now';
        availability = 'moderate';
      }
    } else {
      if (business.industryType === 'restaurant') {
        insight = '🍽️ Table reservations recommended 1-2 hours ahead for best selection';
      } else if (business.industryType === 'salon') {
        insight = '💇‍♀️ Popular stylists book up 1-2 weeks ahead - early booking advised';
      } else if (business.industryType === 'spa') {
        insight = '🧘‍♀️ Spa treatments are most relaxing with 2-3 weeks advance booking';
      }
    }

    return {
      text: insight,
      availability,
      confidence: 0.7,
      factors: { isPeakTime, isQuietDay, isBusyDay }
    };
  }

  /**
   * Predict availability based on patterns
   */
  predictAvailability(business, timingAnalysis) {
    const industryPattern = this.industryPatterns[business.industryType] || this.industryPatterns.restaurant;
    
    // Simple availability prediction algorithm
    let availabilityScore = 0.5; // baseline
    
    if (timingAnalysis.currentContext.period === 'off-peak') {
      availabilityScore += 0.3;
    }
    
    if (timingAnalysis.preference === 'lunch' && business.industryType === 'restaurant') {
      availabilityScore -= 0.2; // lunch is usually busy
    }
    
    if (timingAnalysis.preference === 'dinner' && business.industryType === 'restaurant') {
      availabilityScore -= 0.3; // dinner is very busy
    }

    return {
      score: Math.max(0.1, Math.min(0.9, availabilityScore)),
      prediction: availabilityScore > 0.6 ? 'good' : availabilityScore > 0.3 ? 'moderate' : 'limited',
      nextBestTime: this.suggestAlternativeTime(business, timingAnalysis)
    };
  }

  /**
   * Generate AI recommendation text
   */
  generateAIRecommendation(business, analysis) {
    const reasons = [];
    
    if (business._vectorScore > 30) {
      reasons.push('🎯 Perfect match for your search');
    }
    
    if (analysis.party.type === 'family' && business.amenities?.includes('family_friendly')) {
      reasons.push('👨‍👩‍👧‍👦 Family-friendly atmosphere');
    }
    
    if (analysis.party.type === 'business' && business.amenities?.includes('wifi')) {
      reasons.push('💼 Great for business meetings');
    }
    
    if (analysis.timing.preference === 'romantic' && business.industryType === 'restaurant') {
      reasons.push('💕 Perfect for date nights');
    }

    return reasons.length > 0 ? reasons.join(' • ') : '⭐ Highly recommended based on your preferences';
  }

  /**
   * Generate booking insights for display
   */
  generateBookingInsights(businesses, analysis) {
    const insights = [];
    
    if (analysis.intent.type === 'immediate') {
      insights.push('⚡ **Immediate Booking Tips:**');
      insights.push('• Call ahead for fastest confirmation');
      insights.push('• Consider nearby alternatives if fully booked');
      insights.push('• Walk-ins sometimes available during off-peak');
    } else {
      insights.push('📅 **Smart Booking Strategy:**');
      insights.push('• Book 1-2 days ahead for restaurants');
      insights.push('• Book 1-2 weeks ahead for salons');
      insights.push('• Weekend slots fill up faster');
    }

    if (analysis.party.size >= 6) {
      insights.push('');
      insights.push('👥 **Large Party Tips:**');
      insights.push('• Call directly for groups of 6+');
      insights.push('• Consider set menus for easier service');
      insights.push('• Book at least 48 hours in advance');
    }

    return insights;
  }

  /**
   * Generate specific booking tips for a business
   */
  generateSpecificBookingTips(business, analysis) {
    const tips = [];
    
    if (business.industryType === 'restaurant') {
      if (analysis.timing.preference === 'dinner') {
        tips.push('🍽️ Dinner reservations recommended - peak time');
      }
      if (analysis.party.size >= 4) {
        tips.push('👥 Large tables require advance booking');
      }
    } else if (business.industryType === 'salon') {
      tips.push('✂️ Popular stylists book weeks ahead');
      tips.push('💡 Tuesday-Thursday typically have better availability');
    }

    return tips;
  }

  /**
   * Helper methods
   */
  getCurrentTimeContext(hour, day) {
    let period = 'regular';
    if (hour >= 11 && hour <= 14) period = 'lunch-peak';
    else if (hour >= 18 && hour <= 21) period = 'dinner-peak';
    else if (hour >= 9 && hour <= 11) period = 'morning';
    else if (hour >= 22 || hour <= 8) period = 'off-peak';

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const isWeekend = day === 0 || day === 6;

    return { period, day: dayNames[day], isWeekend };
  }

  suggestOptimalTimes(preference, currentHour) {
    const suggestions = {
      lunch: ['12:00', '12:30', '13:00'],
      dinner: ['18:30', '19:00', '19:30'],
      breakfast: ['09:00', '09:30', '10:00'],
      flexible: ['12:30', '19:00', '20:00']
    };
    
    return suggestions[preference] || suggestions.flexible;
  }

  identifySpecialNeeds(query) {
    const needs = [];
    
    if (/wheelchair|accessible|disability/i.test(query)) {
      needs.push('wheelchair_accessible');
    }
    if (/kids|children|baby|high chair/i.test(query)) {
      needs.push('child_friendly');
    }
    if (/quiet|peaceful|intimate/i.test(query)) {
      needs.push('quiet_seating');
    }
    if (/vegan|vegetarian|gluten/i.test(query)) {
      needs.push('dietary_options');
    }
    
    return needs;
  }

  assessUrgency(query) {
    if (/urgent|asap|now|immediately|tonight|today/i.test(query)) {
      return 'high';
    }
    if (/soon|this week|couple days/i.test(query)) {
      return 'medium';
    }
    return 'low';
  }

  calculatePersonalizedScore(business, analysis, userContext) {
    let score = 0.5; // baseline
    
    // Boost score based on preferences match
    if (analysis.party.type === 'family' && business.amenities?.includes('family_friendly')) {
      score += 0.2;
    }
    
    if (analysis.timing.preference === 'business' && business.amenities?.includes('wifi')) {
      score += 0.15;
    }
    
    // Previous user preferences (if available)
    if (userContext.previousBookings) {
      const preferredIndustry = userContext.previousBookings
        .map(b => b.industryType)
        .find(type => type === business.industryType);
      if (preferredIndustry) score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  suggestAlternativeTime(business, timingAnalysis) {
    const industryPattern = this.industryPatterns[business.industryType] || this.industryPatterns.restaurant;
    
    // Suggest non-peak times as alternatives
    if (business.industryType === 'restaurant') {
      if (timingAnalysis.preference === 'dinner') {
        return ['17:30', '21:30']; // Early or late dinner
      } else if (timingAnalysis.preference === 'lunch') {
        return ['11:30', '14:30']; // Early or late lunch
      }
    }
    
    return ['11:00', '15:00', '17:00']; // General alternatives
  }

  generateBookingTips(topBusiness, analysis) {
    if (!topBusiness) return [];
    
    const tips = [
      '💡 **Pro Tips for Better Booking Success:**'
    ];
    
    if (topBusiness.industryType === 'restaurant') {
      tips.push('🍽️ Restaurants: Mention special occasions for better table placement');
      tips.push('📞 Call during off-peak hours (2-5 PM) for better service');
    } else if (topBusiness.industryType === 'salon') {
      tips.push('✂️ Salons: Book consultations before major changes');
      tips.push('📅 Flexible dates give you access to best stylists');
    }
    
    if (analysis.urgency === 'high') {
      tips.push('⚡ For urgent bookings: Try calling directly - faster than online');
    }
    
    return tips;
  }
}

// Export singleton instance (ES module format)
const aiBookingIntelligence = new AIBookingIntelligence();
export default aiBookingIntelligence;