# DesiBazaar Technical Documentation

## Project Overview
DesiBazaar is an advanced workforce management platform that supports multiple service-based industries with a focus on staff scheduling and management. The platform is built using a modern tech stack:

- Frontend: React.js with TypeScript
- Backend: Express.js with TypeScript
- Database: PostgreSQL with Drizzle ORM
- Authentication: Passport.js with session-based auth

## Architecture

### Frontend Architecture
- React.js with TypeScript for type safety
- Component-based structure in `client/src/components`
- Industry-specific components with shared UI elements
- ShadCN UI components for consistent design
- React Query for server state management
- Wouter for lightweight routing

### Backend Architecture
- Express.js REST API
- Microservices pattern for industry-specific logic
- Centralized authentication and session management
- PostgreSQL database with Drizzle ORM
- API routes prefixed with `/api`

## Authentication System
- Session-based authentication using Passport.js
- Express session with MemoryStore
- User roles: admin, business, customer
- Secure password hashing with crypto scrypt
- Protected routes with authentication middleware

## Multi-industry Support

### Industry Types
- Salon
- Restaurant
- Event
- Real Estate
- Retail
- Professional Services

### Industry-Specific Features
Each industry has dedicated:
- Service definitions
- Staff management
- Booking systems
- Roster management

## API Endpoints Structure

### Authentication Endpoints
```
POST /api/register - User registration
POST /api/login - User login
POST /api/logout - User logout
GET /api/user - Get current user
```

### Business Management
```
GET /api/businesses - List businesses
GET /api/businesses/:id - Get business details
POST /api/businesses - Create business
PUT /api/businesses/:id - Update business
```

### Staff Management
```
GET /api/businesses/:businessId/staff - List staff
POST /api/businesses/:businessId/staff - Add staff
GET /api/businesses/:businessId/staff-skills - Get staff skills
PUT /api/businesses/:businessId/staff/:staffId/skills - Update staff skills
```

### Roster Management
```
GET /api/businesses/:businessId/roster - Get roster
POST /api/businesses/:businessId/roster/assign - Assign shift
PUT /api/businesses/:businessId/roster/:shiftId - Update shift
GET /api/businesses/:businessId/shift-templates - Get shift templates
```

## Frontend Components

### Core Components
1. `ServiceStaffTab.tsx` - Service-staff mapping interface
   - Features:
     - Staff selection
     - Service assignment
     - Skill management
     - Real-time updates

2. `RosterTabUpdated.tsx` - Advanced roster management
   - Features:
     - Weekly view
     - Shift template legend
     - Dynamic shift assignment
     - Color-coded shift types

### UI Components
- Shared UI components from ShadCN
- Custom styled components using Tailwind CSS
- Responsive design patterns

## Business Logic Implementation

### Service-Staff Mapping
- Many-to-many relationship between staff and services
- Skill levels tracking
- Service categorization
- Real-time updates using React Query

### Roster Management
- Shift template system
- Break time management
- Weekly roster view
- Color-coded shift types
- Dynamic shift assignment

## Database Schema

### Core Tables
```sql
users
  - id (PK)
  - username
  - password (hashed)
  - email
  - role
  - createdAt

businesses
  - id (PK)
  - userId (FK)
  - name
  - description
  - industryType
  - status
  - contactInfo
  - workingHours
  - settings
```

### Salon-specific Tables
```sql
salon_services
  - id (PK)
  - businessId (FK)
  - name
  - duration
  - price
  - category

salon_staff
  - id (PK)
  - businessId (FK)
  - name
  - email
  - specialization
  - status

staff_skills
  - id (PK)
  - staffId (FK)
  - serviceId (FK)
  - proficiencyLevel

staff_schedules
  - id (PK)
  - staffId (FK)
  - templateId (FK)
  - date
  - status
  - actualStartTime
  - actualEndTime
```

## Key Relationships
- One-to-many between businesses and services
- Many-to-many between staff and services (through staff_skills)
- One-to-many between staff and schedules
- One-to-many between templates and schedules

## Development Guidelines

### API Development
1. All routes should be prefixed with `/api`
2. Use appropriate HTTP methods (GET, POST, PUT, DELETE)
3. Implement proper error handling and validation
4. Maintain consistent response formats

### Frontend Development
1. Use React Query for data fetching
2. Implement proper loading and error states
3. Follow component composition patterns
4. Use TypeScript for type safety

### Database Operations
1. Use Drizzle ORM for all database operations
2. Implement proper relations in schema
3. Use transactions for complex operations
4. Implement cascade deletes where appropriate

## Testing
- Shell scripts for API testing
- Integration tests for core functionality
- Frontend component testing
- Database schema validation

## Future Considerations
1. Mobile app development
2. Real-time notifications
3. Advanced reporting
4. Multi-location support
5. Integration with external services

This documentation serves as a reference for the current state of the project and future development guidelines.
