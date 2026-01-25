#!/bin/bash

echo "🔍 Starting Comprehensive Dashboard Testing for DesiBazaar"
echo "Testing base URL: http://localhost:9101"

# Test Variables
SALON_BUSINESS_ID=65  # spa2's business ID
REALESTATE_BUSINESS_ID=68  # realeaste2's business ID
AUTH_COOKIE=""
AUTH_TOKEN=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Helper function for API calls
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local response
    local cookie_header=""

    if [ -n "$AUTH_COOKIE" ]; then
        cookie_header="Cookie: $AUTH_COOKIE"
    fi

    if [ -n "$data" ]; then
        response=$(curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -H "$cookie_header" \
            -c cookie.txt -b cookie.txt \
            -d "$data" \
            "http://localhost:9101$endpoint")
    else
        response=$(curl -s -X "$method" \
            -H "$cookie_header" \
            -c cookie.txt -b cookie.txt \
            "http://localhost:9101$endpoint")
    fi

    # Update AUTH_COOKIE from cookie file if it exists
    if [ -f cookie.txt ]; then
        AUTH_COOKIE=$(grep "connect.sid" cookie.txt | cut -f 7)
    fi

    echo "$response"
}

# Test Salon Authentication
echo -e "\n📋 Test 1: Salon Authentication Flow"
login_response=$(make_request "POST" "/api/login" '{"username":"spa2","password":"Test@1234"}')
echo "Login response: $login_response"
if [[ $login_response == *"Login successful"* ]]; then
    echo -e "${GREEN}✅ Salon login successful${NC}"

    # Test salon specific endpoints
    echo -e "\n📋 Test 2: Salon Dashboard Features"

    # Test Services CRUD
    echo "Testing Salon Services Management..."
    service_response=$(make_request "GET" "/api/businesses/$SALON_BUSINESS_ID/services")
    if [[ $service_response == *"["* ]]; then
        echo -e "${GREEN}✅ Service listing successful${NC}"
    else
        echo -e "${RED}❌ Service listing failed${NC}"
        echo "Response: $service_response"
    fi

    # Test Staff Management
    echo "Testing Staff Management..."
    staff_response=$(make_request "GET" "/api/businesses/$SALON_BUSINESS_ID/staff")
    if [[ $staff_response == *"["* ]]; then
        echo -e "${GREEN}✅ Staff listing successful${NC}"
    else
        echo -e "${RED}❌ Staff listing failed${NC}"
        echo "Response: $staff_response"
    fi

    # Logout from salon account
    logout_response=$(make_request "POST" "/api/logout")
    if [[ $logout_response == *"Logout successful"* ]]; then
        echo -e "${GREEN}✅ Salon logout successful${NC}"
    else
        echo -e "${RED}❌ Salon logout failed${NC}"
    fi
else
    echo -e "${RED}❌ Salon login failed${NC}"
fi

# Clean cookie file between tests
rm -f cookie.txt

# Test Real Estate Authentication
echo -e "\n📋 Test 3: Real Estate Authentication Flow"
login_response=$(make_request "POST" "/api/login" '{"username":"realeaste2","password":"Test@1234"}')
echo "Login response: $login_response"
if [[ $login_response == *"Login successful"* ]]; then
    echo -e "${GREEN}✅ Real Estate login successful${NC}"

    # Test real estate specific endpoints
    echo -e "\n📋 Test 4: Real Estate Dashboard Features"

    # Test Property Listings
    echo "Testing Property Management..."
    property_response=$(make_request "GET" "/api/businesses/$REALESTATE_BUSINESS_ID/properties")
    if [[ $property_response == *"["* ]]; then
        echo -e "${GREEN}✅ Property listing successful${NC}"
    else
        echo -e "${RED}❌ Property listing failed${NC}"
        echo "Response: $property_response"
    fi

    # Test Property Viewings
    echo "Testing Property Viewings..."
    viewings_response=$(make_request "GET" "/api/businesses/$REALESTATE_BUSINESS_ID/viewings")
    if [[ $viewings_response == *"["* ]]; then
        echo -e "${GREEN}✅ Property viewings listing successful${NC}"
    else
        echo -e "${RED}❌ Property viewings listing failed${NC}"
        echo "Response: $viewings_response"
    fi

    # Logout from real estate account
    logout_response=$(make_request "POST" "/api/logout")
    if [[ $logout_response == *"Logout successful"* ]]; then
        echo -e "${GREEN}✅ Real Estate logout successful${NC}"
    else
        echo -e "${RED}❌ Real Estate logout failed${NC}"
    fi
else
    echo -e "${RED}❌ Real Estate login failed${NC}"
fi

# Test Frontend Component Loading
echo -e "\n📋 Test 5: Frontend Component Loading"
for route in \
    "/dashboard/$SALON_BUSINESS_ID" \
    "/dashboard/$SALON_BUSINESS_ID/services" \
    "/dashboard/$SALON_BUSINESS_ID/staff" \
    "/dashboard/$REALESTATE_BUSINESS_ID" \
    "/dashboard/$REALESTATE_BUSINESS_ID/properties" \
    "/dashboard/$REALESTATE_BUSINESS_ID/viewings"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9101$route")
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        echo -e "${GREEN}✅ Route $route loaded successfully${NC}"
    else
        echo -e "${RED}❌ Route $route failed to load${NC}"
    fi
done

# Cleanup
rm -f cookie.txt

echo -e "\n✨ Dashboard Testing Completed"
echo "Check the responses above for any failed tests (❌)"