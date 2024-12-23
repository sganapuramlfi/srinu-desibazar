# Salon & Spa Implementation Plan

## Database Schema Requirements

### Core Tables
1. **Services**
```sql
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- in minutes
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

2. **Staff**
```sql
CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

3. **Staff Skills**
```sql
CREATE TABLE staff_skills (
  staff_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  PRIMARY KEY (staff_id, service_id)
);
```

4. **Shifts**
```sql
CREATE TABLE shift_templates (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_duration INTEGER -- in minutes
);

CREATE TABLE staff_shifts (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL,
  shift_template_id INTEGER NOT NULL,
  date DATE NOT NULL,
  actual_start_time TIME,
  actual_end_time TIME,
  status VARCHAR(20) DEFAULT 'scheduled'
);
```

5. **Slots**
```sql
CREATE TABLE slots (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'available',
  is_manual BOOLEAN DEFAULT false
);
```

6. **Bookings**
```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
```

7. **Customers**
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  preferences JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints Structure

### 1. Service Management
```typescript
// Service CRUD endpoints
GET    /api/businesses/:businessId/services
POST   /api/businesses/:businessId/services
GET    /api/businesses/:businessId/services/:serviceId
PUT    /api/businesses/:businessId/services/:serviceId
DELETE /api/businesses/:businessId/services/:serviceId
```

### 2. Staff Management
```typescript
// Staff CRUD endpoints
GET    /api/businesses/:businessId/staff
POST   /api/businesses/:businessId/staff
GET    /api/businesses/:businessId/staff/:staffId
PUT    /api/businesses/:businessId/staff/:staffId
DELETE /api/businesses/:businessId/staff/:staffId

// Staff skills
GET    /api/businesses/:businessId/staff/:staffId/skills
POST   /api/businesses/:businessId/staff/:staffId/skills
DELETE /api/businesses/:businessId/staff/:staffId/skills/:skillId
```

### 3. Shift Management
```typescript
// Shift template endpoints
GET    /api/businesses/:businessId/shift-templates
POST   /api/businesses/:businessId/shift-templates
PUT    /api/businesses/:businessId/shift-templates/:templateId

// Staff shifts
GET    /api/businesses/:businessId/staff/:staffId/shifts
POST   /api/businesses/:businessId/staff/:staffId/shifts
PUT    /api/businesses/:businessId/staff/:staffId/shifts/:shiftId
```

### 4. Slot Management
```typescript
// Slot generation and management
GET    /api/businesses/:businessId/slots
POST   /api/businesses/:businessId/slots/generate
POST   /api/businesses/:businessId/slots/manual
PUT    /api/businesses/:businessId/slots/:slotId
DELETE /api/businesses/:businessId/slots/:slotId
```

### 5. Booking Management
```typescript
// Booking endpoints
GET    /api/businesses/:businessId/bookings
POST   /api/businesses/:businessId/bookings
GET    /api/businesses/:businessId/bookings/:bookingId
PUT    /api/businesses/:businessId/bookings/:bookingId/status
DELETE /api/businesses/:businessId/bookings/:bookingId
```

## Frontend Component Structure

### 1. Dashboard Components
```typescript
// Core dashboard components
/components/dashboard/
  ├── Overview.tsx           // Dashboard homepage with key metrics
  ├── ServiceManager.tsx     // Service CRUD operations
  ├── StaffManager.tsx      // Staff management
  ├── ShiftPlanner.tsx      // Shift template and roster management
  ├── Calendar.tsx          // Calendar view of bookings and slots
  └── Analytics.tsx         // Reports and analytics
```

### 2. Booking Components
```typescript
/components/booking/
  ├── BookingCalendar.tsx   // Calendar view for selecting slots
  ├── ServiceSelector.tsx   // Service selection with staff
  ├── CustomerForm.tsx      // Customer details form
  └── BookingSummary.tsx    // Booking confirmation
```

### 3. Staff Components
```typescript
/components/staff/
  ├── StaffSchedule.tsx     // Individual staff schedule
  ├── ShiftAssignment.tsx   // Shift assignment interface
  └── SkillMatrix.tsx       // Staff skills management
```

## Implementation Phases

### Phase 1: Core Setup
1. Database schema implementation
2. Basic API endpoints
3. Authentication integration
4. Dashboard layout

### Phase 2: Service & Staff
1. Service management
2. Staff profiles
3. Skill mapping
4. Basic scheduling

### Phase 3: Booking System
1. Slot generation
2. Booking management
3. Calendar views
4. Customer management

### Phase 4: Advanced Features
1. Analytics dashboard
2. Reports generation
3. Marketing tools
4. Notification system

## Testing Strategy

### Unit Tests
- Service management
- Staff scheduling
- Booking logic
- Slot generation

### Integration Tests
- Booking flow
- Staff assignment
- Service scheduling
- Customer management

### E2E Tests
- Complete booking process
- Dashboard operations
- Staff management
- Calendar interactions

## Security Considerations

1. **Authentication**
   - Role-based access (Owner, Staff, Customer)
   - Session management
   - API endpoint protection

2. **Data Protection**
   - Customer data encryption
   - Secure payment processing
   - Audit logging

3. **Business Logic**
   - Booking validation
   - Schedule conflict prevention
   - Double-booking prevention

## Performance Optimizations

1. **Database**
   - Indexed queries
   - Efficient joins
   - Query caching

2. **API**
   - Request rate limiting
   - Response caching
   - Batch operations

3. **Frontend**
   - Lazy loading
   - Component optimization
   - State management

Would you like to proceed with this implementation plan? We can start with Phase 1 after your approval and any adjustments you'd like to make.
