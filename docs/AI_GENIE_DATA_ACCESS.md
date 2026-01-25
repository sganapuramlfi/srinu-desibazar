# AI Genie Data Access Architecture

## Security Model: Public Data Only

AI Genie operates under a **strict public-data-only model** to ensure customer privacy and business security.

### ✅ What AI Genie CAN Access (Public Storefront Data)

1. **Business Information**
   - Business name and description
   - Industry type (restaurant, salon, etc.)
   - General operating hours
   - Public contact number (for display only)
   - Suburb/area location (not exact address)

2. **Service Availability** 
   - General availability levels (High/Medium/Low)
   - Total seating capacity (restaurants)
   - Service types offered
   - Public menu items and prices

3. **Aggregated Analytics**
   - Overall rating (e.g., 4.8 stars)
   - Total review count
   - General sentiment (positive/negative)
   - Popular times (aggregated)
   - General busy patterns

4. **Public Promotions**
   - Active deals and discounts
   - Promotion descriptions
   - Validity periods
   - Terms and conditions

### ❌ What AI Genie CANNOT Access (Private Business Data)

1. **Staff Information**
   - Staff names, emails, phone numbers
   - Work schedules and shifts
   - Salaries and wages
   - Personal details

2. **Customer Data**
   - Customer names and contacts
   - Booking history
   - Personal preferences
   - Payment information

3. **Business Operations**
   - Financial data (revenue, costs)
   - Inventory levels
   - Supplier information
   - Internal notes

4. **Detailed Bookings**
   - Specific table assignments
   - Individual reservation details
   - Customer-specific pricing

## AI Genie as User Surrogate

When AI Genie acts on behalf of users:

```javascript
// AI Genie can help with:
- "Find Indian restaurants near Melbourne CBD"
- "Check if Mumbai Spice Palace is open now"
- "What's the general availability for dinner tonight?"
- "Show me current promotions"

// AI Genie redirects for:
- "Book a table" → Directs to auth/booking page
- "View my past orders" → Requires user login
- "Change my reservation" → Requires authentication
```

## Implementation Example

```typescript
// Public endpoint for AI Genie
app.get("/api/ai/public/business/:id/summary", 
  aiDataSecurityMiddleware,  // Ensures public data only
  aiGenieSurrogateMiddleware, // Validates AI Genie access
  async (req, res) => {
    // Returns only public, aggregated data
    const publicData = await getPublicBusinessSummary(req.params.id);
    res.json(publicData);
  }
);

// Private endpoint (AI Genie CANNOT access)
app.get("/api/business/:id/staff", 
  requireAuth, // Requires business owner auth
  async (req, res) => {
    // Returns sensitive staff data
    const staffData = await getStaffDetails(req.params.id);
    res.json(staffData);
  }
);
```

## Security Principles

1. **Least Privilege**: AI Genie only gets minimum required data
2. **Data Classification**: Clear separation of public vs private
3. **No Credential Storage**: AI Genie never stores user credentials
4. **Audit Trail**: All AI Genie access is logged
5. **Response Sanitization**: Automatic removal of private fields

## API Endpoints for AI Genie

```
GET /api/ai/public/business/:id/summary
GET /api/ai/public/business/:id/availability  
GET /api/ai/public/business/:id/sentiment
GET /api/ai/public/search?q=<query>&location=<suburb>
```

All endpoints:
- Return only public, aggregated data
- Do not require authentication
- Include security headers
- Are rate-limited to prevent abuse