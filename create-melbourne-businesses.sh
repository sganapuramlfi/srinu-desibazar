#!/bin/bash

# Create 10 Melbourne Businesses via API calls
# Uses the working APIs we just tested

echo "🏢 Creating 10 Melbourne Businesses via API"
echo "==========================================="

API_URL="http://localhost:9101/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Melbourne business data
declare -a BUSINESSES=(
    "rajesh_spice:rajesh@spiceparadise.com.au:Spice Paradise Indian Restaurant:restaurant:premium:-37.8136:144.9631:123 Collins Street:Melbourne:CBD:Victoria:3000"
    "sophia_bella:sophia@bellavista.com.au:Bella Vista Hair & Beauty:salon:enterprise:-37.8197:144.9969:456 Swan Street:Melbourne:Richmond:Victoria:3121"
    "alexandra_elite:alexandra@elitemelbourne.com.au:Elite Events Melbourne:event:premium:-37.8336:144.9892:789 Toorak Road:Melbourne:South Yarra:Victoria:3141"
    "michael_fitzroy:michael@fitzroyproperty.com.au:Fitzroy Property Partners:realestate:enterprise:-37.7982:144.9784:321 Brunswick Street:Melbourne:Fitzroy:Victoria:3065"
    "david_coastal:david@coastalaccounting.com.au:Coastal Accounting Solutions:professional:premium:-37.8677:144.9778:654 Acland Street:Melbourne:St Kilda:Victoria:3182"
    "emma_urban:emma@urbanthreads.com.au:Urban Threads Boutique:retail:free:-37.8509:144.9901:987 Chapel Street:Melbourne:Prahran:Victoria:3181"
    "giuseppe_nonna:giuseppe@nonnamarias.com.au:Nonna Maria's Italian Kitchen:restaurant:premium:-37.7963:144.9669:234 Lygon Street:Melbourne:Carlton:Victoria:3053"
    "jake_ink:jake@inkandsteel.com.au:Ink & Steel Tattoo Studio:salon:premium:-37.8048:144.9882:567 Smith Street:Melbourne:Collingwood:Victoria:3066"
    "sarah_eastside:sarah@eastsidelegal.com.au:Eastside Legal Group:professional:enterprise:-37.8220:145.0284:432 Burke Road:Melbourne:Hawthorn:Victoria:3122"
    "melissa_rooftop:melissa@rooftopnorthcote.com.au:The Rooftop at Northcote:event:free:-37.7701:144.9959:123 High Street:Melbourne:Northcote:Victoria:3070"
)

COOKIE_JAR="melbourne-cookies.txt"
rm -f $COOKIE_JAR

BUSINESS_COUNT=0

# Create each business
for business_data in "${BUSINESSES[@]}"; do
    IFS=':' read -r username email name industry tier lat lng address city suburb state postcode <<< "$business_data"
    
    echo -e "\n${BLUE}Creating: $name ($suburb)${NC}"
    
    # 1. Register business user
    REGISTER_RESPONSE=$(curl -s -c $COOKIE_JAR -X POST "$API_URL/register" \
      -H "Content-Type: application/json" \
      -d '{
        "username": "'$username'",
        "email": "'$email'",
        "password": "SecurePass123!",
        "role": "business",
        "business": {
          "name": "'$name'",
          "industryType": "'$industry'",
          "description": "Test business for location-aware advertising"
        }
      }')
    
    # Extract business ID
    BUSINESS_ID=$(echo $REGISTER_RESPONSE | grep -o '"business":{"id":[0-9]*' | grep -o '[0-9]*')
    
    if [ -z "$BUSINESS_ID" ]; then
        echo -e "${RED}❌ Failed to create $name${NC}"
        continue
    fi
    
    echo -e "${GREEN}✅ Created: $name (ID: $BUSINESS_ID)${NC}"
    
    # 2. Set subscription tier
    SUBSCRIPTION_RESPONSE=$(curl -s -b $COOKIE_JAR -X PUT "$API_URL/businesses/$BUSINESS_ID/subscription" \
      -H "Content-Type: application/json" \
      -d '{
        "tier": "'$tier'",
        "enabledModules": ["'$industry'"],
        "adTargeting": "both"
      }')
    
    echo -e "   📊 Subscription: $tier tier"
    
    # 3. Set location
    LOCATION_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/businesses/$BUSINESS_ID/location" \
      -H "Content-Type: application/json" \
      -d '{
        "latitude": '$lat',
        "longitude": '$lng',
        "address": "'$address'",
        "city": "'$city'",
        "suburb": "'$suburb'",
        "state": "'$state'",
        "postcode": "'$postcode'",
        "country": "Australia"
      }')
    
    echo -e "   📍 Location: $suburb, $postcode"
    
    # 4. Create ad campaign
    CAMPAIGN_TITLE="Experience $name - Local $suburb Business"
    CAMPAIGN_CONTENT=$(case $industry in
        "restaurant") echo "Authentic cuisine in $suburb. Book your table today!" ;;
        "salon") echo "Premium beauty services in $suburb. Book your appointment!" ;;
        "event") echo "Unforgettable events in $suburb. Plan your special day!" ;;
        "professional") echo "Expert professional services in $suburb. Free consultation!" ;;
        "retail") echo "Latest fashion trends in $suburb. Visit our store!" ;;
        "realestate") echo "Find your dream home in $suburb. Expert local knowledge!" ;;
    esac)
    
    CAMPAIGN_RESPONSE=$(curl -s -b $COOKIE_JAR -X POST "$API_URL/businesses/$BUSINESS_ID/ad-campaigns" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "'$CAMPAIGN_TITLE'",
        "content": "'$CAMPAIGN_CONTENT'",
        "adType": "sidebar_left",
        "size": "medium",
        "animationType": "fade",
        "targeting": "local",
        "targetRadius": 10,
        "budget": 100.00,
        "status": "active"
      }')
    
    echo -e "   🎯 Campaign: Created local ad"
    
    BUSINESS_COUNT=$((BUSINESS_COUNT + 1))
    
    # Small delay to avoid overwhelming the server
    sleep 1
done

echo -e "\n${GREEN}🎉 Created $BUSINESS_COUNT Melbourne businesses!${NC}"
echo ""
echo -e "${YELLOW}Test Accounts (Password: SecurePass123!)${NC}"
echo "================================================="
for business_data in "${BUSINESSES[@]}"; do
    IFS=':' read -r username email name industry tier lat lng address city suburb state postcode <<< "$business_data"
    echo "$email - $name ($suburb) - $tier tier"
done

echo ""
echo -e "${BLUE}Ready for testing:${NC}"
echo "• Location-aware ads"
echo "• Subscription tier differences"
echo "• Distance-based prioritization"
echo "• Business dashboard functionality"

# Cleanup
rm -f $COOKIE_JAR