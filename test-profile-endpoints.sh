#!/bin/bash

echo "🔧 Testing Profile Management System"
echo "===================================="

# Step 1: Register a new customer for testing
echo "1. Registering a new customer..."
REGISTER_RESULT=$(curl -s -X POST http://localhost:3000/api/simple/register/customer \
  -H "Content-Type: application/json" \
  -d '{"email":"profile-test-'$(date +%s)'@example.com","password":"testpass123","fullName":"Profile Test User"}' \
  -c profile-cookies.txt)

echo "Registration result: $REGISTER_RESULT"

# Check if registration successful
if echo "$REGISTER_RESULT" | grep -q '"ok":true'; then
    echo "✅ Registration successful"
    
    # Step 2: Test getting user preferences
    echo -e "\n2. Testing get preferences endpoint..."
    PREFS_RESULT=$(curl -s -X GET http://localhost:3000/api/simple/profile/preferences \
      -H "Content-Type: application/json" \
      -b profile-cookies.txt)
    
    echo "Preferences result: $PREFS_RESULT"
    
    if echo "$PREFS_RESULT" | grep -q '"ok":true'; then
        echo "✅ Get preferences working"
    else
        echo "❌ Get preferences failed"
    fi
    
    # Step 3: Test updating profile
    echo -e "\n3. Testing profile update..."
    PROFILE_UPDATE_RESULT=$(curl -s -X PUT http://localhost:3000/api/simple/profile \
      -H "Content-Type: application/json" \
      -b profile-cookies.txt \
      -d '{"fullName":"Updated Profile Test User","phone":"+61 400 123 456"}')
    
    echo "Profile update result: $PROFILE_UPDATE_RESULT"
    
    if echo "$PROFILE_UPDATE_RESULT" | grep -q '"ok":true'; then
        echo "✅ Profile update working"
    else
        echo "❌ Profile update failed"
    fi
    
    # Step 4: Test updating preferences
    echo -e "\n4. Testing preferences update..."
    PREFS_UPDATE_RESULT=$(curl -s -X PUT http://localhost:3000/api/simple/profile \
      -H "Content-Type: application/json" \
      -b profile-cookies.txt \
      -d '{"preferences":{"favoriteCategories":["salon","restaurant"],"preferredLocations":["Melbourne CBD"],"bookingReminders":true}}')
    
    echo "Preferences update result: $PREFS_UPDATE_RESULT"
    
    if echo "$PREFS_UPDATE_RESULT" | grep -q '"ok":true'; then
        echo "✅ Preferences update working"
    else
        echo "❌ Preferences update failed"
    fi
    
else
    echo "❌ Registration failed, cannot test profile endpoints"
    exit 1
fi

echo -e "\n🎉 Profile testing completed!"

# Clean up
rm -f profile-cookies.txt