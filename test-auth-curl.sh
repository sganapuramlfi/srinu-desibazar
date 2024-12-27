#!/bin/bash

# Colors for better visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Testing Authentication Endpoints${NC}\n"

BASE_URL="http://localhost:5000/api"
COOKIE_JAR="cookies.txt"

# Function to make API calls and handle responses
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=${4:-200}

    echo -e "\nTesting ${method} ${endpoint}"
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
}

# Clean up old cookie jar
rm -f ${COOKIE_JAR}

# Test registration
echo -e "\n${GREEN}1. Testing Registration${NC}"
test_endpoint "POST" "/register" '{
    "username": "testuser1",
    "password": "Test@1234",
    "email": "test1@example.com",
    "role": "business",
    "business": {
        "name": "Test Business",
        "industryType": "salon",
        "description": "Test Description"
    }
}'

# Test login
echo -e "\n${GREEN}2. Testing Login${NC}"
test_endpoint "POST" "/login" '{
    "username": "testuser1",
    "password": "Test@1234"
}'

# Test get user info
echo -e "\n${GREEN}3. Testing Get User Info${NC}"
test_endpoint "GET" "/user"

# Test logout
echo -e "\n${GREEN}4. Testing Logout${NC}"
test_endpoint "POST" "/logout"

echo -e "\n${GREEN}Authentication Testing Complete${NC}"
