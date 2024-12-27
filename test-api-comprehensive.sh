#!/bin/bash

# Colors for better visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base URL
BASE_URL="http://localhost:5000/api"

# Store IDs and tokens
BUSINESS_ID=""
SERVICE_ID=""
TEMPLATE_ID=""

echo -e "${BLUE}Starting comprehensive API testing...${NC}\n"

# Function to validate JSON response
validate_json() {
    local json="$1"
    if [[ -z "$json" ]]; then
        echo -e "${RED}Empty response${NC}"
        return 1
    fi
    if echo "$json" | jq '.' >/dev/null 2>&1; then
        return 0
    else
        echo -e "${RED}Invalid JSON response:${NC}"
        echo "$json"
        return 1
    fi
}

# Function to make API calls and handle responses
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local cookie=$4
    local expected_status=${5:-200}

    echo -e "\n${BLUE}Testing ${method} ${endpoint}${NC}"
    echo "Request payload: ${data}"

    local response
    if [ -z "$data" ]; then
        response=$(curl -s -i -X ${method} \
            -H "Content-Type: application/json" \
            ${cookie:+-H "Cookie: ${cookie}"} \
            "${BASE_URL}${endpoint}")
    else
        response=$(curl -s -i -X ${method} \
            -H "Content-Type: application/json" \
            ${cookie:+-H "Cookie: ${cookie}"} \
            -d "${data}" \
            "${BASE_URL}${endpoint}")
    fi

    # Split response into headers and body
    local headers
    local body
    local status_code

    # Extract headers, body and status code
    headers=$(echo "$response" | awk 'BEGIN{RS="\r\n\r\n"} NR==1{print}')
    body=$(echo "$response" | awk 'BEGIN{RS="\r\n\r\n"} NR==2{print}')
    status_code=$(echo "$headers" | grep -i "HTTP/" | awk '{print $2}')

    echo "Status code: ${status_code}"
    echo "Response body: ${body}"

    # Validate JSON response if status code is 200
    if [ "$status_code" = "200" ]; then
        if ! validate_json "$body"; then
            echo -e "${RED}✗ Test failed - Invalid JSON response${NC}"
            return 1
        fi
    fi

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ Test passed${NC}"
    else
        echo -e "${RED}✗ Test failed - Expected ${expected_status}, got ${status_code}${NC}"
        return 1
    fi

    # Return the body for further processing
    echo "$body"
}

# Test authentication first
echo -e "${BLUE}1. Testing Authentication${NC}"

# Register business user
register_response=$(call_api "POST" "/register" '{
    "username": "testbusiness2",
    "password": "Test@1234",
    "email": "test2@example.com",
    "role": "business",
    "business": {
        "name": "Test Business 2",
        "industryType": "salon",
        "description": "Test Description"
    }
}')

if ! validate_json "$register_response"; then
    echo -e "${RED}Registration failed - Invalid JSON response${NC}"
    exit 1
fi

# Login
login_response=$(call_api "POST" "/login" '{
    "username": "testbusiness2",
    "password": "Test@1234"
}')

if ! validate_json "$login_response"; then
    echo -e "${RED}Login failed - Invalid JSON response${NC}"
    exit 1
fi

# Extract session cookie and business ID from headers and response
SESSION_COOKIE=$(echo "$login_response" | grep -i "set-cookie" | cut -d' ' -f2)
BUSINESS_ID=$(echo "$login_response" | jq -r '.user.business.id')

echo "Extracted Business ID: ${BUSINESS_ID}"
echo "Session Cookie: ${SESSION_COOKIE}"

if [ -z "$BUSINESS_ID" ] || [ -z "$SESSION_COOKIE" ]; then
    echo -e "${RED}Failed to get authentication credentials${NC}"
    exit 1
fi

# Test business profile endpoints
echo -e "\n${BLUE}2. Testing Business Profile${NC}"

# Get profile
profile_response=$(call_api "GET" "/businesses/${BUSINESS_ID}/profile" "" "${SESSION_COOKIE}")

# Test shift template endpoints
echo -e "\n${BLUE}3. Testing Shift Templates${NC}"

# Create shift template
template_response=$(call_api "POST" "/businesses/${BUSINESS_ID}/shift-templates" '{
    "name": "Morning Shift",
    "startTime": "09:00",
    "endTime": "17:00",
    "breaks": [
        {
            "startTime": "12:00",
            "endTime": "13:00",
            "type": "lunch",
            "duration": 60
        }
    ],
    "daysOfWeek": [1, 2, 3, 4, 5],
    "color": "#4CAF50",
    "isActive": true
}' "${SESSION_COOKIE}")

if ! validate_json "$template_response"; then
    echo -e "${RED}Failed to create shift template - Invalid JSON response${NC}"
    exit 1
fi

TEMPLATE_ID=$(echo "$template_response" | jq -r '.id')

# Get shift templates
templates_response=$(call_api "GET" "/businesses/${BUSINESS_ID}/shift-templates" "" "${SESSION_COOKIE}")

# Test service endpoints
echo -e "\n${BLUE}4. Testing Services${NC}"

# Create service
service_response=$(call_api "POST" "/businesses/${BUSINESS_ID}/services" '{
    "name": "Test Service",
    "description": "Test service description",
    "duration": 60,
    "price": "50.00",
    "category": "general",
    "maxParticipants": 1
}' "${SESSION_COOKIE}")

if ! validate_json "$service_response"; then
    echo -e "${RED}Failed to create service - Invalid JSON response${NC}"
    exit 1
fi

SERVICE_ID=$(echo "$service_response" | jq -r '.id')

# Get services
services_response=$(call_api "GET" "/businesses/${BUSINESS_ID}/services" "" "${SESSION_COOKIE}")

echo -e "\n${GREEN}Testing completed!${NC}"

# Print summary
echo -e "\n${BLUE}Test Summary:${NC}"
echo "Business ID: ${BUSINESS_ID}"
echo "Service ID: ${SERVICE_ID}"
echo "Template ID: ${TEMPLATE_ID}"