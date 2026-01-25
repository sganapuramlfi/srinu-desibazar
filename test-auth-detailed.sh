#!/bin/bash

echo "🔍 Starting Detailed Authentication Flow Test"
echo "Testing base URL: http://localhost:9101"

# Function to make HTTP requests and store cookies
make_request() {
    local url="$1"
    local method="${2:-GET}"
    local data="$3"
    local description="$4"
    local cookie_jar="cookies.txt"
    
    echo -e "\n📋 Testing: $description"
    echo "URL: $url"
    echo "Method: $method"
    
    if [ -n "$data" ]; then
        echo "Request Data: $data"
        response=$(curl -s -X "$method" \
            -c "$cookie_jar" -b "$cookie_jar" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    else
        response=$(curl -s -X "$method" \
            -c "$cookie_jar" -b "$cookie_jar" \
            "$url")
    fi
    
    echo "Response: $response"
    echo "Cookies:"
    cat "$cookie_jar"
    echo "-------------------------------------------"
    
    # Return response for further processing
    echo "$response"
}

# Test 1: Register new user
echo -e "\n📋 Test 1: User Registration"
register_data='{
    "username": "testuser'$RANDOM'",
    "password": "testpass123",
    "email": "test'$RANDOM'@example.com",
    "role": "business",
    "business": {
        "name": "Test Business",
        "industryType": "salon",
        "description": "Test Description"
    }
}'

register_response=$(make_request "http://localhost:9101/api/register" "POST" "$register_data" "Registration")
username=$(echo $register_response | jq -r '.user.username')
echo "Created user: $username"

# Test 2: Immediate session check after registration
echo -e "\n📋 Test 2: Session Check After Registration"
make_request "http://localhost:9101/api/user" "GET" "" "Session check after registration"

# Test 3: Logout
echo -e "\n📋 Test 3: Logout"
make_request "http://localhost:9101/api/logout" "POST" "" "Logout"

# Test 4: Login with created user
echo -e "\n📋 Test 4: Login"
login_data="{
    \"username\": \"$username\",
    \"password\": \"testpass123\"
}"
make_request "http://localhost:9101/api/login" "POST" "$login_data" "Login"

# Test 5: Session check after login
echo -e "\n📋 Test 5: Session Check After Login"
make_request "http://localhost:9101/api/user" "GET" "" "Session check after login"

# Cleanup
rm -f cookies.txt

echo -e "\n✨ Detailed Authentication Flow Test Completed"
