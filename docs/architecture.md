# Architecture Overview

## System Architecture

### Frontend Architecture
```
client/
├── src/
│   ├── components/
│   │   ├── layout/      # Layout components (Navbar, Footer, etc.)
│   │   └── ui/          # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   └── lib/            # Utility functions and configurations
```

The frontend follows a component-based architecture using React with TypeScript:
- **Routing**: Uses `wouter` for lightweight routing
- **State Management**: Leverages React Query for server state management
- **UI Components**: Implements shadcn/ui components with Tailwind CSS
- **Form Handling**: Uses react-hook-form with zod validation

### Backend Architecture
```
server/
├── auth.ts             # Authentication logic
├── routes.ts           # API route definitions
└── vite.ts            # Development server configuration
```

The backend implements:
- Express.js server with TypeScript
- RESTful API endpoints
- Session-based authentication using Passport.js
- PostgreSQL database with Drizzle ORM

### Database Schema
```
db/
├── schema.ts           # Database schema definitions
└── index.ts           # Database connection setup
```

## Key Design Decisions

### 1. Multi-Industry Support
- Industry-specific business types (salon, restaurant, event, etc.)
- Dynamic routing based on business type
- Customizable dashboard per industry

### 2. Authentication System
- Session-based authentication for security
- Role-based access control (business owners vs customers)
- Secure password hashing using scrypt
- Cookie-based session management

### 3. Business Onboarding Flow
- Step-by-step onboarding process
- Industry-specific data collection
- Validation at each step
- Progress tracking

### 4. Responsive Design
- Mobile-first approach
- Adaptive UI components
- Industry-specific mobile views

## Security Considerations
1. **Authentication**
   - Secure password hashing
   - CSRF protection
   - Session management
   - Rate limiting

2. **Data Protection**
   - Input validation
   - Parameter sanitization
   - Error handling

## Performance Optimizations
1. **Frontend**
   - Code splitting
   - Lazy loading
   - Optimized assets

2. **Backend**
   - Connection pooling
   - Query optimization
   - Caching strategies

## Development Environment
- Vite for frontend development
- Hot module replacement
- TypeScript for type safety
- Automated testing setup
