#!/bin/bash

echo "🔍 Starting Frontend Component Tests for DesiBazaar"
echo "Testing base URL: http://localhost:5000"

# Test 1: Basic Component Rendering
echo -e "\n📋 Test 1: Component Rendering"
for route in "/" "/auth" "/nonexistent"; do
  echo "Testing route: $route"
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000$route"
  echo ""
done

# Test 2: Industry Landing Pages
echo -e "\n📋 Test 2: Industry Landing Pages"
for industry in "salon" "restaurant" "event" "realestate" "retail" "professional"; do
  echo "Testing industry: $industry"
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/?type=$industry"
  echo ""
done

# Test 3: Authentication Flow
echo -e "\n📋 Test 3: Authentication Flow"
# Test login with sample credentials
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}' \
  http://localhost:5000/api/login

echo -e "\n✨ Frontend Component Tests Completed"
