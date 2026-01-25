#!/bin/bash

echo "🧞‍♂️ Testing Enhanced Abrakadabra Two-Tier AI System"
echo "=================================================="

# Test public tier (anonymous user)
echo ""
echo "🔓 TEST 1: Public Tier - Anonymous User Query"
echo "Query: 'i want book a table in spice pavilion cbd'"
curl -X POST http://localhost:3000/api/ai-abrakadabra/public/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "i want book a table in spice pavilion cbd",
    "location": "Melbourne"
  }' | jq .

echo ""
echo "🔐 TEST 2: Public Tier - Business Disambiguation"
echo "Query: 'italian restaurant'"
curl -X POST http://localhost:3000/api/ai-abrakadabra/public/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "italian restaurant",
    "location": "Melbourne"
  }' | jq .

echo ""
echo "🤔 TEST 3: Public Tier - No Matches with Smart Suggestions"
echo "Query: 'find me sushi xyz restaurant'"
curl -X POST http://localhost:3000/api/ai-abrakadabra/public/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "find me sushi xyz restaurant",
    "location": "Melbourne"
  }' | jq .

echo ""
echo "🔐 TEST 4: Legacy AI Genie Endpoint (Public Tier Fallback)"
echo "Query: 'best thai food near cbd'"
curl -X POST http://localhost:3000/api/ai-genie/genie/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best thai food near cbd",
    "userLocation": "Melbourne CBD"
  }' | jq .

echo ""
echo "⚙️ TEST 5: AI Settings Endpoint (Requires Authentication)"
echo "Checking if authentication is properly enforced..."
curl -X GET http://localhost:3000/api/user/ai-surrogate-settings \
  -H "Content-Type: application/json" | jq .

echo ""
echo "📊 TEST 6: AI System Health Check"
curl -X GET http://localhost:3000/api/ai-genie/genie/health | jq .

echo ""
echo "✅ Testing Complete!"
echo ""
echo "Expected Results:"
echo "- Test 1: Should recognize booking intent and guide to registration"
echo "- Test 2: Should handle disambiguation intelligently"  
echo "- Test 3: Should provide smart suggestions for failed matches"
echo "- Test 4: Should work with legacy endpoint"
echo "- Test 5: Should return 401 (authentication required)"
echo "- Test 6: Should show system status"
echo ""
echo "🎯 Key Features Implemented:"
echo "✓ Two-tier architecture (Public vs Registered users)"
echo "✓ Intelligent booking intent recognition" 
echo "✓ Business name/location disambiguation"
echo "✓ Smart suggestions for failed queries"
echo "✓ Surrogate permission framework (for registered users)"
echo "✓ Security middleware and validation"
echo "✓ Backwards compatibility with existing AI Genie"