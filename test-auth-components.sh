#!/bin/bash

echo "🔍 Starting Frontend Authentication Component Tests"
echo "Testing base URL: http://localhost:9101"

# Function to make HTTP requests and log responses
make_request() {
    local url="$1"
    local method="${2:-GET}"
    local data="$3"
    local description="$4"
    
    echo -e "\n📋 Testing: $description"
    echo "URL: $url"
    echo "Method: $method"
    if [ -n "$data" ]; then
        echo "Data: $data"
        response=$(curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    else
        response=$(curl -s -X "$method" "$url")
    fi
    
    echo "Response: $response"
    echo "-------------------------------------------"
}

# Test 1: Verify AuthPage component loads
echo -e "\n📋 Test 1: AuthPage Component Loading"
make_request "http://localhost:9101/auth" "GET" "" "Auth page load"

# Test 2: Test login form submission
echo -e "\n📋 Test 2: Login Form Submission"
login_data='{
    "username": "testuser",
    "password": "testpass123"
}'
make_request "http://localhost:9101/api/login" "POST" "$login_data" "Login form submission"

# Test 3: Test registration form submission
echo -e "\n📋 Test 3: Registration Form Submission"
register_data='{
    "username": "newuser'$RANDOM'",
    "password": "testpass123",
    "email": "test'$RANDOM'@example.com",
    "role": "business",
    "business": {
        "name": "Test Business",
        "industryType": "salon",
        "description": "Test Description"
    }
}'
make_request "http://localhost:9101/api/register" "POST" "$register_data" "Registration form submission"

# Test 4: Check authentication state endpoint
echo -e "\n📋 Test 4: Authentication State Check"
make_request "http://localhost:9101/api/user" "GET" "" "Auth state check"

echo -e "\n✨ Frontend Authentication Component Tests Completed"
echo "Check the logs above for detailed results and any errors"
