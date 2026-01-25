#!/bin/bash

echo "🚀 Melbourne Test Data Population Script"
echo "========================================"
echo ""
echo "This script will create 10 realistic businesses across Melbourne suburbs:"
echo ""
echo "📍 LOCATIONS:"
echo "   • CBD - Spice Paradise Indian Restaurant (Premium)"
echo "   • Richmond - Bella Vista Hair & Beauty (Enterprise)" 
echo "   • South Yarra - Elite Events Melbourne (Premium)"
echo "   • Fitzroy - Fitzroy Property Partners (Enterprise)"
echo "   • St Kilda - Coastal Accounting Solutions (Premium)"
echo "   • Prahran - Urban Threads Boutique (Free)"
echo "   • Carlton - Nonna Maria's Italian Kitchen (Premium)"
echo "   • Collingwood - Ink & Steel Tattoo Studio (Premium)"
echo "   • Hawthorn - Eastside Legal Group (Enterprise)"
echo "   • Northcote - The Rooftop at Northcote (Free)"
echo ""
echo "🎯 TESTING CAPABILITIES:"
echo "   ✅ Location-aware ad targeting"
echo "   ✅ Distance-based prioritization"
echo "   ✅ Subscription tier differences"
echo "   ✅ Multi-industry business types"
echo "   ✅ Realistic Melbourne GPS coordinates"
echo ""
read -p "Do you want to continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo ""
    echo "🗄️ Running test data population script..."
    echo ""
    
    # Check if we're in Docker or local environment
    if docker-compose ps server | grep -q "Up"; then
        echo "📦 Detected Docker environment - running via docker-compose"
        docker-compose exec server npx tsx ../scripts/populate-melbourne-test-data.ts
    else
        echo "💻 Detected local environment - running directly"
        cd server && npx tsx ../scripts/populate-melbourne-test-data.ts
    fi
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Test data population complete!"
        echo ""
        echo "🧪 QUICK TEST GUIDE:"
        echo "===================="
        echo ""
        echo "1. 🏢 Business Owner Logins:"
        echo "   CBD Restaurant: rajesh@spiceparadise.com.au"
        echo "   Richmond Salon: sophia@bellavista.com.au"
        echo "   South Yarra Events: alexandra@elitemelbourne.com.au"
        echo "   Password for all: SecurePass123!"
        echo ""
        echo "2. 🌐 Test URLs:"
        echo "   Business Dashboard: http://localhost:9102/dashboard/{businessId}"
        echo "   Landing Page Ads: http://localhost:9102/"
        echo "   Admin Panel: http://localhost:9102/admin"
        echo ""
        echo "3. 🎯 Location Testing:"
        echo "   • Visit landing page and check sidebar ads"
        echo "   • CBD businesses should appear first for Melbourne users"
        echo "   • Premium/Enterprise ads get higher priority"
        echo "   • Free tier businesses show globally"
        echo ""
        echo "4. 📊 Subscription Testing:"
        echo "   • Free: 5 ads max (Prahran, Northcote)"
        echo "   • Premium: 25 ads max (6 businesses)"
        echo "   • Enterprise: 999 ads max (Richmond, Fitzroy, Hawthorn)"
        echo ""
        echo "5. 📍 Distance Testing Commands:"
        echo '   curl "http://localhost:9101/api/advertising/targeted-ads?adType=sidebar_left&category=restaurant&priorityBoost=2"'
        echo ""
        echo "🔍 Next Steps:"
        echo "   1. Test the landing page ad display"
        echo "   2. Log into business dashboards"
        echo "   3. Create additional ad campaigns"
        echo "   4. Test location-based targeting"
        echo ""
    else
        echo ""
        echo "❌ Test data population failed!"
        echo "Check the error messages above and try again."
    fi
fi