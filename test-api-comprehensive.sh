#!/bin/bash

# Colors for better visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base URL
BASE_URL="http://localhost:5000/api"

# Store cookies and tokens
COOKIE_JAR="cookies.txt"
SESSION_COOKIE=""

echo -e "${BLUE}Starting comprehensive API testing...${NC}\n"

# Function to validate JSON response
validate_json() {
    local response="$1"
    if echo "$response" | jq '.' >/dev/null 2>&1; then
        return 0
    else
        echo -e "${RED}Invalid JSON response:${NC}"
        echo "$response"
        return 1
    fi
}

# Function to make API calls and handle responses
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=${4:-200}

    echo -e "\n${BLUE}Testing ${method} ${endpoint}${NC}"
    echo "Request payload: ${data}"

    local response
    local curl_cmd="curl -s -i -X ${method} \
        -H 'Content-Type: application/json' \
        -b ${COOKIE_JAR} -c ${COOKIE_JAR}"

    if [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -d '${data}'"
    fi

    curl_cmd="$curl_cmd ${BASE_URL}${endpoint}"

    echo "Executing: $curl_cmd"
    response=$(eval $curl_cmd)

    # Split response into headers and body
    local headers=$(echo "$response" | awk 'BEGIN{RS="\r\n\r\n"} NR==1{print}')
    local body=$(echo "$response" | awk 'BEGIN{RS="\r\n\r\n"} NR==2{print}')
    local status_code=$(echo "$headers" | grep -i "HTTP/" | awk '{print $2}')

    echo "Status code: ${status_code}"
    echo "Response body: ${body}"

    if [ "$status_code" = "$expected_status" ]; then
        if [ ! -z "$body" ]; then
            if validate_json "$body"; then
                echo -e "${GREEN}✓ Test passed${NC}"
                echo "$body"
                return 0
            else
                echo -e "${RED}✗ Test failed - Invalid JSON response${NC}"
                return 1
            fi
        else
            echo -e "${RED}✗ Test failed - Empty response body${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Test failed - Expected ${expected_status}, got ${status_code}${NC}"
        return 1
    fi
}

# Clean up old cookie jar
rm -f ${COOKIE_JAR}

echo -e "${BLUE}1. Testing Authentication Flow${NC}"

# Register
echo "Testing registration..."
register_response=$(call_api "POST" "/register" '{
    "username": "testbusiness",
    "password": "Test@1234",
    "email": "test@example.com",
    "role": "business",
    "business": {
        "name": "Test Business",
        "industryType": "salon",
        "description": "Test salon business"
    }
}')

if [ $? -ne 0 ]; then
    echo -e "${RED}Registration failed${NC}"
    exit 1
fi

# Login
echo "Testing login..."
login_response=$(call_api "POST" "/login" '{
    "username": "testbusiness",
    "password": "Test@1234"
}')

if [ $? -ne 0 ]; then
    echo -e "${RED}Login failed${NC}"
    exit 1
fi

# Get user info
echo "Testing user info..."
user_response=$(call_api "GET" "/user")

if [ $? -ne 0 ]; then
    echo -e "${RED}User info fetch failed${NC}"
    exit 1
fi

# Extract business ID from user response
BUSINESS_ID=$(echo "$user_response" | jq -r '.user.business.id')
if [ -z "$BUSINESS_ID" ]; then
    echo -e "${RED}Failed to get business ID${NC}"
    exit 1
fi

echo -e "${BLUE}2. Testing Business Profile${NC}"

# Get business profile
echo "Testing business profile retrieval..."
call_api "GET" "/businesses/${BUSINESS_ID}/profile"

echo -e "${BLUE}3. Testing Staff Management${NC}"

# Add staff
echo "Testing staff creation..."
staff_response=$(call_api "POST" "/businesses/${BUSINESS_ID}/staff" '{
    "name": "Test Staff",
    "email": "staff@example.com",
    "phone": "1234567890",
    "specialization": "Hair Styling",
    "status": "active"
}')

STAFF_ID=$(echo "$staff_response" | jq -r '.id')

# Get staff list
echo "Testing staff list retrieval..."
call_api "GET" "/businesses/${BUSINESS_ID}/staff"

echo -e "${BLUE}4. Testing Services Management${NC}"

# Add service
echo "Testing service creation..."
service_response=$(call_api "POST" "/businesses/${BUSINESS_ID}/services" '{
    "name": "Test Service",
    "description": "Test service description",
    "duration": 60,
    "price": "50.00",
    "category": "general"
}')

SERVICE_ID=$(echo "$service_response" | jq -r '.id')

# Get services list
echo "Testing services list retrieval..."
call_api "GET" "/businesses/${BUSINESS_ID}/services"

echo -e "${BLUE}5. Testing Slot Management${NC}"

# Get available slots
echo "Testing slot availability..."
call_api "GET" "/businesses/${BUSINESS_ID}/slots?date=$(date +%Y-%m-%d)"

# Cleanup
echo -e "\n${BLUE}6. Testing Logout${NC}"
call_api "POST" "/logout"

# Print summary
echo -e "\n${BLUE}Test Summary:${NC}"
echo "Business ID: ${BUSINESS_ID}"
echo "Staff ID: ${STAFF_ID}"
echo "Service ID: ${SERVICE_ID}"

# Clean up cookie jar
rm -f ${COOKIE_JAR}

echo -e "\n${GREEN}Testing completed!${NC}"