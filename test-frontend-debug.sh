#!/bin/bash

echo "Starting frontend debug test for rescheduling flow..."
BASE_URL="http://localhost:5000"
COOKIES_FILE="cookies.txt"

# Login as ctest user
echo -e "\n1. Logging in as ctest user..."
curl -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"ctest","password":"Test@1234"}' \
  -c "$COOKIES_FILE" \
  -v

# Get user details to confirm login
echo -e "\n2. Verifying user session..."
curl "$BASE_URL/api/user" \
  -b "$COOKIES_FILE" \
  -v

# Get current bookings
echo -e "\n3. Fetching current bookings..."
curl "$BASE_URL/api/bookings" \
  -b "$COOKIES_FILE" \
  -v

# Get available slots for the next day
TOMORROW=$(date -d "tomorrow" +%Y-%m-%d)
echo -e "\n4. Fetching available slots for $TOMORROW..."
curl "$BASE_URL/api/businesses/19/slots/available?date=$TOMORROW" \
  -b "$COOKIES_FILE" \
  -v

# For each booking, try to fetch rescheduling slots
echo -e "\n5. Testing slot availability for rescheduling specific booking..."
BOOKING_ID=72  # Using the known booking ID from previous tests
curl "$BASE_URL/api/businesses/19/slots?startDate=$TOMORROW&endDate=$TOMORROW&serviceId=3" \
  -b "$COOKIES_FILE" \
  -v

# Try to reschedule the booking
echo -e "\n6. Attempting to reschedule booking..."
curl -X POST "$BASE_URL/api/businesses/19/bookings/$BOOKING_ID/reschedule" \
  -b "$COOKIES_FILE" \
  -H "Content-Type: application/json" \
  -d "{\"slotId\": 753, \"date\": \"$TOMORROW\", \"notes\": \"Testing rescheduling flow\"}" \
  -v

echo -e "\nDebug test completed. Please check the responses above for any issues."
