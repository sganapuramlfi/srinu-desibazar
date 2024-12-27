#!/bin/bash
set -e

# Store the cookie jar
COOKIE_JAR="cookies.txt"

# Login first to get session cookie
echo "Logging in..."
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser1", "password": "Test@1234"}' \
  -c $COOKIE_JAR

echo -e "\nCreating new staff member..."
CREATE_RESPONSE=$(curl -X POST http://localhost:5000/api/businesses/1/staff \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d '{
    "name": "Test Staff Member",
    "email": "staff@test.com",
    "phone": "1234567890",
    "specialization": "Hair Styling",
    "status": "active"
  }')
echo $CREATE_RESPONSE

# Extract staff ID from response for later use
STAFF_ID=$(echo $CREATE_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

echo -e "\nFetching all staff members..."
curl -X GET http://localhost:5000/api/businesses/1/staff \
  -b $COOKIE_JAR

echo -e "\nUpdating staff member..."
curl -X PUT http://localhost:5000/api/businesses/1/staff/$STAFF_ID \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d '{
    "name": "Updated Staff Name",
    "email": "updated@test.com",
    "phone": "9876543210",
    "specialization": "Hair Coloring",
    "status": "on_leave"
  }'

echo -e "\nFetching updated staff member..."
curl -X GET http://localhost:5000/api/businesses/1/staff \
  -b $COOKIE_JAR

echo -e "\nDeleting staff member..."
curl -X DELETE http://localhost:5000/api/businesses/1/staff/$STAFF_ID \
  -b $COOKIE_JAR

echo -e "\nVerifying deletion..."
curl -X GET http://localhost:5000/api/businesses/1/staff \
  -b $COOKIE_JAR
