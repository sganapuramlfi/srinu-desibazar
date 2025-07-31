#!/bin/bash

echo "🔍 Starting Industry-specific Authentication Tests"
echo "Testing base URL: http://localhost:5000"

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
            -c cookies.txt \
            "$url")
    else
        response=$(curl -s -X "$method" -b cookies.txt "$url")
    fi
    
    echo "Response: $response"
    echo "-------------------------------------------"
}

# Test registration for each industry type
echo -e "\n🏢 Testing Business Registration for Each Industry"

# 1. Salon Business
salon_data='{
    "username": "salon_test'$RANDOM'",
    "password": "Test@1234",
    "email": "salon'$RANDOM'@test.com",
    "role": "business",
    "business": {
        "name": "Test Salon",
        "industryType": "salon",
        "description": "Test Salon Description"
    }
}'
make_request "http://localhost:5000/api/register" "POST" "$salon_data" "Salon Business Registration"

# 2. Restaurant Business
restaurant_data='{
    "username": "resto_test'$RANDOM'",
    "password": "Test@1234",
    "email": "resto'$RANDOM'@test.com",
    "role": "business",
    "business": {
        "name": "Test Restaurant",
        "industryType": "restaurant",
        "description": "Test Restaurant Description"
    }
}'
make_request "http://localhost:5000/api/register" "POST" "$restaurant_data" "Restaurant Business Registration"

# 3. Event Management Business
event_data='{
    "username": "event_test'$RANDOM'",
    "password": "Test@1234",
    "email": "event'$RANDOM'@test.com",
    "role": "business",
    "business": {
        "name": "Test Event Management",
        "industryType": "event",
        "description": "Test Event Description"
    }
}'
make_request "http://localhost:5000/api/register" "POST" "$event_data" "Event Business Registration"

# 4. Real Estate Business
realestate_data='{
    "username": "realestate_test'$RANDOM'",
    "password": "Test@1234",
    "email": "realestate'$RANDOM'@test.com",
    "role": "business",
    "business": {
        "name": "Test Real Estate",
        "industryType": "realestate",
        "description": "Test Real Estate Description"
    }
}'
make_request "http://localhost:5000/api/register" "POST" "$realestate_data" "Real Estate Business Registration"

# 5. Retail Business
retail_data='{
    "username": "retail_test'$RANDOM'",
    "password": "Test@1234",
    "email": "retail'$RANDOM'@test.com",
    "role": "business",
    "business": {
        "name": "Test Retail Store",
        "industryType": "retail",
        "description": "Test Retail Description"
    }
}'
make_request "http://localhost:5000/api/register" "POST" "$retail_data" "Retail Business Registration"

# 6. Professional Services Business
professional_data='{
    "username": "prof_test'$RANDOM'",
    "password": "Test@1234",
    "email": "prof'$RANDOM'@test.com",
    "role": "business",
    "business": {
        "name": "Test Professional Services",
        "industryType": "professional",
        "description": "Test Professional Description"
    }
}'
make_request "http://localhost:5000/api/register" "POST" "$professional_data" "Professional Services Business Registration"

# Test Customer Registration
customer_data='{
    "username": "customer_test'$RANDOM'",
    "password": "Test@1234",
    "email": "customer'$RANDOM'@test.com",
    "role": "customer"
}'
make_request "http://localhost:5000/api/register" "POST" "$customer_data" "Customer Registration"

# Verify Authentication State
make_request "http://localhost:5000/api/user" "GET" "" "Authentication State Check"

echo -e "\n✨ Industry-specific Authentication Tests Completed"
echo "Check the logs above for detailed results and any errors"
