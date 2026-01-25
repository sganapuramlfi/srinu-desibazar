#!/bin/bash

echo "🔍 Starting Frontend Component Tests for DesiBazaar"
echo "Testing base URL: http://localhost:9101"

# Test 1: Basic Component Rendering
echo -e "\n📋 Test 1: Component Rendering"
for route in "/" "/auth" "/nonexistent"; do
  echo "Testing route: $route"
  response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9101$route")
  if [ "$response" = "200" ]; then
    echo "✅ Route $route returned $response"
  else
    echo "❌ Route $route returned $response"
  fi
done

# Test 2: Industry Landing Pages
echo -e "\n📋 Test 2: Industry Landing Pages"
for industry in "salon" "restaurant" "event" "realestate" "retail" "professional"; do
  echo "Testing industry: $industry"
  response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9101/?type=$industry")
  if [ "$response" = "200" ]; then
    echo "✅ Industry page $industry returned $response"
  else
    echo "❌ Industry page $industry returned $response"
  fi
done

# Test 3: Salon-specific Routes
echo -e "\n📋 Test 3: Salon Management Routes"
BUSINESS_ID=1  # Example business ID
for route in \
  "/dashboard/$BUSINESS_ID" \
  "/dashboard/$BUSINESS_ID/services" \
  "/dashboard/$BUSINESS_ID/staff" \
  "/dashboard/$BUSINESS_ID/bookings" \
  "/dashboard/$BUSINESS_ID/analytics"; do
  echo "Testing salon route: $route"
  response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9101$route")
  if [ "$response" = "200" ] || [ "$response" = "401" ]; then
    echo "✅ Salon route $route returned $response (200 or 401 expected)"
  else
    echo "❌ Salon route $route returned unexpected $response"
  fi
done

# Test 4: Authentication Flow
echo -e "\n📋 Test 4: Authentication Flow"
# Test login with sample credentials
login_response=$(curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}' \
  -s -o /dev/null -w "%{http_code}" \
  http://localhost:9101/api/login)

if [ "$login_response" = "200" ] || [ "$login_response" = "401" ]; then
  echo "✅ Login endpoint returned $login_response"
else
  echo "❌ Login endpoint returned unexpected $login_response"
fi

# Test 5: Component Loading
echo -e "\n📋 Test 5: Component Loading"
echo "Testing service management component loading..."
service_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9101/dashboard/$BUSINESS_ID/services")
if [ "$service_response" = "200" ] || [ "$service_response" = "401" ]; then
  echo "✅ Service management component loaded (returned $service_response)"
else
  echo "❌ Service management component failed to load (returned $service_response)"
fi

echo "Testing staff management component loading..."
staff_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9101/dashboard/$BUSINESS_ID/staff")
if [ "$staff_response" = "200" ] || [ "$staff_response" = "401" ]; then
  echo "✅ Staff management component loaded (returned $staff_response)"
else
  echo "❌ Staff management component failed to load (returned $staff_response)"
fi

echo "Testing booking management component loading..."
booking_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9101/dashboard/$BUSINESS_ID/bookings")
if [ "$booking_response" = "200" ] || [ "$booking_response" = "401" ]; then
  echo "✅ Booking management component loaded (returned $booking_response)"
else
  echo "❌ Booking management component failed to load (returned $booking_response)"
fi


echo -e "\n✨ Frontend Component Tests Completed"
echo "Check the responses above for any failed tests (❌)"