# Universal Constraint Framework Design
## Industry-Agnostic Booking System with Lifecycle Operations

**Status**: Design Phase  
**Phase**: C.2A - Universal Constraint Framework  
**Dependencies**: Restaurant Universal Booking Integration (Completed)  
**Target**: Support 12 industries with booking lifecycle operations  

---

## 🎯 DESIGN OBJECTIVES

### Primary Goals
1. **Industry Agnostic**: Single constraint system supporting all 12 industries
2. **Lifecycle Complete**: Handle cancellation, no-show, reschedule, payment operations
3. **Constraint Aware**: Validate business rules specific to each industry
4. **Scalable Architecture**: Support future industries without code changes
5. **Real-World Ready**: Handle complex business scenarios

### Key Features
- ✅ **Polymorphic Constraints**: Different rules per industry
- ✅ **Booking Lifecycle**: Full booking operation support
- ✅ **Payment Integration**: Support "pay at shop" now, gateway later
- ✅ **Policy Engine**: Configurable cancellation and reschedule policies
- ✅ **Conflict Prevention**: Smart overlap detection across industries

---

## 🏗️ ARCHITECTURE OVERVIEW

### Core Components

```typescript
// 1. Constraint Engine
interface UniversalConstraint {
  id: string;
  industryType: IndustryType;
  constraintType: ConstraintType;
  rules: ConstraintRules;
  priority: number;
  isActive: boolean;
}

// 2. Booking Lifecycle
interface BookingLifecycle {
  bookingId: number;
  operation: LifecycleOperation; // create, cancel, reschedule, no_show, complete
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
  constraints: ConstraintValidation[];
  metadata: Record<string, any>;
}

// 3. Industry-Specific Slot Logic
interface SlotEngine {
  industryType: IndustryType;
  validateAvailability: (booking: BookingRequest) => Promise<ValidationResult>;
  generateSlots: (business: Business, dateRange: DateRange) => Promise<TimeSlot[]>;
  handleConflicts: (existing: Booking[], newBooking: BookingRequest) => ConflictResolution;
}
```

---

## 📊 CONSTRAINT TYPES BY INDUSTRY

### Current 6 Industries + Future 6

#### **1. SALON** (Current)
```typescript
const salonConstraints: IndustryConstraints = {
  staff: {
    required: true,
    skillMatching: true,
    simultaneousBookings: "staff-dependent", // 1 stylist = 1 booking
    workingHours: "business-hours",
    breaks: "auto-schedule"
  },
  equipment: {
    required: ["chair", "tools"],
    availability: "first-come-first-served",
    maintenance: "block-schedule"
  },
  timing: {
    minDuration: 30, // minutes
    maxDuration: 480, // 8 hours
    bufferTime: 15, // cleanup between clients
    advanceBooking: 30 // days
  },
  cancellation: {
    freeUntil: 24, // hours before
    feePercentage: 50, // 50% fee if cancelled within 24h
    noShowFee: 100 // full charge for no-show
  },
  reschedule: {
    allowedUntil: 24, // hours before
    maxReschedules: 2,
    feeAfterLimit: 10 // $10 reschedule fee
  }
}
```

#### **2. RESTAURANT** (Current)
```typescript
const restaurantConstraints: IndustryConstraints = {
  capacity: {
    type: "table-based",
    overbooking: false, // strict table capacity
    partySize: "flexible", // can combine/split tables
    durationEstimate: 120 // 2 hours average
  },
  timing: {
    minDuration: 60, // 1 hour minimum
    maxDuration: 240, // 4 hours maximum
    bufferTime: 30, // table reset time
    advanceBooking: 14 // days
  },
  availability: {
    pattern: "time-slots", // no staff dependency
    operatingHours: "restaurant-schedule",
    holidayRules: "custom-schedule"
  },
  cancellation: {
    freeUntil: 2, // hours before (same day)
    feePercentage: 0, // no fee for restaurant bookings
    noShowFee: 0, // track but don't charge
    blockFutureBookings: true // block repeat no-shows
  },
  reschedule: {
    allowedUntil: 2, // hours before
    maxReschedules: 3,
    feeAfterLimit: 0
  }
}
```

#### **3. EVENT** (Current)
```typescript
const eventConstraints: IndustryConstraints = {
  venue: {
    exclusivity: true, // one event per venue per time
    setupTime: 120, // 2 hours setup before
    cleanupTime: 60, // 1 hour cleanup after
    capacityLimits: "strict"
  },
  staffing: {
    required: ["coordinator", "security", "catering"],
    ratios: { security: "1per100guests", catering: "1per50guests" },
    minimumNotice: 168 // 1 week for staff booking
  },
  timing: {
    minDuration: 240, // 4 hours minimum
    maxDuration: 1440, // 24 hours maximum
    bufferTime: 180, // 3 hours between events
    advanceBooking: 365 // 1 year advance
  },
  cancellation: {
    freeUntil: 168, // 1 week before
    feeStructure: "sliding", // 25% (1week), 50% (72h), 75% (24h), 100% (same day)
    noShowFee: 100
  },
  reschedule: {
    allowedUntil: 168, // 1 week before
    maxReschedules: 1, // events are complex to reschedule
    feeAfterLimit: 100 // significant reschedule fee
  }
}
```

#### **4. REAL ESTATE** (Current)
```typescript
const realEstateConstraints: IndustryConstraints = {
  agent: {
    required: true,
    specialization: "property-type-matching",
    simultaneousBookings: 1, // one viewing per agent per time
    travelTime: "location-dependent" // 30min buffer between distant properties
  },
  property: {
    availability: "owner-dependent",
    accessRules: "tenant-aware", // vacant vs occupied
    keyCollection: "prior-arrangement",
    duration: "flexible" // 30min to 2 hours
  },
  timing: {
    minDuration: 30,
    maxDuration: 120,
    bufferTime: 30, // travel between properties
    advanceBooking: 7 // days
  },
  cancellation: {
    freeUntil: 4, // hours before
    feePercentage: 0, // no fee but track reliability
    noShowFee: 0,
    qualificationImpact: true // affects buyer qualification
  },
  reschedule: {
    allowedUntil: 4,
    maxReschedules: 5, // high reschedule tolerance
    feeAfterLimit: 0
  }
}
```

#### **5. RETAIL** (Current)
```typescript
const retailConstraints: IndustryConstraints = {
  appointment: {
    type: "personal-shopping", // styling, consultation, fitting
    staffRequired: true,
    roomRequired: "fitting-room",
    inventory: "availability-dependent"
  },
  capacity: {
    type: "slot-based",
    overbooking: "limited", // 10% overbooking allowed
    simultaneousClients: 3 // per personal shopper
  },
  timing: {
    minDuration: 45,
    maxDuration: 180,
    bufferTime: 15,
    advanceBooking: 14
  },
  cancellation: {
    freeUntil: 4,
    feePercentage: 0, // retail focuses on customer service
    noShowFee: 0,
    trackReliability: true
  },
  reschedule: {
    allowedUntil: 4,
    maxReschedules: 3,
    feeAfterLimit: 0
  }
}
```

#### **6. PROFESSIONAL** (Current)
```typescript
const professionalConstraints: IndustryConstraints = {
  practitioner: {
    required: true,
    specialization: "service-specific",
    simultaneousBookings: 1,
    qualifications: "verified",
    clientHistory: "tracked"
  },
  consultation: {
    type: "time-based",
    preparation: 15, // prep time before
    documentation: 15, // notes after
    followUp: "scheduled-separately"
  },
  timing: {
    minDuration: 30,
    maxDuration: 240,
    bufferTime: 15,
    advanceBooking: 21 // 3 weeks
  },
  cancellation: {
    freeUntil: 24,
    feePercentage: 50, // professional time is valuable
    noShowFee: 100,
    repeatOffenderPolicy: true
  },
  reschedule: {
    allowedUntil: 24,
    maxReschedules: 2,
    feeAfterLimit: 25
  }
}
```

---

## 🔮 FUTURE 6 INDUSTRIES

#### **7. HEALTHCARE** (Future)
```typescript
const healthcareConstraints: IndustryConstraints = {
  provider: {
    required: true,
    licensing: "verified",
    specialization: "strict-matching",
    patientLoad: "regulated",
    emergencyOverride: true
  },
  compliance: {
    hipaa: "full-compliance",
    documentation: "mandatory",
    insurance: "pre-verification",
    referrals: "tracked"
  },
  timing: {
    minDuration: 15, // quick checkups
    maxDuration: 480, // procedures
    bufferTime: 10, // room cleaning
    advanceBooking: 90 // 3 months
  },
  cancellation: {
    freeUntil: 24,
    feePercentage: 25, // healthcare-specific fee
    noShowFee: 50,
    emergencyException: true
  },
  urgency: {
    emergency: "immediate",
    urgent: "same-day",
    routine: "advance-booking"
  }
}
```

#### **8. FITNESS** (Future)
```typescript
const fitnessConstraints: IndustryConstraints = {
  capacity: {
    type: "class-based",
    maxParticipants: "equipment-dependent",
    overbooking: "waitlist-system",
    dropIn: "limited-availability"
  },
  instructor: {
    required: true,
    specialization: "class-type",
    certification: "verified",
    substituteProtocol: "automatic"
  },
  equipment: {
    availability: "class-dependent",
    maintenance: "scheduled-downtime",
    sanitization: "between-sessions"
  },
  membership: {
    type: "tiered-access",
    classCredits: "session-based",
    unlimited: "schedule-dependent"
  },
  timing: {
    minDuration: 30,
    maxDuration: 120,
    bufferTime: 15,
    advanceBooking: 7
  },
  cancellation: {
    freeUntil: 12, // hours before
    feePercentage: 0, // credit-based system
    creditLoss: 1, // lose 1 class credit
    noShowFee: 1 // lose 1 credit
  }
}
```

#### **9. AUTOMOTIVE** (Future)
```typescript
const automotiveConstraints: IndustryConstraints = {
  service: {
    type: "diagnostic-dependent", // time estimate after diagnosis
    bay: "equipment-specific",
    technician: "skill-matched",
    parts: "availability-dependent"
  },
  vehicle: {
    dropOff: "flexible-timing",
    pickUp: "estimated-completion",
    loaner: "availability-based",
    shuttle: "scheduled-service"
  },
  timing: {
    minDuration: 30,
    maxDuration: 480, // full day service
    bufferTime: 30, // bay cleanup
    advanceBooking: 30
  },
  emergency: {
    breakdown: "priority-scheduling",
    accident: "immediate-service",
    safety: "no-delay-policy"
  }
}
```

#### **10. HOME SERVICES** (Future)
```typescript
const homeServiceConstraints: IndustryConstraints = {
  technician: {
    required: true,
    licensing: "trade-specific",
    insurance: "verified",
    background: "checked",
    location: "service-area"
  },
  access: {
    homeOwnerPresence: "preferred",
    keyService: "available",
    petFriendly: "noted",
    parkingRequired: true
  },
  timing: {
    minDuration: 60,
    maxDuration: 480,
    travelBuffer: "distance-calculated",
    emergencyAvailable: true
  },
  weather: {
    outdoor: "weather-dependent",
    indoor: "all-weather",
    seasonal: "availability-varies"
  }
}
```

#### **11. EDUCATION** (Future)
```typescript
const educationConstraints: IndustryConstraints = {
  instructor: {
    required: true,
    qualifications: "subject-specific",
    capacity: "class-size-limits",
    preparation: "lesson-planning"
  },
  student: {
    ageGroup: "appropriate-matching",
    skillLevel: "assessment-based",
    prerequisites: "verified",
    groupDynamics: "considered"
  },
  resources: {
    materials: "lesson-specific",
    technology: "availability-dependent",
    space: "activity-appropriate"
  },
  timing: {
    minDuration: 30,
    maxDuration: 180,
    breaks: "age-appropriate",
    makeUp: "policy-based"
  }
}
```

#### **12. RECREATION** (Future)
```typescript
const recreationConstraints: IndustryConstraints = {
  activity: {
    type: "equipment-dependent",
    skillLevel: "safety-matched",
    weather: "condition-dependent",
    season: "availability-varies"
  },
  safety: {
    supervision: "activity-required",
    equipment: "safety-checked",
    insurance: "coverage-verified",
    emergencyProtocol: "established"
  },
  group: {
    minParticipants: "activity-dependent",
    maxParticipants: "safety-limited",
    ageRestrictions: "enforced",
    waivers: "required"
  },
  timing: {
    minDuration: 60,
    maxDuration: 480, // full day activities
    seasonalHours: "variable",
    weatherCancellation: "automatic"
  }
}
```

---

## 🔄 BOOKING LIFECYCLE OPERATIONS

### Core Operations Schema

```typescript
interface BookingOperation {
  // Primary Operations
  CREATE: {
    constraints: ['availability', 'capacity', 'advance_booking'],
    validations: ['customer_info', 'payment_method', 'business_rules'],
    sideEffects: ['calendar_block', 'staff_assignment', 'inventory_hold']
  },
  
  CANCEL: {
    constraints: ['cancellation_policy', 'minimum_notice', 'fee_calculation'],
    validations: ['auth_check', 'refund_eligibility', 'business_impact'],
    sideEffects: ['calendar_release', 'staff_unassign', 'inventory_release', 'notification_send']
  },
  
  RESCHEDULE: {
    constraints: ['reschedule_policy', 'availability_new_slot', 'maximum_reschedules'],
    validations: ['new_time_valid', 'staff_availability', 'fee_calculation'],
    sideEffects: ['calendar_move', 'staff_reassign', 'notification_send']
  },
  
  NO_SHOW: {
    constraints: ['grace_period', 'auto_cancel_time', 'penalty_policy'],
    validations: ['time_threshold', 'contact_attempts', 'business_rules'],
    sideEffects: ['status_update', 'penalty_apply', 'future_booking_restrictions']
  },
  
  COMPLETE: {
    constraints: ['service_completion', 'payment_processing', 'feedback_collection'],
    validations: ['time_bounds', 'service_delivered', 'payment_settled'],
    sideEffects: ['calendar_close', 'staff_release', 'review_eligibility', 'analytics_update']
  }
}
```

### Payment Integration

```typescript
interface PaymentConstraints {
  // Current: Pay at Shop
  payAtShop: {
    deposit: 'optional', // some industries require deposits
    fullPayment: 'on_service', // pay when service is delivered
    methods: ['cash', 'card', 'digital'],
    receipts: 'mandatory'
  },
  
  // Future: Payment Gateway
  paymentGateway: {
    preAuthorization: 'booking_creation', // hold funds
    capturePayment: 'service_completion', // charge when complete
    refundPolicy: 'industry_specific',
    partialPayments: 'installment_support'
  },
  
  // Hybrid Model
  mixed: {
    deposit: 'online_payment', // secure booking with deposit
    remainder: 'pay_at_shop', // balance paid on arrival
    noShowProtection: 'deposit_forfeiture'
  }
}
```

---

## 🎛️ CONSTRAINT VALIDATION ENGINE

### Validation Flow

```typescript
class ConstraintValidator {
  async validateBookingOperation(
    operation: BookingOperation,
    booking: BookingRequest,
    business: Business
  ): Promise<ValidationResult> {
    
    // 1. Get industry-specific constraints
    const constraints = await this.getIndustryConstraints(business.industryType);
    
    // 2. Apply universal constraints
    const universalResults = await this.validateUniversalConstraints(operation, booking);
    
    // 3. Apply industry-specific constraints
    const industryResults = await this.validateIndustryConstraints(constraints, operation, booking);
    
    // 4. Check business-custom rules
    const businessResults = await this.validateBusinessRules(business.customRules, operation, booking);
    
    // 5. Combine and prioritize results
    return this.combineValidationResults([universalResults, industryResults, businessResults]);
  }
}
```

### Constraint Priority System

```typescript
enum ConstraintPriority {
  CRITICAL = 1,    // Must pass (safety, legal, capacity)
  HIGH = 2,        // Should pass (business rules, policies)
  MEDIUM = 3,      // Could pass (preferences, optimization)
  LOW = 4          // Nice to pass (suggestions, upsells)
}

// Example: Restaurant table booking
const tableBookingConstraints = [
  { rule: 'table_availability', priority: CRITICAL },
  { rule: 'party_size_fits', priority: CRITICAL },
  { rule: 'operating_hours', priority: CRITICAL },
  { rule: 'advance_booking_limit', priority: HIGH },
  { rule: 'preferred_seating', priority: MEDIUM },
  { rule: 'loyalty_discount', priority: LOW }
];
```

---

## 🧪 TESTING STRATEGY

### Test Scenarios by Industry

```typescript
const testScenarios = {
  salon: {
    happyPath: 'Book haircut with preferred stylist',
    conflicts: 'Double booking same stylist',
    cancellation: 'Cancel within 24h policy window',
    noShow: 'Customer doesnt arrive, auto-penalty',
    reschedule: 'Move appointment due to emergency'
  },
  
  restaurant: {
    happyPath: 'Book table for 4 people dinner',
    conflicts: 'Overlapping table reservations',
    cancellation: 'Cancel same-day reservation',
    noShow: 'No-show tracking without penalty',
    reschedule: 'Change party size and time'
  },
  
  // ... similar for all 12 industries
};
```

---

## 📈 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Current Week)
- ✅ Constraint schema design
- ✅ Booking lifecycle operations
- 🔄 Universal validation engine
- 🔄 Restaurant constraint integration

### Phase 2: Industry Extensions (Next Week)
- 📅 Salon constraint implementation
- 📅 Event constraint implementation
- 📅 Real estate constraint implementation
- 📅 Retail and professional constraints

### Phase 3: Advanced Operations (Week 3)
- 📅 Payment constraint integration
- 📅 Cancellation policy engine
- 📅 Reschedule optimization
- 📅 No-show tracking system

### Phase 4: Future Industries (Week 4)
- 📅 Healthcare constraint framework
- 📅 Fitness and automotive constraints
- 📅 Home services and education
- 📅 Recreation constraint system

---

## 🎯 SUCCESS METRICS

### Technical Metrics
- **Constraint Coverage**: 100% of business rules covered
- **Validation Speed**: < 100ms constraint checking
- **Conflict Detection**: 0% double bookings
- **Operation Success**: > 99.5% booking operations complete

### Business Metrics
- **Customer Satisfaction**: Reduced booking confusion
- **Business Efficiency**: Automated policy enforcement
- **Revenue Protection**: Proper cancellation/no-show handling
- **Scalability**: Easy addition of new industries

---

This Universal Constraint Framework provides the foundation for industry-agnostic booking while respecting each industry's unique requirements. The next step is implementing the validation engine and testing it with our existing restaurant booking system.