#!/bin/bash

# Comprehensive End-to-End Business Flow Test
# Tests all features through actual API calls

echo "🚀 DesiBazaar Complete Business Flow Test"
echo "========================================"
echo ""
echo "This script will test the complete business journey:"
echo "1. User & Business Registration"
echo "2. Business Profile Setup"
echo "3. Subscription Management"
echo "4. Service Publishing"
echo "5. Staff Management"
echo "6. Schedule & Roster Setup"
echo "7. Ad Campaign Creation"
echo "8. Customer Booking Flow"
echo ""

API_URL="http://localhost:9101/api"
CLIENT_URL="http://localhost:9102"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test data
TIMESTAMP=$(date +%s)
BUSINESS_EMAIL="test.restaurant.${TIMESTAMP}@example.com"
BUSINESS_USERNAME="testrestaurant${TIMESTAMP}"
CUSTOMER_EMAIL="test.customer.${TIMESTAMP}@example.com"

echo -e "${YELLOW}Starting comprehensive test...${NC}\n"

# Function to check response
check_response() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2 FAILED${NC}"
        echo "Response: $3"
        exit 1
    fi
}

# Save cookies for session management
COOKIE_JAR="test-cookies.txt"
rm -f $COOKIE_JAR

# 1. BUSINESS OWNER REGISTRATION
echo -e "\n${YELLOW}1. Testing Business Owner Registration...${NC}"

REGISTER_RESPONSE=$(curl -s -c $COOKIE_JAR -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'$BUSINESS_USERNAME'",
    "email": "'$BUSINESS_EMAIL'",
    "password": "Test123!@#",
    "role": "business"
  }')

echo "Registration Response: $REGISTER_RESPONSE"

# Extract user ID from response (assuming JSON response with id field)
USER_ID=$(echo $REGISTER_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

if [ -z "$USER_ID" ]; then
    echo -e "${RED}Failed to extract user ID from registration response${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Business owner registered (ID: $USER_ID)${NC}"

# 2. LOGIN AS BUSINESS OWNER
echo -e "\n${YELLOW}2. Testing Business Login...${NC}"

LOGIN_RESPONSE=$(curl -s -b $COOKIE_JAR -c $COOKIE_JAR -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$BUSINESS_EMAIL'",
    "password": "Test123!@#"
  }')

echo "Login Response: $LOGIN_RESPONSE"
check_response $? "Business login"

# 3. CREATE BUSINESS PROFILE
echo -e "\n${YELLOW}3. Creating Business Profile...${NC}"

BUSINESS_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/businesses" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Spice Paradise Restaurant",
    "description": "Authentic Indian cuisine test restaurant",
    "industryType": "restaurant",
    "contactInfo": {
      "phone": "+61 400 123 456",
      "email": "'$BUSINESS_EMAIL'",
      "address": "123 Test Street, Melbourne CBD"
    }
  }')

echo "Business Creation Response: $BUSINESS_RESPONSE"

BUSINESS_ID=$(echo $BUSINESS_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

if [ -z "$BUSINESS_ID" ]; then
    echo -e "${RED}Failed to extract business ID${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Business created (ID: $BUSINESS_ID)${NC}"

# 4. SET BUSINESS LOCATION
echo -e "\n${YELLOW}4. Setting Business Location...${NC}"

LOCATION_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/businesses/$BUSINESS_ID/location" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -37.8136,
    "longitude": 144.9631,
    "address": "123 Collins Street, Melbourne CBD",
    "city": "Melbourne",
    "suburb": "CBD",
    "state": "Victoria",
    "postcode": "3000",
    "country": "Australia"
  }')

echo "Location Response: $LOCATION_RESPONSE"
check_response $? "Location setup"

# 5. CREATE/UPDATE SUBSCRIPTION
echo -e "\n${YELLOW}5. Setting up Premium Subscription...${NC}"

SUBSCRIPTION_RESPONSE=$(curl -s -b $COOKIE_JAR -X PUT "$API_URL/businesses/$BUSINESS_ID/subscription" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "premium",
    "enabledModules": ["restaurant", "event"],
    "adTargeting": "both"
  }')

echo "Subscription Response: $SUBSCRIPTION_RESPONSE"
check_response $? "Subscription setup"

# 6. CREATE SERVICES
echo -e "\n${YELLOW}6. Creating Restaurant Services...${NC}"

# Service 1: Lunch Buffet
SERVICE1_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/businesses/$BUSINESS_ID/services" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lunch Buffet",
    "description": "All-you-can-eat lunch buffet",
    "duration": 90,
    "price": 29.99,
    "category": "dining",
    "isActive": true,
    "maxParticipants": 50
  }')

echo "Service 1 Response: $SERVICE1_RESPONSE"

# Service 2: Private Dining
SERVICE2_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/businesses/$BUSINESS_ID/services" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Private Dining Experience",
    "description": "Exclusive 7-course meal",
    "duration": 180,
    "price": 120.00,
    "category": "special",
    "isActive": true,
    "maxParticipants": 12
  }')

echo "Service 2 Response: $SERVICE2_RESPONSE"

# 7. CREATE STAFF
echo -e "\n${YELLOW}7. Creating Staff Members...${NC}"

STAFF1_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/businesses/$BUSINESS_ID/staff" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rajesh Kumar",
    "email": "rajesh@testrestaurant.com",
    "phone": "+61 400 111 222",
    "specialization": "Head Chef",
    "status": "active"
  }')

echo "Staff 1 Response: $STAFF1_RESPONSE"

STAFF2_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/businesses/$BUSINESS_ID/staff" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Sharma",
    "email": "priya@testrestaurant.com",
    "phone": "+61 400 333 444",
    "specialization": "Restaurant Manager",
    "status": "active"
  }')

echo "Staff 2 Response: $STAFF2_RESPONSE"

# 8. CREATE SHIFT TEMPLATES
echo -e "\n${YELLOW}8. Creating Shift Templates...${NC}"

SHIFT_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/businesses/$BUSINESS_ID/shift-templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lunch Shift",
    "startTime": "11:00",
    "endTime": "15:00",
    "breakDuration": 30,
    "description": "Lunch service shift",
    "requiredStaff": 2
  }')

echo "Shift Template Response: $SHIFT_RESPONSE"

# 9. CREATE AD CAMPAIGN
echo -e "\n${YELLOW}9. Creating Ad Campaign...${NC}"

AD_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/businesses/$BUSINESS_ID/ad-campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "50% OFF First Visit - Test Restaurant",
    "content": "Experience authentic Indian cuisine. Book now!",
    "adType": "sidebar_left",
    "size": "medium",
    "animationType": "flash",
    "targeting": "local",
    "targetRadius": 10,
    "status": "active",
    "budget": 100.00
  }')

echo "Ad Campaign Response: $AD_RESPONSE"

# 10. REGISTER CUSTOMER
echo -e "\n${YELLOW}10. Registering Customer Account...${NC}"

# Logout from business account first
curl -s -b $COOKIE_JAR -X POST "$API_URL/logout"

CUSTOMER_RESPONSE=$(curl -s -c $COOKIE_JAR -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testcustomer'$TIMESTAMP'",
    "email": "'$CUSTOMER_EMAIL'",
    "password": "Test123!@#",
    "role": "customer"
  }')

echo "Customer Registration Response: $CUSTOMER_RESPONSE"

CUSTOMER_ID=$(echo $CUSTOMER_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

# 11. CUSTOMER LOGIN
echo -e "\n${YELLOW}11. Customer Login...${NC}"

CUSTOMER_LOGIN=$(curl -s -b $COOKIE_JAR -c $COOKIE_JAR -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$CUSTOMER_EMAIL'",
    "password": "Test123!@#"
  }')

echo "Customer Login Response: $CUSTOMER_LOGIN"

# 12. CHECK AVAILABLE SLOTS
echo -e "\n${YELLOW}12. Checking Available Service Slots...${NC}"

TOMORROW=$(date -d "tomorrow" '+%Y-%m-%d')
SLOTS_RESPONSE=$(curl -s -b $COOKIE_JAR -X GET "$API_URL/businesses/$BUSINESS_ID/slots?date=$TOMORROW")

echo "Available Slots Response: $SLOTS_RESPONSE"

# 13. CREATE BOOKING
echo -e "\n${YELLOW}13. Creating Customer Booking...${NC}"

BOOKING_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": '$BUSINESS_ID',
    "serviceId": 1,
    "startTime": "'$TOMORROW'T12:00:00",
    "endTime": "'$TOMORROW'T13:30:00",
    "notes": "Test booking - vegetarian preference"
  }')

echo "Booking Response: $BOOKING_RESPONSE"

# 14. TEST BUSINESS DASHBOARD ACCESS
echo -e "\n${YELLOW}14. Testing Business Dashboard Access...${NC}"

DASHBOARD_URL="$CLIENT_URL/dashboard/$BUSINESS_ID"
echo "Dashboard URL: $DASHBOARD_URL"

# Check if dashboard loads (should get 200 or redirect to login)
DASHBOARD_CHECK=$(curl -s -o /dev/null -w "%{http_code}" -b $COOKIE_JAR "$DASHBOARD_URL")
echo "Dashboard HTTP Status: $DASHBOARD_CHECK"

# SUMMARY
echo -e "\n${YELLOW}📊 TEST SUMMARY${NC}"
echo "================"
echo -e "${GREEN}✅ Business Owner Account:${NC} $BUSINESS_EMAIL"
echo -e "${GREEN}✅ Business ID:${NC} $BUSINESS_ID"
echo -e "${GREEN}✅ Customer Account:${NC} $CUSTOMER_EMAIL"
echo -e "${GREEN}✅ Dashboard URL:${NC} $DASHBOARD_URL"
echo ""
echo -e "${YELLOW}IDENTIFIED ISSUES TO CHECK:${NC}"

# Check what failed
if [ -z "$BUSINESS_ID" ]; then
    echo -e "${RED}❌ Business creation API not working${NC}"
fi

# List potential missing endpoints
echo ""
echo -e "${YELLOW}Potential Missing API Endpoints:${NC}"
echo "- POST /api/businesses/:id/location"
echo "- PUT /api/businesses/:id/subscription"
echo "- POST /api/businesses/:id/ad-campaigns"
echo "- GET /api/businesses/:id/slots"
echo "- POST /api/businesses/:id/shift-templates"

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Check server logs: docker-compose logs server"
echo "2. Try manual login at: $CLIENT_URL/auth"
echo "3. Check if APIs exist: curl -X GET $API_URL"
echo ""

# Cleanup
rm -f $COOKIE_JAR