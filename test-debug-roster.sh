#!/bin/bash

echo "🔍 Starting Roster Debug Tests"
echo "Testing base URL: http://localhost:9101"
BUSINESS_ID=19

# Login first to get session cookie
echo -e "\n📋 Test 1: Authentication"
LOGIN_RESPONSE=$(curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"stest","password":"Test@1234"}' \
  -c cookies.txt -b cookies.txt \
  -s "http://localhost:9101/api/login")
echo "Login response: $LOGIN_RESPONSE"

# Test Roster API Endpoints
echo -e "\n📋 Test 2: Roster Management"

# Get current roster
echo "Fetching current roster..."
ROSTER_RESPONSE=$(curl -s -H "Content-Type: application/json" -b cookies.txt \
  "http://localhost:9101/api/businesses/$BUSINESS_ID/roster")
echo "Current roster response: $ROSTER_RESPONSE"

# Test assigning a shift
echo "Testing POST roster assignment..."
ASSIGN_RESPONSE=$(curl -X POST -H "Content-Type: application/json" \
  -d '{
    "staffId": 5,
    "templateId": 1,
    "date": "2024-12-25",
    "status": "scheduled"
  }' \
  -b cookies.txt \
  -s "http://localhost:9101/api/businesses/$BUSINESS_ID/roster/assign")
echo "Assign shift response: $ASSIGN_RESPONSE"

# Verify the assignment
echo "Verifying roster assignment..."
VERIFY_RESPONSE=$(curl -s -H "Content-Type: application/json" -b cookies.txt \
  "http://localhost:9101/api/businesses/$BUSINESS_ID/roster")
echo "Verification response: $VERIFY_RESPONSE"

echo -e "\n✨ Roster Debug Tests Completed"