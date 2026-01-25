# 🧪 DesiBazaar Complete Testing Guide

**Date:** August 1, 2025  
**Status:** ✅ **Ready for Comprehensive Testing**

## 🚀 Overview

This guide provides complete end-to-end testing for the DesiBazaar platform with **10 realistic Melbourne businesses** across different suburbs, testing the **location-aware advertising system** and **subscription-based features**.

## 📋 Prerequisites

### Required Services Running:
```bash
# Start all services
docker-compose up -d

# Verify services
curl http://localhost:9101/api/statistics  # API Server
curl http://localhost:9102                 # Client Server
```

### Test Data Population:
```bash
# Populate 10 Melbourne businesses
./run-melbourne-test-data.sh
```

## 🏢 Test Business Data

### **10 Melbourne Businesses Created:**

| Business | Suburb | Industry | Tier | Ad Limit | Login Email |
|----------|--------|----------|------|----------|-------------|
| **Spice Paradise Indian Restaurant** | CBD | Restaurant | Premium | 25 | rajesh@spiceparadise.com.au |
| **Bella Vista Hair & Beauty** | Richmond | Salon | Enterprise | 999 | sophia@bellavista.com.au |
| **Elite Events Melbourne** | South Yarra | Event | Premium | 25 | alexandra@elitemelbourne.com.au |
| **Fitzroy Property Partners** | Fitzroy | Real Estate | Enterprise | 999 | michael@fitzroyproperty.com.au |
| **Coastal Accounting Solutions** | St Kilda | Professional | Premium | 25 | david@coastalaccounting.com.au |
| **Urban Threads Boutique** | Prahran | Retail | Free | 5 | emma@urbanthreads.com.au |
| **Nonna Maria's Italian Kitchen** | Carlton | Restaurant | Premium | 25 | giuseppe@nonnamarias.com.au |
| **Ink & Steel Tattoo Studio** | Collingwood | Salon | Premium | 25 | jake@inkandsteel.com.au |
| **Eastside Legal Group** | Hawthorn | Professional | Enterprise | 999 | sarah@eastsidelegal.com.au |
| **The Rooftop at Northcote** | Northcote | Event | Free | 5 | melissa@rooftopnorthcote.com.au |

**Password for all accounts:** `SecurePass123!`

## 🧪 Test Execution Plan

### **Phase 1: API Implementation Testing**
```bash
# Test all newly implemented APIs
./test-implemented-apis.sh
```

**Tests:**
- ✅ Business subscription management (GET/PUT)
- ✅ Location management (POST/GET/PUT)
- ✅ Ad campaign CRUD operations
- ✅ Subscription limit enforcement
- ✅ Authentication and authorization

### **Phase 2: Location-Aware Targeting**
```bash  
# Test smart location-first advertising
./test-location-targeting.sh
```

**Tests:**
- 🌍 Distance-based ad prioritization
- 🎯 Suburb-specific targeting
- 📊 Subscription tier impact on priority
- 📱 Different ad types (sidebar, banner, featured)
- 📈 Analytics tracking (impressions/clicks)

### **Phase 3: Frontend Integration**
```bash
# Test dashboard integration with new APIs  
./test-frontend-integration.sh
```

**Tests:**
- 🎨 Business dashboard API integration
- 📄 Frontend page accessibility
- 🔐 Authentication flow
- 📱 Mobile responsiveness
- ⚡ Performance benchmarks

## 🎯 Manual Testing Scenarios

### **Scenario 1: Location-Aware Ad Display**

1. **Visit Landing Page:**
   ```
   http://localhost:9102
   ```

2. **Expected Results:**
   - Sidebar ads show **Melbourne businesses**
   - **CBD businesses appear first** (if accessing from Melbourne)
   - **Premium/Enterprise ads** get higher positioning
   - **Different animation types** visible (flash, fade, bounce)

3. **Test Different Locations:**
   - Add `?lat=-37.8197&lng=144.9969` (Richmond) to URL
   - Should prioritize **Richmond businesses** (Bella Vista Hair & Beauty)

### **Scenario 2: Business Dashboard Testing**

1. **Login as Business Owner:**
   ```
   URL: http://localhost:9102/auth
   Email: rajesh@spiceparadise.com.au
   Password: SecurePass123!
   ```

2. **Navigate to Dashboard:**
   ```
   http://localhost:9102/dashboard/{businessId}
   ```

3. **Test Subscription Tab:**
   - View current **Premium tier** with **180-day trial**
   - Attempt to upgrade to **Enterprise**
   - Verify **ad limits** display correctly

4. **Test Location Management:**
   - View current **CBD location** (-37.8136, 144.9631)
   - Update address or coordinates
   - Verify location saves correctly

5. **Test Ad Campaign Management:**
   - View existing **2 active campaigns**
   - Create new campaign (should succeed - under 25 limit)
   - Try different **targeting options** (local/global/both)
   - Test **animation types** and **ad sizes**

### **Scenario 3: Subscription Limits Testing**

1. **Login as Free Tier Business:**
   ```
   Email: emma@urbanthreads.com.au (Prahran - Free Tier)
   ```

2. **Test Campaign Limits:**
   - Should have **5 campaign limit**
   - Try creating 6th campaign - should **fail with error**
   - Verify **upgrade prompt** appears

3. **Login as Enterprise Business:**
   ```
   Email: sophia@bellavista.com.au (Richmond - Enterprise)
   ```

4. **Test Enterprise Features:**
   - Should have **999 campaign limit**
   - **Highest priority** ads (priority 12)
   - Access to **all modules** (salon, event, retail)

## 🔍 API Testing Examples

### **Distance-Based Ad Targeting:**
```bash
# CBD user searching for restaurants
curl -G "http://localhost:9101/api/advertising/targeted-ads" \
  --data-urlencode "adType=sidebar_left" \
  --data-urlencode "category=restaurant" \
  --data-urlencode "lat=-37.8136" \
  --data-urlencode "lng=144.9631"

# Should prioritize: Spice Paradise (CBD), then Nonna Maria's (Carlton)
```

### **Subscription Management:**
```bash
# Get business subscription
curl -H "Cookie: session_cookie" \
  "http://localhost:9101/api/businesses/1/subscription"

# Update to Enterprise tier
curl -X PUT -H "Cookie: session_cookie" \
  -H "Content-Type: application/json" \
  -d '{"tier":"enterprise","enabledModules":["restaurant","event"],"adTargeting":"both"}' \
  "http://localhost:9101/api/businesses/1/subscription"
```

### **Location Management:**
```bash
# Set business location
curl -X POST -H "Cookie: session_cookie" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -37.8136,
    "longitude": 144.9631,
    "address": "123 Collins Street",
    "city": "Melbourne",
    "suburb": "CBD",
    "state": "Victoria"
  }' \
  "http://localhost:9101/api/businesses/1/location"
```

## 📊 Expected Test Results

### **Location-Aware Prioritization:**
| User Location | Expected Top Business | Reason |
|---------------|----------------------|---------|
| CBD | Spice Paradise Indian | Same suburb + Premium tier |
| Richmond | Bella Vista Hair & Beauty | Same suburb + Enterprise tier |
| Carlton | Nonna Maria's Italian | Same suburb + Premium tier |
| Fitzroy | Fitzroy Property Partners | Same suburb + Enterprise tier |

### **Subscription Tier Impact:**
| Tier | Ad Limit | Priority | Expected Ranking |
|------|----------|----------|------------------|
| Free | 5 | 1 | Lower in results |
| Premium | 25 | 8 | High in results |
| Enterprise | 999 | 12 | Highest in results |

### **Distance Calculations:**
- **Same suburb:** Highest priority
- **Adjacent suburbs:** Medium priority  
- **Across Melbourne:** Lower priority
- **Global ads:** Shown regardless of location

## 🚨 Common Issues & Solutions

### **Issue 1: No Businesses Showing**
```bash
# Check if test data exists
curl http://localhost:9101/api/businesses

# If empty, run:
./run-melbourne-test-data.sh
```

### **Issue 2: Authentication Errors**
```bash
# Verify correct auth endpoints
curl -X POST http://localhost:9101/api/modules/auth/login

# NOT: /api/auth/login (returns 404)
```

### **Issue 3: Location Ads Not Working**
```bash
# Check if locations are set
curl http://localhost:9101/api/businesses/1/location

# If 404, locations weren't created properly
```

### **Issue 4: Dashboard Not Loading**
```bash
# Check if client server is running
curl http://localhost:9102

# Restart if needed:
docker-compose restart client
```

## 📈 Performance Benchmarks

### **Expected Response Times:**
- **Ad Targeting API:** < 500ms
- **Business List:** < 200ms
- **Dashboard Load:** < 1000ms
- **Location Update:** < 300ms

### **Concurrent Users:**
- **Landing Page:** Should handle 100+ concurrent users
- **Ad Serving:** Should serve 1000+ ad requests/minute
- **Dashboard:** Should support 50+ simultaneous business users

## 🎉 Success Criteria

### ✅ **API Implementation:**
- [ ] All subscription management APIs working
- [ ] All location management APIs working
- [ ] All ad campaign APIs working
- [ ] Proper authentication/authorization
- [ ] Error handling and validation

### ✅ **Location-Aware Features:**
- [ ] Distance-based ad prioritization
- [ ] Suburb-specific targeting working
- [ ] GPS coordinates accurate
- [ ] Different radius targeting working

### ✅ **Business Dashboard:**
- [ ] Subscription tab functional
- [ ] Location management working
- [ ] Ad campaign creation working
- [ ] Limits properly enforced
- [ ] Real-time API integration

### ✅ **User Experience:**
- [ ] Fast loading times (< 2 seconds)
- [ ] Mobile responsive design
- [ ] Intuitive navigation
- [ ] Clear error messages
- [ ] Subscription upgrade prompts

## 🔄 Next Steps After Testing

### **If Tests Pass:**
1. **Production Deployment Ready**
2. **User Acceptance Testing**
3. **Performance Optimization**
4. **Marketing Launch**

### **If Issues Found:**
1. **Document specific failures**
2. **Fix critical bugs first**
3. **Re-run affected test suites**
4. **Update documentation**

---

## 📞 Testing Support

**API Documentation:** `/swagger.yaml`  
**Test Scripts Location:** `/test-*.sh`  
**Business Data:** See `IMPLEMENTATION-SUMMARY.md`

**All test accounts use password:** `SecurePass123!`

---

**🎯 This comprehensive testing plan ensures the location-aware advertising system works correctly across all Melbourne suburbs with realistic business data and subscription tiers.**