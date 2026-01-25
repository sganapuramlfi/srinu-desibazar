#!/bin/bash

echo "🔍 Starting Salon Dashboard Debug Tests"
echo "Testing base URL: http://localhost:9101"
BUSINESS_ID=19  # Example business ID

# Login first to get session cookie
echo -e "\n📋 Test 1: Authentication"
LOGIN_RESPONSE=$(curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"stest","password":"Test@1234"}' \
  -c cookies.txt -b cookies.txt \
  -s "http://localhost:9101/api/login")
echo "Login response: $LOGIN_RESPONSE"

# Test Service Management - Edit and Delete
echo -e "\n📋 Test 2: Service Management Operations"

# 2.1 List services to get a service ID
echo "Fetching services..."
SERVICES_RESPONSE=$(curl -s -b cookies.txt "http://localhost:9101/api/businesses/$BUSINESS_ID/services")
echo "Services response: $SERVICES_RESPONSE"

# Get first service ID for testing
SERVICE_ID=$(echo $SERVICES_RESPONSE | jq '.[0].id')
if [ -n "$SERVICE_ID" ]; then
  echo "Testing with service ID: $SERVICE_ID"
  
  # 2.2 Test service edit
  echo "Testing PUT (edit) service..."
  EDIT_RESPONSE=$(curl -X PUT -H "Content-Type: application/json" \
    -d '{
      "name": "Updated Test Service",
      "description": "Updated description",
      "duration": 45,
      "price": "35.00",
      "category": "hair",
      "isActive": true
    }' \
    -b cookies.txt \
    -s "http://localhost:9101/api/businesses/$BUSINESS_ID/services/$SERVICE_ID")
  echo "Edit service response: $EDIT_RESPONSE"

  # 2.3 Test service delete
  echo "Testing DELETE service..."
  DELETE_RESPONSE=$(curl -X DELETE \
    -b cookies.txt \
    -s "http://localhost:9101/api/businesses/$BUSINESS_ID/services/$SERVICE_ID")
  echo "Delete service response: $DELETE_RESPONSE"
fi

# Test Staff Management and Skills
echo -e "\n📋 Test 3: Staff Management and Skills"

# 3.1 List staff
echo "Fetching staff..."
STAFF_RESPONSE=$(curl -s -b cookies.txt "http://localhost:9101/api/businesses/$BUSINESS_ID/staff")
echo "Staff response: $STAFF_RESPONSE"

# Get first staff ID for testing
STAFF_ID=$(echo $STAFF_RESPONSE | jq '.[0].id')
if [ -n "$STAFF_ID" ]; then
  echo "Testing with staff ID: $STAFF_ID"
  
  # 3.2 Test staff skills assignment
  echo "Testing PUT staff skills..."
  SKILLS_RESPONSE=$(curl -X PUT -H "Content-Type: application/json" \
    -d '{
      "serviceIds": [1, 2]
    }' \
    -b cookies.txt \
    -s "http://localhost:9101/api/businesses/$BUSINESS_ID/staff/$STAFF_ID/skills")
  echo "Staff skills assignment response: $SKILLS_RESPONSE"
fi

# Test Roster Management
echo -e "\n📋 Test 4: Roster Management"

# 4.1 List shift templates
echo "Fetching shift templates..."
TEMPLATES_RESPONSE=$(curl -s -b cookies.txt "http://localhost:9101/api/businesses/$BUSINESS_ID/shift-templates")
echo "Templates response: $TEMPLATES_RESPONSE"

# 4.2 Test creating a new schedule
if [ -n "$STAFF_ID" ]; then
  echo "Testing POST new schedule..."
  SCHEDULE_RESPONSE=$(curl -X POST -H "Content-Type: application/json" \
    -d '{
      "templateId": 1,
      "date": "2024-12-25",
      "status": "scheduled"
    }' \
    -b cookies.txt \
    -s "http://localhost:9101/api/businesses/$BUSINESS_ID/staff/$STAFF_ID/schedules")
  echo "Create schedule response: $SCHEDULE_RESPONSE"
fi

echo -e "\n✨ Debug Tests Completed"
echo "Check responses above for any error messages or unexpected behavior"
