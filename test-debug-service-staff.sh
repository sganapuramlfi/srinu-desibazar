#!/bin/bash

echo "🔍 Starting Service-Staff Mapping Debug Tests"
echo "Testing base URL: http://localhost:9101"
BUSINESS_ID=19

# Login first to get session cookie
echo -e "\n📋 Test 1: Authentication"
LOGIN_RESPONSE=$(curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"stest","password":"Test@1234"}' \
  -c cookies.txt -b cookies.txt \
  -s "http://localhost:9101/api/login")
echo "Login response: $LOGIN_RESPONSE"

# Test Staff Skills Endpoint
echo -e "\n📋 Test 2: Staff Skills Management"
echo "Fetching current staff skills..."
STAFF_SKILLS_RESPONSE=$(curl -s -b cookies.txt "http://localhost:9101/api/businesses/$BUSINESS_ID/staff-skills")
echo "Staff skills response: $STAFF_SKILLS_RESPONSE"

# Get first staff member for testing
STAFF_RESPONSE=$(curl -s -b cookies.txt "http://localhost:9101/api/businesses/$BUSINESS_ID/staff")
STAFF_ID=$(echo $STAFF_RESPONSE | jq '.[0].id')

if [ -n "$STAFF_ID" ]; then
  echo "Testing with staff ID: $STAFF_ID"
  
  # Test updating staff skills
  echo "Testing PUT staff skills..."
  UPDATE_SKILLS_RESPONSE=$(curl -X PUT -H "Content-Type: application/json" \
    -d '{
      "serviceIds": [1, 2]
    }' \
    -b cookies.txt \
    -s "http://localhost:9101/api/businesses/$BUSINESS_ID/staff/$STAFF_ID/skills")
  echo "Update skills response: $UPDATE_SKILLS_RESPONSE"

  # Verify updated skills
  echo "Verifying updated skills..."
  VERIFY_SKILLS_RESPONSE=$(curl -s -b cookies.txt "http://localhost:9101/api/businesses/$BUSINESS_ID/staff/$STAFF_ID/skills")
  echo "Verification response: $VERIFY_SKILLS_RESPONSE"
fi

echo -e "\n✨ Service-Staff Mapping Debug Tests Completed"
