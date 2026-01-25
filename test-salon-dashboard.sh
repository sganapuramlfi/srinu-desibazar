#!/bin/bash

echo "🔍 Starting Salon Dashboard Tests"
echo "Testing base URL: http://localhost:9101"
BUSINESS_ID=19  # The business ID from the URL

# Test Authentication
echo -e "\n📋 Test 1: Authentication"
LOGIN_RESPONSE=$(curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"stest","password":"Test@1234"}' \
  -c cookies.txt -b cookies.txt \
  -s "http://localhost:9101/api/login")
echo "Login response: $LOGIN_RESPONSE"

# Test Service Management
echo -e "\n📋 Test 2: Service Management"
# List services
echo "Testing GET services"
curl -s -b cookies.txt "http://localhost:9101/api/businesses/$BUSINESS_ID/services" | jq .

# Create new service
echo "Testing POST new service"
NEW_SERVICE_RESPONSE=$(curl -X POST -H "Content-Type: application/json" \
  -d '{
    "name": "Test Haircut",
    "description": "Basic haircut service",
    "duration": 30,
    "price": "25.00",
    "category": "hair",
    "isActive": true
  }' \
  -b cookies.txt \
  -s "http://localhost:9101/api/businesses/$BUSINESS_ID/services")
echo "Create service response: $NEW_SERVICE_RESPONSE"

# Test Staff Management
echo -e "\n📋 Test 3: Staff Management"
# List staff
echo "Testing GET staff"
curl -s -b cookies.txt "http://localhost:9101/api/businesses/$BUSINESS_ID/staff" | jq .

# Create new staff
echo "Testing POST new staff"
NEW_STAFF_RESPONSE=$(curl -X POST -H "Content-Type: application/json" \
  -d '{
    "name": "Test Staff",
    "email": "test.staff@example.com",
    "phone": "1234567890",
    "specialization": "hair",
    "status": "active",
    "schedule": {
      "monday": {"start": "09:00", "end": "17:00"}
    }
  }' \
  -b cookies.txt \
  -s "http://localhost:9101/api/businesses/$BUSINESS_ID/staff")
echo "Create staff response: $NEW_STAFF_RESPONSE"

# Test Dashboard Components
echo -e "\n📋 Test 4: Dashboard Component Loading"
for route in "" "/services" "/staff" "/bookings" "/analytics"; do
  echo "Testing dashboard route: /dashboard/$BUSINESS_ID$route"
  response=$(curl -s -o /dev/null -w "%{http_code}" -b cookies.txt "http://localhost:9101/dashboard/$BUSINESS_ID$route")
  if [ "$response" = "200" ]; then
    echo "✅ Route /dashboard/$BUSINESS_ID$route returned $response"
  else
    echo "❌ Route /dashboard/$BUSINESS_ID$route returned $response"
  fi
done

# Test Frontend Component States
echo -e "\n📋 Test 5: Frontend Component States"
# Test service list component
echo "Testing service list component"
curl -s -b cookies.txt "http://localhost:9101/dashboard/$BUSINESS_ID/services" | grep -q "Service Management" && echo "✅ Service management component loaded" || echo "❌ Service management component failed to load"

# Test staff list component
echo "Testing staff list component"
curl -s -b cookies.txt "http://localhost:9101/dashboard/$BUSINESS_ID/staff" | grep -q "Staff Management" && echo "✅ Staff management component loaded" || echo "❌ Staff management component failed to load"

# Test booking management component
echo "Testing booking management component"
curl -s -b cookies.txt "http://localhost:9101/dashboard/$BUSINESS_ID/bookings" | grep -q "Booking Management" && echo "✅ Booking management component loaded" || echo "❌ Booking management component failed to load"

echo -e "\n✨ Salon Dashboard Tests Completed"
echo "Check the responses above for any failed tests (❌)"
