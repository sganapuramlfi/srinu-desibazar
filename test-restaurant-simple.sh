#!/bin/bash

# Simple Restaurant Owner Journey Test - Windows Compatible
echo "Restaurant Owner Journey Test"
echo "============================="

API_URL="http://localhost:9101/api"
TIMESTAMP=$(date +%s)
RESTAURANT_EMAIL="owner@spice${TIMESTAMP}.com"
RESTAURANT_USERNAME="spice${TIMESTAMP}"
COOKIE_JAR="restaurant-test.txt"
rm -f $COOKIE_JAR

echo ""
echo "Step 1: Restaurant Owner Registration"
REGISTER_RESPONSE=$(curl -s -c $COOKIE_JAR -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'$RESTAURANT_USERNAME'",
    "email": "'$RESTAURANT_EMAIL'",
    "password": "SecurePass123!",
    "role": "business",
    "business": {
      "name": "Spice Paradise Melbourne",
      "industryType": "restaurant",
      "description": "Authentic Indian cuisine in Melbourne CBD"
    }
  }')

echo "Registration Response: $REGISTER_RESPONSE"

# Extract business ID
BUSINESS_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "Business ID: $BUSINESS_ID"

if [ -z "$BUSINESS_ID" ]; then
    echo "Registration failed. Exiting."
    exit 1
fi

echo ""
echo "Step 2: Premium Subscription Setup"
SUBSCRIPTION_RESPONSE=$(curl -s -b $COOKIE_JAR -X PUT "$API_URL/businesses/$BUSINESS_ID/subscription" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "premium",
    "enabledModules": ["restaurant"],
    "adTargeting": "both"
  }')

echo "Subscription Response: $SUBSCRIPTION_RESPONSE"

echo ""
echo "Step 3: Location Setup"
LOCATION_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/businesses/$BUSINESS_ID/location" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -37.8136,
    "longitude": 144.9631,
    "address": "123 Collins Street",
    "city": "Melbourne",
    "suburb": "CBD",
    "state": "Victoria",
    "postcode": "3000"
  }')

echo "Location Response: $LOCATION_RESPONSE"

echo ""
echo "Step 4: Create Menu Category"
APPETIZER_CAT=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/restaurants/$BUSINESS_ID/menu/categories" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Appetizers",
    "description": "Start your meal with these delicious appetizers",
    "displayOrder": 1
  }')

echo "Appetizer Category Response: $APPETIZER_CAT"

# Extract category ID
APPETIZER_CAT_ID=$(echo "$APPETIZER_CAT" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "Appetizer Category ID: $APPETIZER_CAT_ID"

if [ ! -z "$APPETIZER_CAT_ID" ]; then
    echo ""
    echo "Step 5: Create Menu Item"
    SAMOSA_ITEM=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/restaurants/$BUSINESS_ID/menu/items" \
      -H "Content-Type: application/json" \
      -d '{
        "categoryId": '$APPETIZER_CAT_ID',
        "name": "Vegetable Samosas (2 pieces)",
        "description": "Crispy pastries filled with spiced vegetables",
        "price": 8.50,
        "preparationTime": 15,
        "spiceLevel": 2,
        "isVegetarian": true,
        "isVegan": true,
        "calories": 220
      }')

    echo "Samosa Item Response: $SAMOSA_ITEM"
fi

echo ""
echo "Step 6: Create Restaurant Table"
TABLE_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/restaurants/$BUSINESS_ID/tables" \
  -H "Content-Type: application/json" \
  -d '{
    "tableNumber": "T1",
    "seatingCapacity": 4,
    "location": "Main Dining"
  }')

echo "Table Response: $TABLE_RESPONSE"

echo ""
echo "Step 7: Create Staff Member"
CHEF_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/restaurants/$BUSINESS_ID/staff" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rajesh Kumar",
    "email": "chef.rajesh@spiceparadise.com",
    "phone": "+61 400 111 222",
    "role": "head_chef",
    "hourlyRate": 35.00,
    "workingDays": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    "shiftPreference": "afternoon"
  }')

echo "Chef Response: $CHEF_RESPONSE"

echo ""
echo "Step 8: Create Promotion"
TOMORROW=$(date -d "tomorrow" '+%Y-%m-%d' 2>/dev/null || date -v +1d '+%Y-%m-%d')
NEXT_WEEK=$(date -d "next week" '+%Y-%m-%d' 2>/dev/null || date -v +1w '+%Y-%m-%d')

HAPPY_HOUR=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/restaurants/$BUSINESS_ID/promotions" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Happy Hour - 20% Off All Beverages",
    "description": "Enjoy 20% discount on all beverages from 5-7 PM",
    "type": "happy_hour",
    "discountType": "percentage",
    "discountValue": 20,
    "startDate": "'$TOMORROW'T00:00:00Z",
    "endDate": "'$NEXT_WEEK'T23:59:59Z"
  }')

echo "Happy Hour Response: $HAPPY_HOUR"

echo ""
echo "Step 9: Create Table Reservation"
RESERVATION_TIME=$(date -d "tomorrow 19:00" '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -v +1d -v 19H '+%Y-%m-%dT%H:%M:%S')

RESERVATION_RESPONSE=$(curl -s -X POST "$API_URL/restaurants/$BUSINESS_ID/reservations" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Smith",
    "customerPhone": "+61 400 123 456",
    "customerEmail": "john.smith@email.com",
    "partySize": 4,
    "reservationDate": "'$RESERVATION_TIME'",
    "specialRequests": "Window table preferred, celebrating anniversary"
  }')

echo "Reservation Response: $RESERVATION_RESPONSE"

echo ""
echo "Step 10: Get Dashboard Data"
DASHBOARD_RESPONSE=$(curl -s -b $COOKIE_JAR -X GET "$API_URL/restaurants/$BUSINESS_ID/dashboard")
echo "Dashboard Response: $DASHBOARD_RESPONSE"

echo ""
echo "Step 11: Get Menu Items"
MENU_RESPONSE=$(curl -s -X GET "$API_URL/restaurants/$BUSINESS_ID/menu/items")
echo "Menu Response: $MENU_RESPONSE"

# Cleanup
rm -f $COOKIE_JAR

echo ""
echo "Test Complete!"
echo "Business ID: $BUSINESS_ID"
echo "Email: $RESTAURANT_EMAIL"
echo "Password: SecurePass123!"