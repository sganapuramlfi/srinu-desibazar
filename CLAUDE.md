# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔄 CONTEXT PRESERVATION STRATEGY
**CRITICAL**: Before starting any task, ALWAYS read this section and referenced documents to understand current state and avoid losing context.

### Current Platform Status: AbrakadabraAI Multi-Industry Platform
- **TASK-01**: ✅ **COMPLETE** - Business-centric database architecture implemented
- **Foundation Fixed**: Business tenant isolation, subscription control, industry-specific contexts
- **Schema Status**: Migration-ready from broken user-business model to secure business-tenant model
- **Next Phase**: TASK-02 (Restaurant Integration) with proper business isolation foundation

## Development Commands

### Core Commands
- `npm run dev:server` - Start Express server with tsx watch (port 3000)
- `npm run dev:client` - Start Vite dev server (port 5173) 
- `npm run build` - Build both client and server for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript compiler check
- `npm run db:push` - Push database schema changes via Drizzle

### Client-only Commands (in /client)
- `cd client && npm run dev` - Start Vite development server
- `cd client && npm run build` - Build client for production
- `cd client && npm run check` - TypeScript check for client

### Server-only Commands (in /server)
- `cd server && npm run dev` - Start server with tsx watch
- `cd server && npm run db:push` - Push DB schema changes

### Docker Services
- `docker-compose up -d` - Start PostgreSQL (port 9100) and Ollama (port 11435)
- `docker-compose down` - Stop all services

## Architecture Overview

### Project Structure
This is a full-stack business marketplace application with modular architecture:

- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (containerized)
- **AI Integration**: Ollama (containerized, GPU-enabled)
- **Authentication**: Passport.js with local strategy

### Key Architectural Concepts

#### Modular System
- **ModuleLoader** (`server/ModuleLoader.ts`) - Dynamic module loading system
- Industry-specific modules: salon, restaurant, real estate, retail, professional services
- Admin can enable/disable modules per business via `/api/modules` endpoints
- Routes are dynamically registered based on active modules

#### Multi-tenant Business System
- **Users** can be: admin, business, customer
- **Businesses** belong to users and have industry types
- **Services** and **Bookings** are business-scoped
- Role-based access control throughout API endpoints

#### Database Schema (`db/schema.ts`)
Key entities and relationships:
- `users` → `businesses` (one-to-one via userId)
- `businesses` → `services` (one-to-many)
- `services` → `bookings` (one-to-many)
- `businesses` → `advertisements` (one-to-many)
- Complex salon-specific tables: `salonStaff`, `serviceSlots`, `staffSchedules`, `shiftTemplates`

#### Authentication Flow
- Setup in `server/auth.ts` and `server/routes.ts`
- Session-based authentication with express-session
- User context available in `req.user` after authentication
- Protected routes check `req.isAuthenticated()` and user roles

#### Frontend Routing
- Uses `wouter` for client-side routing
- Protected routes in `client/src/App.tsx` redirect unauthenticated users
- Role-based route guards (business owners, customers, admin)
- Module-specific routes under `/modules/:moduleId/*`

### Development Environment

#### Database Setup
- PostgreSQL runs in Docker on port 9100
- Connection via `DATABASE_URL` environment variable
- Drizzle ORM for schema management and queries
- Use `npm run db:push` to sync schema changes

#### API Development
- Server runs on port 3000, client on 5173
- Vite proxy forwards `/api/*` requests to server
- All API routes prefixed with `/api`
- CORS configured for development

#### Environment Variables
Check `.env.example` files in root, `/server`, and `/client` directories for required variables.

### Industry-Specific Features

#### Salon Module
- Staff management with skills and specializations
- Shift templates and scheduling system
- Service slot booking with staff assignment
- Complex roster management

#### Restaurant Module  
- Table management
- Menu and promotions system
- Staff scheduling adapted for restaurant operations

#### Advertising System
- Multi-tier advertising with smart targeting
- Admin announcements for platform-wide messaging
- Business-specific ad campaigns
- Analytics tracking for impressions and clicks

### Important Development Notes

#### File Upload Handling
- Multer configured for business logos and gallery images
- Files stored in `/public/uploads/` directory structure
- 5MB file size limit, supports JPEG/PNG/WebP

#### Module Registration
- New modules should be added to the ModuleLoader system
- Routes are dynamically registered based on module configuration
- Admin dashboard provides module enable/disable functionality

#### Testing
- Extensive bash script testing in root directory (`test-*.sh` files)
- API endpoint testing with sample data population
- Use `setupSampleData()` for development data

#### Business Registration Flow
- Multi-step onboarding process
- Industry-specific configuration
- Profile completion with media uploads
- Automatic slug generation for SEO

When working with this codebase, always consider the modular architecture and multi-tenant nature of the application. Check user authentication and business ownership before accessing business-specific resources.

---

# 🏗️ MASTER IMPLEMENTATION PLAN
## 20 Priority Tasks for Platform Enhancement

### 🚨 FOUNDATION FIXES (Priority 1 - Must Fix First)

#### **TASK-01: Database Schema Unification** ⭐⭐⭐⭐⭐
**Status**: Critical Foundation Issue  
**Reference**: `docs/analysis/TASK-01-Database-Schema-Analysis.md`  
**Impact**: All modules, data integrity, performance  
**Description**: Fix duplicated tables (services vs salonServices), connect restaurant schema  
**Dependencies**: None (foundation task)  
**Estimate**: 3-5 days

#### **TASK-02: Restaurant Module Integration** ⭐⭐⭐⭐⭐  
**Status**: Critical Module Gap  
**Reference**: `docs/analysis/TASK-02-Restaurant-Integration-Analysis.md`  
**Impact**: Restaurant businesses, booking flows, revenue  
**Description**: Connect restaurant frontend components to backend restaurant-schema tables  
**Dependencies**: TASK-01 (schema fixes)  
**Estimate**: 4-6 days

#### **TASK-03: AI Genie Security Context** ⭐⭐⭐⭐⭐  
**Status**: Security Architecture Gap  
**Reference**: `docs/analysis/TASK-03-AI-Security-Analysis.md`  
**Impact**: Platform security, AI integration, user trust  
**Description**: Implement AI surrogate user system with proper permissions  
**Dependencies**: None (parallel to schema work)  
**Estimate**: 5-7 days

#### **TASK-04: Subscription Feature Gating** ⭐⭐⭐⭐⭐  
**Status**: Revenue Architecture Missing  
**Reference**: `docs/analysis/TASK-04-Subscription-Analysis.md`  
**Impact**: Revenue model, feature access, business scaling  
**Description**: Implement subscription-based module and feature access control  
**Dependencies**: TASK-01 (schema foundation)  
**Estimate**: 6-8 days

### 🔧 CORE PLATFORM FIXES (Priority 2 - Essential Functions)

#### **TASK-05: Landing Page Business Discovery** ⭐⭐⭐⭐  
**Status**: Public Platform Gap  
**Reference**: `docs/analysis/TASK-05-Landing-Discovery-Analysis.md`  
**Impact**: Customer acquisition, business visibility, platform growth  
**Description**: Build unified business search and discovery system for public users  
**Dependencies**: TASK-01 (schema), TASK-03 (AI context)  
**Estimate**: 5-7 days

#### **TASK-06: Location Intelligence System** ⭐⭐⭐⭐  
**Status**: Core Platform Feature Missing  
**Reference**: `docs/analysis/TASK-06-Location-Intelligence-Analysis.md`  
**Impact**: Local discovery, targeted advertising, user experience  
**Description**: Implement geolocation-based business recommendations and advertising  
**Dependencies**: TASK-05 (discovery system)  
**Estimate**: 6-8 days

#### **TASK-07: Universal Booking Engine** ⭐⭐⭐⭐  
**Status**: Core Business Function  
**Reference**: `docs/analysis/TASK-07-Universal-Booking-Analysis.md`  
**Impact**: All modules, customer experience, revenue  
**Description**: Create industry-agnostic booking system with module-specific extensions  
**Dependencies**: TASK-01 (schema), TASK-02 (restaurant)  
**Estimate**: 8-10 days

#### **TASK-08: AbrakadabraAI Integration Engine** ⭐⭐⭐⭐  
**Status**: Platform Differentiator  
**Reference**: `docs/analysis/TASK-08-AI-Integration-Analysis.md`  
**Impact**: User experience, competitive advantage, automation  
**Description**: Connect AI components to booking, discovery, and optimization systems  
**Dependencies**: TASK-03 (security), TASK-07 (booking)  
**Estimate**: 7-9 days

### 📊 BUSINESS INTELLIGENCE (Priority 3 - Growth Features)

#### **TASK-09: Analytics & Insights Dashboard** ⭐⭐⭐  
**Status**: Business Intelligence Gap  
**Reference**: `docs/analysis/TASK-09-Analytics-Analysis.md`  
**Impact**: Business optimization, data-driven decisions  
**Description**: Unified analytics across all modules with AI-powered insights  
**Dependencies**: TASK-01 (schema), TASK-04 (subscriptions)  
**Estimate**: 6-8 days

#### **TASK-10: Smart Advertising System** ⭐⭐⭐  
**Status**: Revenue Enhancement  
**Reference**: `docs/analysis/TASK-10-Advertising-Analysis.md`  
**Impact**: Platform revenue, business promotion  
**Description**: Enhance existing ad system with AI targeting and location intelligence  
**Dependencies**: TASK-06 (location), TASK-08 (AI)  
**Estimate**: 5-7 days

#### **TASK-11: Module Management Console** ⭐⭐⭐  
**Status**: Admin Platform Feature  
**Reference**: `docs/analysis/TASK-11-Module-Management-Analysis.md`  
**Impact**: Platform administration, module deployment  
**Description**: Admin dashboard for module enable/disable and configuration  
**Dependencies**: TASK-04 (subscriptions)  
**Estimate**: 4-6 days

#### **TASK-12: Customer Journey Optimization** ⭐⭐⭐  
**Status**: User Experience Enhancement  
**Reference**: `docs/analysis/TASK-12-Customer-Journey-Analysis.md`  
**Impact**: Conversion rates, user satisfaction  
**Description**: AI-powered customer flow optimization across all touchpoints  
**Dependencies**: TASK-05 (discovery), TASK-07 (booking), TASK-08 (AI)  
**Estimate**: 6-8 days

### 🏢 MODULE ENHANCEMENTS (Priority 4 - Industry-Specific)

#### **TASK-13: Salon Module Completion** ⭐⭐⭐  
**Status**: Primary Module Enhancement  
**Reference**: `docs/analysis/TASK-13-Salon-Enhancement-Analysis.md`  
**Impact**: Salon businesses, feature completeness  
**Description**: Complete remaining salon features, integrate with universal systems  
**Dependencies**: TASK-01 (schema), TASK-07 (booking)  
**Estimate**: 5-7 days

#### **TASK-14: Restaurant Module Feature Parity** ⭐⭐⭐  
**Status**: Secondary Module Enhancement  
**Reference**: `docs/analysis/TASK-14-Restaurant-Feature-Analysis.md`  
**Impact**: Restaurant businesses, competitive features  
**Description**: Add advanced restaurant features (promotions, delivery, inventory)  
**Dependencies**: TASK-02 (integration), TASK-07 (booking)  
**Estimate**: 6-8 days

#### **TASK-15: Module Placeholder Architecture** ⭐⭐  
**Status**: Future Module Foundation  
**Reference**: `docs/analysis/TASK-15-Module-Placeholders-Analysis.md`  
**Impact**: Platform scalability, future modules  
**Description**: Create structured placeholders for 6 additional industry modules  
**Dependencies**: TASK-01 (schema), TASK-11 (management)  
**Estimate**: 3-4 days

### 🔒 SECURITY & PERFORMANCE (Priority 5 - Platform Stability)

#### **TASK-16: Security Hardening** ⭐⭐⭐  
**Status**: Security Enhancement  
**Reference**: `docs/analysis/TASK-16-Security-Hardening-Analysis.md`  
**Impact**: Platform security, compliance  
**Description**: Comprehensive security review and enhancement across all systems  
**Dependencies**: TASK-03 (AI security)  
**Estimate**: 4-6 days

#### **TASK-17: Performance Optimization** ⭐⭐⭐  
**Status**: Performance Enhancement  
**Reference**: `docs/analysis/TASK-17-Performance-Analysis.md`  
**Impact**: User experience, scalability  
**Description**: Database optimization, caching, frontend performance  
**Dependencies**: TASK-01 (schema fixes)  
**Estimate**: 5-7 days

#### **TASK-18: API Standardization** ⭐⭐  
**Status**: Architecture Enhancement  
**Reference**: `docs/analysis/TASK-18-API-Standards-Analysis.md`  
**Impact**: Developer experience, integration  
**Description**: Standardize API patterns across all modules  
**Dependencies**: TASK-01 (schema), TASK-07 (booking)  
**Estimate**: 4-5 days

### 🚀 PLATFORM SCALING (Priority 6 - Future Growth)

#### **TASK-19: Multi-tenant Architecture** ⭐⭐  
**Status**: Scaling Preparation  
**Reference**: `docs/analysis/TASK-19-Multi-tenant-Analysis.md`  
**Impact**: Platform scaling, enterprise features  
**Description**: Enhance multi-tenant capabilities for enterprise customers  
**Dependencies**: TASK-04 (subscriptions), TASK-16 (security)  
**Estimate**: 7-9 days

#### **TASK-20: Platform API & SDK** ⭐⭐  
**Status**: Ecosystem Development  
**Reference**: `docs/analysis/TASK-20-Platform-API-Analysis.md`  
**Impact**: Third-party integrations, ecosystem growth  
**Description**: Public API and SDK for third-party developers  
**Dependencies**: TASK-18 (API standards), TASK-19 (multi-tenant)  
**Estimate**: 8-10 days

---

## 📋 IMPLEMENTATION STRATEGY

### Phase 1: Foundation (Weeks 1-3) - TASK-01 to TASK-04
**Goal**: Fix broken foundations without breaking existing functionality  
**Approach**: Incremental patches with backwards compatibility  
**Validation**: All existing features continue to work

### Phase 2: Core Platform (Weeks 4-6) - TASK-05 to TASK-08  
**Goal**: Complete core platform functionality  
**Approach**: Build on solid foundations from Phase 1  
**Validation**: End-to-end user journeys work smoothly

### Phase 3: Intelligence (Weeks 7-9) - TASK-09 to TASK-12  
**Goal**: Add business intelligence and optimization  
**Approach**: Layer AI and analytics on stable platform  
**Validation**: Measurable business value for customers

### Phase 4: Enhancement (Weeks 10-12) - TASK-13 to TASK-15  
**Goal**: Complete existing modules and prepare for new ones  
**Approach**: Enhance without disrupting live businesses  
**Validation**: Feature parity with competitors

### Phase 5: Optimization (Weeks 13-15) - TASK-16 to TASK-18  
**Goal**: Platform stability and performance  
**Approach**: Optimize without changing interfaces  
**Validation**: Performance benchmarks met

### Phase 6: Scaling (Weeks 16-18) - TASK-19 to TASK-20  
**Goal**: Prepare for rapid growth  
**Approach**: Build scaling infrastructure  
**Validation**: Platform ready for 10x growth

---

## 🔗 CHAIN REFERENCE SYSTEM

### Before Starting Any Task:
1. **Read Current Status**: Check this CLAUDE.md header for latest platform state
2. **Read Task Analysis**: Review the specific `docs/analysis/TASK-XX-*.md` document
3. **Check Dependencies**: Ensure prerequisite tasks are completed
4. **Update Context**: After completion, update this file and task analysis document

### Context Chain Pattern:
```
CLAUDE.md (master reference) 
  ↓
docs/analysis/TASK-XX-Analysis.md (detailed analysis)
  ↓  
Implementation → Update Status → Chain to Next Task
```

This ensures no context is lost and each task builds properly on previous work.

## 🏗️ What I've Built For You:

### 1. Master Reference System (CLAUDE.md)

- 20 prioritized tasks with clear dependencies
- Phase-based implementation (6 phases, 18 weeks)
- Impact ratings (⭐⭐⭐⭐⭐ for critical foundation fixes)
- Chain reference system to prevent context loss

### 2. Smart Prioritization Strategy

Priority 1: Foundation Fixes (MUST fix first)
├── TASK-01: Database Schema Unification
├── TASK-02: Restaurant Module Integration
├── TASK-03: AI Security Context
└── TASK-04: Subscription Feature Gating

Priority 2: Core Platform (Build on foundation)
├── TASK-05: Landing Page Discovery
├── TASK-06: Location Intelligence
├── TASK-07: Universal Booking Engine
└── TASK-08: AbrakadabraAI Integration

### 3. Context Chain System

CLAUDE.md (Master Plan)
  ↓
docs/analysis/TASK-XX-Analysis.md (Detailed breakdown)
  ↓
Implementation → Update Status → Chain to Next Task

### 4. Incremental Enhancement Philosophy

- Fix foundations first (schema, security, revenue model)
- Enhance existing modules without breaking them
- Add new capabilities on solid foundations
- Preserve backwards compatibility throughout

### 5. Detailed Analysis Documents

- TASK-01: Complete database schema unification strategy
- TASK-03: Comprehensive AI security framework
- Each task has 10+ specific issues with solutions
- Risk mitigation and rollback plans included