#!/bin/bash

echo "🔧 Testing Authentication Fix"
echo "=============================="

# Test 1: Register new customer
echo "1. Testing customer registration..."
REGISTER_RESULT=$(curl -s -X POST http://localhost:3000/api/simple/register/customer \
  -H "Content-Type: application/json" \
  -d '{"email":"authtest@example.com","password":"testpass123","fullName":"Auth Test User"}' \
  -c test-register-cookies.txt)

echo "Registration result: $REGISTER_RESULT"

# Check if registration was successful
if echo "$REGISTER_RESULT" | grep -q '"ok":true'; then
    echo "✅ Registration successful"
else
    echo "❌ Registration failed"
    exit 1
fi

# Test 2: Login with the same user
echo -e "\n2. Testing login with registered user..."
LOGIN_RESULT=$(curl -s -X POST http://localhost:3000/api/simple/login \
  -H "Content-Type: application/json" \
  -d '{"email":"authtest@example.com","password":"testpass123"}' \
  -c test-login-cookies.txt)

echo "Login result: $LOGIN_RESULT"

# Check if login was successful
if echo "$LOGIN_RESULT" | grep -q '"ok":true'; then
    echo "✅ Login successful"
else
    echo "❌ Login failed"
    exit 1
fi

# Test 3: Verify session persistence
echo -e "\n3. Testing session persistence..."
USER_RESULT=$(curl -s -X GET http://localhost:3000/api/simple/user \
  -H "Content-Type: application/json" \
  -b test-login-cookies.txt)

echo "User data: $USER_RESULT"

# Check if user data is returned (not 401)
if echo "$USER_RESULT" | grep -q '"email":"authtest@example.com"'; then
    echo "✅ Session persistence working"
else
    echo "❌ Session persistence failed"
    exit 1
fi

# Test 4: Logout
echo -e "\n4. Testing logout..."
LOGOUT_RESULT=$(curl -s -X POST http://localhost:3000/api/simple/logout \
  -H "Content-Type: application/json" \
  -b test-login-cookies.txt)

echo "Logout result: $LOGOUT_RESULT"

# Check if logout was successful
if echo "$LOGOUT_RESULT" | grep -q '"ok":true'; then
    echo "✅ Logout successful"
else
    echo "❌ Logout failed"
    exit 1
fi

# Test 5: Verify session is cleared
echo -e "\n5. Testing session cleared after logout..."
USER_AFTER_LOGOUT=$(curl -s -X GET http://localhost:3000/api/simple/user \
  -H "Content-Type: application/json" \
  -b test-login-cookies.txt)

echo "User data after logout: $USER_AFTER_LOGOUT"

# Check if user data is not returned (401)
if echo "$USER_AFTER_LOGOUT" | grep -q '"ok":false'; then
    echo "✅ Session cleared after logout"
else
    echo "❌ Session not properly cleared"
    exit 1
fi

echo -e "\n🎉 All authentication tests passed!"
echo "The authentication fix is working correctly."

# Clean up test files
rm -f test-register-cookies.txt test-login-cookies.txt

echo -e "\n📋 Summary:"
echo "✅ Customer registration works"
echo "✅ Login with email/password works"
echo "✅ Session persistence works"
echo "✅ Logout works"
echo "✅ Session cleanup works"
echo -e "\n🔧 Frontend form fields now match backend API (email instead of username)"