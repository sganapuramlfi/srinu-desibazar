#!/bin/bash

# Colors for better visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base URL
BASE_URL="http://localhost:5000/api"

echo -e "${BLUE}Testing Authentication Endpoints${NC}\n"

# Test registration
echo -e "\n${BLUE}1. Testing Registration${NC}"
echo "Attempting to register new user..."
registration_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "username": "testuser3",
        "password": "testpass123",
        "email": "test3@example.com",
        "role": "business",
        "business": {
            "name": "Test Salon 3",
            "industryType": "salon",
            "description": "Test Description"
        }
    }' \
    "${BASE_URL}/register")

echo "Registration Response:"
echo "${registration_response}" | python3 -m json.tool

if echo "${registration_response}" | grep -q '"ok":true'; then
    echo -e "${GREEN}✓ Registration successful${NC}"
else
    echo -e "${RED}✗ Registration failed${NC}"
    exit 1
fi

# Test login
echo -e "\n${BLUE}2. Testing Login${NC}"
echo "Attempting to login..."
login_response=$(curl -i -s -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "username": "testuser3",
        "password": "testpass123"
    }' \
    "${BASE_URL}/login")

echo "Login Response Headers:"
echo "${login_response}" | grep -i "set-cookie"
echo -e "\nLogin Response Body:"
echo "${login_response}" | tail -n1 | python3 -m json.tool

if echo "${login_response}" | grep -q '"ok":true'; then
    echo -e "${GREEN}✓ Login successful${NC}"
    
    # Extract session cookie
    SESSION_COOKIE=$(echo "$login_response" | grep -i "set-cookie" | cut -d' ' -f2)
    echo "Session Cookie: ${SESSION_COOKIE}"
    
    # Test authenticated endpoint
    echo -e "\n${BLUE}3. Testing User Info Endpoint${NC}"
    user_response=$(curl -s \
        -H "Cookie: ${SESSION_COOKIE}" \
        "${BASE_URL}/user")
    
    echo "User Info Response:"
    echo "${user_response}" | python3 -m json.tool
    
    if echo "${user_response}" | grep -q '"ok":true'; then
        echo -e "${GREEN}✓ User info retrieved successfully${NC}"
    else
        echo -e "${RED}✗ Failed to get user info${NC}"
    fi
else
    echo -e "${RED}✗ Login failed${NC}"
fi

echo -e "\n${GREEN}Authentication endpoint testing completed!${NC}"
