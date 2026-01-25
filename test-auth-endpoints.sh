#!/bin/bash

# Colors for better visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base URL
BASE_URL="http://localhost:9101/api"

echo -e "${BLUE}Testing Authentication Endpoints${NC}\n"

# Function to make API calls and handle responses
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local cookie=$4
    local expected_status=${5:-200}

    echo -e "\n${BLUE}Testing ${method} ${endpoint}${NC}"
    echo "Request payload: ${data}"

    local response=$(curl -s -w "\n%{http_code}" -X ${method} \
        -H "Content-Type: application/json" \
        ${cookie:+-H "Cookie: ${cookie}"} \
        ${data:+-d "${data}"} \
        "${BASE_URL}${endpoint}")

    local status_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    echo -e "Status: ${status_code}"
    echo "Response: ${body}"

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ Test passed${NC}"
    else
        echo -e "${RED}✗ Test failed - Expected ${expected_status}, got ${status_code}${NC}"
        return 1
    fi

    echo "$body"
}

echo -e "${BLUE}1. Testing Registration${NC}"
register_response=$(call_api "POST" "/register" '{
    "username": "testuser3",
    "password": "testpass123",
    "email": "test3@example.com",
    "role": "business",
    "business": {
        "name": "Test Salon 3",
        "industryType": "salon",
        "description": "Test Description"
    }
}')

if [[ $? -eq 0 ]] && echo "$register_response" | grep -q '"ok":true'; then
    echo -e "${GREEN}✓ Registration successful${NC}"

    echo -e "\n${BLUE}2. Testing Login${NC}"
    login_response=$(call_api "POST" "/login" '{
        "username": "testuser3",
        "password": "testpass123"
    }')

    if [[ $? -eq 0 ]] && echo "$login_response" | grep -q '"ok":true'; then
        echo -e "${GREEN}✓ Login successful${NC}"

        # Extract session cookie and user info
        session_cookie=$(echo "$login_response" | grep -o '"connect.sid=[^;]*')
        user_data=$(echo "$login_response" | grep -o '"user":{[^}]*}')

        echo -e "\n${BLUE}3. Testing User Info Endpoint${NC}"
        call_api "GET" "/user" "" "Cookie: ${session_cookie}"

        echo -e "\n${BLUE}4. Testing Logout${NC}"
        call_api "POST" "/logout" "" "Cookie: ${session_cookie}"
    else
        echo -e "${RED}✗ Login failed${NC}"
    fi
else
    echo -e "${RED}✗ Registration failed${NC}"
fi

echo -e "\n${GREEN}Authentication testing completed!${NC}"