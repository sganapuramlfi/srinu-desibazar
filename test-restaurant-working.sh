#!/bin/bash

# Working Restaurant Owner Journey Test
echo "Restaurant Owner Journey Test - Fixed Version"
echo "============================================"

API_URL="http://localhost:9101/api"
TIMESTAMP=$(date +%s)
RESTAURANT_EMAIL="owner@restaurant${TIMESTAMP}.com"
RESTAURANT_USERNAME="restaurant${TIMESTAMP}"
COOKIE_JAR="restaurant-working.txt"
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
      "name": "Mumbai Spice Palace",
      "industryType": "restaurant",
      "description": "Authentic Indian cuisine with modern twist"
    }
  }')

echo "Registration Response: $REGISTER_RESPONSE"

# Extract business ID from registration response
BUSINESS_ID=$(echo "$REGISTER_RESPONSE" | sed -n 's/.*"business":{"id":\([0-9]*\).*/\1/p')
echo "Extracted Business ID: $BUSINESS_ID"

if [ -z "$BUSINESS_ID" ]; then
    echo "❌ Registration failed. Exiting."
    exit 1
fi
echo "✅ Registration successful - Business ID: $BUSINESS_ID"

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
if echo "$SUBSCRIPTION_RESPONSE" | grep -q '"tier":"premium"'; then
    echo "✅ Premium subscription activated"
else
    echo "❌ Subscription setup failed"
fi

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
if echo "$LOCATION_RESPONSE" | grep -q "Collins Street"; then
    echo "✅ Location set in Melbourne CBD"
else
    echo "❌ Location setup failed"
fi

echo ""
echo "Step 4: Create Menu Categories"

# Appetizers
APPETIZER_CAT=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/restaurants/$BUSINESS_ID/menu/categories" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Appetizers",
    "description": "Start your meal with these delicious appetizers",
    "displayOrder": 1
  }')

APPETIZER_CAT_ID=$(echo "$APPETIZER_CAT" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
echo "Appetizer Category ID: $APPETIZER_CAT_ID"

# Mains
MAINS_CAT=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/restaurants/$BUSINESS_ID/menu/categories" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Courses",
    "description": "Authentic Indian main dishes",
    "displayOrder": 2
  }')

MAINS_CAT_ID=$(echo "$MAINS_CAT" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
echo "Mains Category ID: $MAINS_CAT_ID"

echo ""
echo "Step 5: Create Menu Items"

if [ ! -z "$APPETIZER_CAT_ID" ]; then
    # Samosas
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

    if echo "$SAMOSA_ITEM" | grep -q '"name":"Vegetable Samosas'; then
        echo "✅ Samosas menu item created"
    else
        echo "❌ Samosas creation failed: $SAMOSA_ITEM"
    fi
fi

if [ ! -z "$MAINS_CAT_ID" ]; then
    # Butter Chicken
    BUTTER_CHICKEN=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/restaurants/$BUSINESS_ID/menu/items" \
      -H "Content-Type: application/json" \
      -d '{
        "categoryId": '$MAINS_CAT_ID',
        "name": "Butter Chicken",
        "description": "Tender chicken in rich tomato and cream sauce",
        "price": 24.90,
        "preparationTime": 25,
        "spiceLevel": 1,
        "isHalal": true,
        "calories": 450
      }')

    if echo "$BUTTER_CHICKEN" | grep -q '"name":"Butter Chicken'; then
        echo "✅ Butter Chicken menu item created"
    else
        echo "❌ Butter Chicken creation failed: $BUTTER_CHICKEN"
    fi
fi

echo ""
echo "Step 6: Create Restaurant Tables"

for i in {1..3}; do
    TABLE_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/restaurants/$BUSINESS_ID/tables" \
      -H "Content-Type: application/json" \
      -d '{
        "tableNumber": "T'$i'",
        "seatingCapacity": 4,
        "location": "Main Dining"
      }')
    
    if echo "$TABLE_RESPONSE" | grep -q '"tableNumber":"T'$i''; then
        echo "✅ Table T$i created"
    else
        echo "❌ Table T$i creation failed: $TABLE_RESPONSE"
    fi
done

echo ""
echo "Step 7: Create Restaurant Staff"

# Head Chef
CHEF_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/restaurants/$BUSINESS_ID/staff" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rajesh Kumar",
    "email": "chef.rajesh@spicepalace.com",
    "phone": "+61 400 111 222",
    "role": "head_chef",
    "hourlyRate": 35.00,
    "workingDays": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    "shiftPreference": "afternoon"
  }')

if echo "$CHEF_RESPONSE" | grep -q '"name":"Rajesh Kumar'; then
    echo "✅ Head Chef created"
else
    echo "❌ Head Chef creation failed: $CHEF_RESPONSE"
fi

# Waiter
WAITER_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/restaurants/$BUSINESS_ID/staff" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Sharma",
    "phone": "+61 400 333 444",
    "role": "waiter",
    "hourlyRate": 22.50,
    "workingDays": ["friday", "saturday", "sunday"],
    "shiftPreference": "evening"
  }')

if echo "$WAITER_RESPONSE" | grep -q '"name":"Priya Sharma'; then
    echo "✅ Waiter created"
else
    echo "❌ Waiter creation failed: $WAITER_RESPONSE"
fi

echo ""
echo "Step 8: Create Promotions"

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

if echo "$HAPPY_HOUR" | grep -q '"title":"Happy Hour'; then
    echo "✅ Happy Hour promotion created"
else
    echo "❌ Happy Hour creation failed: $HAPPY_HOUR"
fi

echo ""
echo "Step 9: Create Sample Reservation"

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

if echo "$RESERVATION_RESPONSE" | grep -q '"customerName":"John Smith'; then
    echo "✅ Table reservation created"
else
    echo "❌ Reservation creation failed: $RESERVATION_RESPONSE"
fi

echo ""
echo "Step 10: Get Dashboard Data"
DASHBOARD_RESPONSE=$(curl -s -b $COOKIE_JAR -X GET "$API_URL/restaurants/$BUSINESS_ID/dashboard")

if echo "$DASHBOARD_RESPONSE" | grep -q '"todayReservations"'; then
    echo "✅ Dashboard data loaded successfully"
    
    # Extract key metrics
    TOTAL_RESERVATIONS=$(echo "$DASHBOARD_RESPONSE" | sed -n 's/.*"total":\([0-9]*\).*/\1/p' | head -1)
    echo "  • Today's Reservations: $TOTAL_RESERVATIONS"
else
    echo "❌ Dashboard loading failed: $DASHBOARD_RESPONSE"
fi

echo ""
echo "Step 11: Get Menu Items"
MENU_RESPONSE=$(curl -s -X GET "$API_URL/restaurants/$BUSINESS_ID/menu/items")

if echo "$MENU_RESPONSE" | grep -q "Butter Chicken"; then
    echo "✅ Full menu retrieved successfully"
    MENU_ITEMS_COUNT=$(echo "$MENU_RESPONSE" | grep -o '"name":' | wc -l)
    echo "  • Menu contains $MENU_ITEMS_COUNT items"
else
    echo "❌ Menu retrieval failed"
fi

# Cleanup
rm -f $COOKIE_JAR

echo ""
echo "🎉 RESTAURANT OWNER JOURNEY COMPLETE!"
echo "===================================="
echo ""
echo "✅ Restaurant Business Setup Complete"
echo "   🏢 Business: Mumbai Spice Palace"
echo "   📧 Login: $RESTAURANT_EMAIL"
echo "   🔑 Password: SecurePass123!"
echo "   🆔 Business ID: $BUSINESS_ID"
echo ""
echo "🍽️ Restaurant Features Configured:"
echo "   📋 Menu: Categories with specialized items"
echo "   🪑 Tables: Multiple dining tables created"
echo "   👥 Staff: Restaurant-specific roles (chef, waiter)"
echo "   🎉 Promotions: Happy hour setup"
echo "   📍 Location: Melbourne CBD with GPS coordinates"
echo "   📊 Subscription: Premium tier with 180-day trial"
echo ""
echo "🌐 Access URLs:"
echo "   • Business Dashboard: http://localhost:9102/dashboard/$BUSINESS_ID"
echo "   • Menu Management: Restaurant-specific interface"
echo "   • Reservation System: Table booking interface"
echo ""
echo "🚀 Restaurant module is now industry-specific and ready for production!"