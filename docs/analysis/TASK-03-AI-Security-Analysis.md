# TASK-03: AI Genie Security Context Analysis

## 🔄 CONTEXT CHECK
**Before starting**: Read CLAUDE.md header for current platform status
**Current State**: AI components exist but lack proper security framework
**Priority**: ⭐⭐⭐⭐⭐ (Security foundation)

## 🔒 SECURITY PROBLEM ANALYSIS

### Current AI Security Gaps
```typescript
// CURRENT INSECURE STATE:
// AbrakadabraAI components can access any data
// No permission system for AI operations
// Public visitors vs registered users treated same by AI
// No audit trail for AI actions
```

### Critical Security Risks
1. **Data Exposure**: AI could leak business data to wrong users
2. **Privilege Escalation**: AI operating with admin privileges
3. **No Audit Trail**: Cannot track what AI accessed/changed
4. **Cross-Business Data Leak**: AI might mix data between businesses
5. **Public Information Exposure**: AI might reveal private business info to public

## 🎯 AI SECURITY ARCHITECTURE SOLUTION

### User Role Enhancement
```typescript
// ENHANCED USER ROLES WITH AI CONTEXT
enum UserRole {
  // Existing roles
  VISITOR = "visitor",
  CUSTOMER = "customer", 
  BUSINESS_OWNER = "business",
  STAFF_MEMBER = "staff",
  ADMIN = "admin",
  
  // NEW AI SECURITY ROLES
  AI_GENIE_SURROGATE = "ai_surrogate",    // AI acting FOR a logged-in user
  AI_GENIE_HELPER = "ai_helper",          // AI helping anonymous visitors
  AI_SYSTEM = "ai_system"                 // Internal AI operations
}
```

### AI Security Context System
```typescript
interface AISecurityContext {
  // Identity & Role
  aiRole: UserRole.AI_GENIE_SURROGATE | UserRole.AI_GENIE_HELPER | UserRole.AI_SYSTEM;
  actualUser?: User;                      // The real user AI is helping (if surrogate)
  sessionId: string;                      // Unique AI session
  
  // Permissions & Access
  permissions: AIPermission[];            // What AI can do
  dataAccess: AIDataAccessLevel;          // What data AI can see
  businessScope?: number[];               // Which businesses AI can access
  
  // Security Controls
  maxInteractions: number;                // Prevent AI abuse
  expiresAt: Date;                       // Session timeout
  auditLog: AIAuditEntry[];              // Track all AI actions
  
  // Context & Purpose
  purpose: AISessionPurpose;             // Why AI session was created
  context: Record<string, any>;          // Session-specific data
}

enum AIPermission {
  // Data Access
  READ_PUBLIC_BUSINESS_INFO = "read_public_business_info",
  READ_USER_BUSINESS_DATA = "read_user_business_data",
  READ_BOOKING_DATA = "read_booking_data",
  
  // Actions
  SUGGEST_BOOKINGS = "suggest_bookings",
  SEARCH_BUSINESSES = "search_businesses",
  ANALYZE_TRENDS = "analyze_trends",
  SEND_NOTIFICATIONS = "send_notifications",
  
  // Administrative  
  SYSTEM_OPERATIONS = "system_operations",
  CROSS_BUSINESS_ANALYTICS = "cross_business_analytics"
}

enum AIDataAccessLevel {
  PUBLIC_ONLY = "public_only",           // Only public business info
  USER_SCOPED = "user_scoped",           // Only data user can see
  BUSINESS_SCOPED = "business_scoped",   // Only specific business data
  PLATFORM_WIDE = "platform_wide"       // All platform data (admin only)
}

enum AISessionPurpose {
  BUSINESS_DISCOVERY = "business_discovery",     // Help find businesses
  BOOKING_ASSISTANCE = "booking_assistance",    // Help with bookings
  BUSINESS_OPTIMIZATION = "business_optimization", // Business insights
  CUSTOMER_SUPPORT = "customer_support",        // General help
  SYSTEM_MAINTENANCE = "system_maintenance"     // Internal operations
}
```

### AI Session Management
```typescript
class AISecurityManager {
  
  // Create AI session for public visitor
  async createAIHelperSession(visitorId: string, purpose: AISessionPurpose): Promise<AISecurityContext> {
    return {
      aiRole: UserRole.AI_GENIE_HELPER,
      actualUser: undefined,
      sessionId: generateUUID(),
      permissions: [
        AIPermission.READ_PUBLIC_BUSINESS_INFO,
        AIPermission.SEARCH_BUSINESSES,
        AIPermission.SUGGEST_BOOKINGS
      ],
      dataAccess: AIDataAccessLevel.PUBLIC_ONLY,
      maxInteractions: 20,              // Limit for public users
      expiresAt: new Date(Date.now() + 1800000), // 30 minutes
      purpose,
      auditLog: [],
      context: { visitorId }
    };
  }
  
  // Create AI session for registered user (surrogate)
  async createAISurrogateSession(user: User, purpose: AISessionPurpose): Promise<AISecurityContext> {
    const subscription = await this.getSubscription(user.businessId);
    
    return {
      aiRole: UserRole.AI_GENIE_SURROGATE,
      actualUser: user,
      sessionId: generateUUID(),
      permissions: this.calculateUserAIPermissions(user, subscription),
      dataAccess: this.calculateDataAccess(user),
      businessScope: user.role === 'business' ? [user.businessId] : undefined,
      maxInteractions: this.getMaxInteractions(subscription),
      expiresAt: new Date(Date.now() + 3600000), // 1 hour for users
      purpose,
      auditLog: [],
      context: { userId: user.id, businessId: user.businessId }
    };
  }
  
  // Validate AI can perform action
  async validateAIAction(context: AISecurityContext, action: string, targetData: any): Promise<boolean> {
    // Check permissions
    if (!this.hasPermission(context, action)) {
      await this.logSecurityViolation(context, 'insufficient_permissions', action);
      return false;
    }
    
    // Check data access level
    if (!this.canAccessData(context, targetData)) {
      await this.logSecurityViolation(context, 'data_access_denied', action);
      return false;
    }
    
    // Check session limits
    if (this.isSessionExpired(context) || this.isMaxInteractionsExceeded(context)) {
      await this.logSecurityViolation(context, 'session_limit_exceeded', action);
      return false;
    }
    
    // Log successful action
    await this.logAIAction(context, action, targetData);
    return true;
  }
}
```

## 🔧 IMPLEMENTATION STRATEGY

### Phase 1: Core Security Framework (Day 1-2)
```typescript
// 1. Update user schema with AI roles
// 2. Create AISecurityContext table
// 3. Implement AISecurityManager class
// 4. Create AI session middleware
```

### Phase 2: Permission System (Day 2-3)  
```typescript
// 1. Define all AI permissions in database
// 2. Create permission calculation logic
// 3. Implement subscription-based AI limits
// 4. Add permission checking middleware
```

### Phase 3: Audit & Logging (Day 3-4)
```typescript
// 1. Create AI audit log table
// 2. Implement audit logging for all AI actions
// 3. Create security violation tracking
// 4. Add AI session monitoring dashboard
```

### Phase 4: Integration (Day 4-5)
```typescript
// 1. Update all AI components to use security context
// 2. Add security checks to AbrakadabraBookingMagic
// 3. Secure AI data access endpoints
// 4. Test security boundaries
```

### Phase 5: Frontend Security (Day 5)
```typescript
// 1. Update AI components to pass security context
// 2. Add user feedback for AI limitations
// 3. Implement secure AI session management
// 4. Add AI usage tracking for users
```

## 📋 DETAILED IMPLEMENTATION CHECKLIST

### Database Changes:
- [ ] Add AI roles to user_roles enum
- [ ] Create ai_security_contexts table
- [ ] Create ai_audit_logs table  
- [ ] Create ai_permissions table
- [ ] Add AI usage tracking to subscriptions

### Backend Implementation:
- [ ] Implement AISecurityManager class
- [ ] Create AI authentication middleware
- [ ] Update all AI endpoints with security checks
- [ ] Add AI session management endpoints
- [ ] Implement audit logging system

### Frontend Integration:
- [ ] Update AbrakadabraBookingMagic with security context
- [ ] Add AI session initialization
- [ ] Implement permission-based feature rendering
- [ ] Add AI usage feedback to users
- [ ] Create AI security error handling

### Security Testing:
- [ ] Test public visitor AI limitations
- [ ] Test user AI surrogate permissions
- [ ] Test cross-business data isolation
- [ ] Test session expiration handling
- [ ] Penetration test AI endpoints

## 🚨 SECURITY VALIDATION

### Security Tests Required:
1. **Isolation Test**: Verify AI cannot access other users' data
2. **Permission Test**: Verify AI respects role-based permissions  
3. **Session Test**: Verify AI sessions expire properly
4. **Audit Test**: Verify all AI actions are logged
5. **Limit Test**: Verify AI usage limits are enforced

### Security Scenarios:
```typescript
// Test Case 1: Public visitor tries to access private business data
const visitorAI = await createAIHelperSession(visitorId, 'business_discovery');
const result = await ai.accessPrivateBusinessData(businessId); // Should fail

// Test Case 2: Business owner AI tries to access competitor data  
const businessAI = await createAISurrogateSession(businessUser, 'business_optimization');
const result = await ai.accessCompetitorData(competitorId); // Should fail

// Test Case 3: AI session expires
const expiredAI = await createExpiredAISession();
const result = await ai.performAction(); // Should fail with session expired
```

## 📈 SUCCESS METRICS

### Security Metrics:
- [ ] Zero unauthorized data access incidents
- [ ] 100% AI actions logged and auditable
- [ ] AI session limits enforced correctly
- [ ] No cross-business data leaks
- [ ] Permission violations detected and blocked

### Performance Metrics:
- [ ] AI security checks add <50ms latency
- [ ] AI sessions managed efficiently (no memory leaks)
- [ ] Audit logs don't impact database performance
- [ ] User experience unchanged with security layer

## 🔗 CHAIN TO NEXT TASKS

**Upon Completion**:
1. Update CLAUDE.md: "TASK-03: ✅ Complete - AI security framework implemented"
2. Update this document with implementation details
3. Enables TASK-05 (Landing Page) with secure AI discovery
4. Enables TASK-08 (AI Integration) with proper security

**Dependencies Resolved**:
- TASK-05: ✅ AI security context for public discovery
- TASK-08: ✅ Secure AI integration foundation
- All AI features: ✅ Security framework in place

---

**Last Updated**: [Update when completing task]  
**Status**: 🔴 Not Started → 🟡 In Progress → 🟢 Complete  
**Next Review**: Required before any AI integration work