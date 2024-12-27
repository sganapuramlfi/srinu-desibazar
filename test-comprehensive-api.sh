#!/bin/bash

# Colors for better visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base URL and cookie storage
BASE_URL="http://localhost:5000/api"
COOKIE_JAR="cookies.txt"

# Function to make API calls and validate JSON responses
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=${4:-200}

    echo -e "\n${BLUE}Testing ${method} ${endpoint}${NC}"
    echo "Request payload: ${data}"

    local response
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X ${method} \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -b ${COOKIE_JAR} -c ${COOKIE_JAR} \
            -d "${data}" \
            "${BASE_URL}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X ${method} \
            -H "Accept: application/json" \
            -b ${COOKIE_JAR} -c ${COOKIE_JAR} \
            "${BASE_URL}${endpoint}")
    fi

    local status_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    echo -e "Status: ${status_code}"
    echo "Response: ${body}"

    # Validate JSON response
    if echo "$body" | jq . >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Valid JSON response${NC}"
    else
        echo -e "${RED}✗ Invalid JSON response${NC}"
    fi

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ Expected status code${NC}"
    else
        echo -e "${RED}✗ Unexpected status code - Expected ${expected_status}, got ${status_code}${NC}"
    fi

    echo "$body"
}

# Clean up old cookie jar
rm -f ${COOKIE_JAR}

echo -e "${BLUE}Starting Comprehensive API Testing${NC}"

# 1. Authentication Flow
echo -e "\n${GREEN}1. Testing Authentication${NC}"
test_endpoint "POST" "/login" '{
    "username": "testuser1",
    "password": "Test@1234"
}'

# 2. Business Profile
echo -e "\n${GREEN}2. Testing Business Profile${NC}"
test_endpoint "GET" "/businesses/1/profile"

test_endpoint "PUT" "/businesses/1/profile" '{
    "name": "Updated Test Business",
    "description": "Updated test description",
    "industryType": "salon"
}'

# 3. Staff Management
echo -e "\n${GREEN}3. Testing Staff Management${NC}"
test_endpoint "GET" "/businesses/1/staff"

test_endpoint "POST" "/businesses/1/staff" '{
    "name": "Test Staff",
    "email": "staff@test.com",
    "phone": "1234567890",
    "specialization": "Hair Styling",
    "status": "active"
}'

# 4. Services Management
echo -e "\n${GREEN}4. Testing Services Management${NC}"
test_endpoint "GET" "/businesses/1/services"

test_endpoint "POST" "/businesses/1/services" '{
    "name": "Test Service",
    "description": "Test service description",
    "duration": 60,
    "price": 50.00,
    "maxParticipants": 1,
    "settings": {
        "category": "Hair",
        "requiresConsultation": true,
        "skillLevel": "intermediate"
    }
}'

# 5. Bookings Management
echo -e "\n${GREEN}5. Testing Bookings Management${NC}"
test_endpoint "GET" "/businesses/1/bookings"

test_endpoint "POST" "/businesses/1/bookings" '{
    "serviceId": 1,
    "startTime": "2024-12-28T10:00:00Z",
    "endTime": "2024-12-28T11:00:00Z",
    "notes": "Test booking"
}'

# 6. Error Handling
echo -e "\n${GREEN}6. Testing Error Handling${NC}"
test_endpoint "GET" "/businesses/999/profile" "" 404
test_endpoint "POST" "/businesses/1/staff" '{invalid_json' 400

echo -e "\n${GREEN}API Testing Complete${NC}"
