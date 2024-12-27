#!/bin/bash

# Colors for better visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base URL
BASE_URL="http://localhost:5000/api"

# Store IDs and tokens
BUSINESS_ID=""
SERVICE_ID=""
STAFF_ID=""
SLOT_ID=""
BOOKING_ID=""
CAMPAIGN_ID=""
CONVERSATION_ID=""

echo -e "${BLUE}Starting comprehensive API testing...${NC}\n"

# Function to make API calls and handle responses
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local cookie=$4
    local expected_status=${5:-200}

    echo -e "\n${BLUE}Testing ${method} ${endpoint}${NC}"
    echo "Request payload: ${data}"

    local curl_cmd="curl -s -w \n%{http_code} -X ${method}"
    curl_cmd+=" -H 'Content-Type: application/json'"

    if [ ! -z "$cookie" ]; then
        curl_cmd+=" -H 'Cookie: ${cookie}'"
    fi

    if [ ! -z "$data" ]; then
        curl_cmd+=" -d '${data}'"
    fi

    curl_cmd+=" ${BASE_URL}${endpoint}"

    echo "Executing: ${curl_cmd}"
    local response=$(eval ${curl_cmd})
    local status_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    echo -e "Status: ${status_code}"
    echo "Response: ${body}"

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ Test passed${NC}"
    else
        echo -e "${RED}✗ Test failed - Expected ${expected_status}, got ${status_code}${NC}"
    fi

    echo "$body"
}

echo -e "${BLUE}1. Testing Authentication${NC}"

# Register business user
echo "Registering new business user..."
register_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "username": "testuser2",
        "password": "testpass123",
        "email": "test2@example.com",
        "role": "business",
        "business": {
            "name": "Test Salon",
            "industryType": "salon",
            "description": "Test Description"
        }
    }' \
    "${BASE_URL}/register")

echo "Registration response: ${register_response}"

# Login and capture session cookie
echo "Logging in..."
login_response=$(curl -i -s -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "username": "testuser2",
        "password": "testpass123"
    }' \
    "${BASE_URL}/login")

echo "Full login response: ${login_response}"

# Extract session cookie and business ID
SESSION_COOKIE=$(echo "$login_response" | grep -i "set-cookie" | cut -d' ' -f2)
BUSINESS_ID=$(echo "$login_response" | grep -o '"business":{[^}]*"id":[0-9]*' | grep -o '"id":[0-9]*' | cut -d':' -f2)

echo "Extracted Business ID: ${BUSINESS_ID}"
echo "Session Cookie: ${SESSION_COOKIE}"

if [ -z "$BUSINESS_ID" ] || [ -z "$SESSION_COOKIE" ]; then
    echo -e "${RED}Failed to get authentication credentials${NC}"
    echo "Full login response for debugging:"
    echo "$login_response"
    exit 1
fi

echo -e "\n${BLUE}2. Testing Business Profile${NC}"

# Update business profile
call_api "PUT" "/businesses/${BUSINESS_ID}/profile" '{
    "name": "Updated Test Salon",
    "description": "Updated salon description",
    "contactInfo": {
        "phone": "1234567890",
        "email": "business@test.com",
        "address": "123 Test St"
    },
    "operatingHours": {
        "monday": {"open": "09:00", "close": "18:00", "isOpen": true},
        "tuesday": {"open": "09:00", "close": "18:00", "isOpen": true}
    }
}' "${SESSION_COOKIE}"

# Get profile
call_api "GET" "/businesses/${BUSINESS_ID}/profile" "" "${SESSION_COOKIE}"

echo -e "\n${BLUE}3. Testing Service Management${NC}"

# Create service
service_response=$(call_api "POST" "/businesses/${BUSINESS_ID}/services" '{
    "name": "Haircut",
    "description": "Basic haircut service",
    "duration": 60,
    "price": 50,
    "category": "hair"
}' "${SESSION_COOKIE}")

SERVICE_ID=$(echo "$service_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
echo "Created Service ID: ${SERVICE_ID}"

# Create staff member
staff_response=$(call_api "POST" "/businesses/${BUSINESS_ID}/staff" '{
    "name": "John Doe",
    "email": "john@test.com",
    "phone": "1234567890",
    "specialization": "hair"
}' "${SESSION_COOKIE}")

STAFF_ID=$(echo "$staff_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
echo "Created Staff ID: ${STAFF_ID}"

if [ ! -z "$SERVICE_ID" ] && [ ! -z "$STAFF_ID" ]; then
    echo -e "\n${BLUE}4. Testing Slot Management${NC}"

    # Create slot
    slot_response=$(call_api "POST" "/businesses/${BUSINESS_ID}/slots" "{
        \"serviceId\": ${SERVICE_ID},
        \"staffId\": ${STAFF_ID},
        \"startTime\": \"2024-12-28T10:00:00Z\",
        \"endTime\": \"2024-12-28T11:00:00Z\"
    }" "${SESSION_COOKIE}")

    SLOT_ID=$(echo "$slot_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo "Created Slot ID: ${SLOT_ID}"

    # Create booking
    if [ ! -z "$SLOT_ID" ]; then
        booking_response=$(call_api "POST" "/businesses/${BUSINESS_ID}/bookings" "{
            \"serviceId\": ${SERVICE_ID},
            \"slotId\": ${SLOT_ID},
            \"notes\": \"Test booking\"
        }" "${SESSION_COOKIE}")

        BOOKING_ID=$(echo "$booking_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        echo "Created Booking ID: ${BOOKING_ID}"
    fi
fi

echo -e "\n${BLUE}5. Testing Messaging System${NC}"

# Create conversation
conversation_response=$(call_api "POST" "/conversations" '{
    "type": "booking",
    "role": "business"
}' "${SESSION_COOKIE}")

CONVERSATION_ID=$(echo "$conversation_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
echo "Created Conversation ID: ${CONVERSATION_ID}"

if [ ! -z "$CONVERSATION_ID" ]; then
    # Send message
    call_api "POST" "/conversations/${CONVERSATION_ID}/messages" '{
        "content": "Test message about booking",
        "type": "text"
    }' "${SESSION_COOKIE}"
fi

echo -e "\n${BLUE}6. Testing Waitlist System${NC}"

if [ ! -z "$SERVICE_ID" ] && [ ! -z "$STAFF_ID" ]; then
    # Add to waitlist
    call_api "POST" "/businesses/${BUSINESS_ID}/waitlist" "{
        \"serviceId\": ${SERVICE_ID},
        \"preferredStaffId\": ${STAFF_ID},
        \"preferredTimeSlots\": {
            \"dayOfWeek\": [1, 2, 3],
            \"timeRanges\": [
                {\"start\": \"10:00\", \"end\": \"12:00\"}
            ]
        }
    }" "${SESSION_COOKIE}"
fi

echo -e "\n${BLUE}7. Testing Ad Campaign System${NC}"

# Create campaign
campaign_response=$(call_api "POST" "/businesses/${BUSINESS_ID}/ad-campaigns" '{
    "name": "Summer Special",
    "budget": 1000,
    "startDate": "2024-12-28T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "targetAudience": {
        "locations": ["New York"],
        "interests": ["beauty"],
        "age": {"min": 18, "max": 65}
    }
}' "${SESSION_COOKIE}")

CAMPAIGN_ID=$(echo "$campaign_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
echo "Created Campaign ID: ${CAMPAIGN_ID}"

if [ ! -z "$CAMPAIGN_ID" ]; then
    # Create advertisement
    call_api "POST" "/businesses/${BUSINESS_ID}/advertisements" "{
        \"campaignId\": ${CAMPAIGN_ID},
        \"spaceId\": 1,
        \"title\": \"Summer Haircut Special\",
        \"description\": \"Get 20% off on all haircuts\",
        \"imageUrl\": \"https://example.com/ad-image.jpg\",
        \"targetUrl\": \"https://example.com/summer-special\",
        \"startDate\": \"2024-12-28T00:00:00Z\",
        \"endDate\": \"2024-12-31T23:59:59Z\"
    }" "${SESSION_COOKIE}"
fi

echo -e "\n${BLUE}8. Testing Booking Rescheduling${NC}"

if [ ! -z "$BOOKING_ID" ] && [ ! -z "$SLOT_ID" ]; then
    # Reschedule booking
    call_api "POST" "/businesses/${BUSINESS_ID}/bookings/${BOOKING_ID}/reschedule" "{
        \"newSlotId\": ${SLOT_ID},
        \"previousSlotId\": ${SLOT_ID},
        \"reason\": \"Customer requested new time\"
    }" "${SESSION_COOKIE}"
fi

echo -e "\n${GREEN}Testing completed!${NC}"