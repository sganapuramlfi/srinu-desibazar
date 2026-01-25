#!/bin/bash

echo "🚀 DesiBazaar Test Data Population Script"
echo "========================================"
echo ""
echo "This script will create comprehensive test data including:"
echo "- Business owner account (spiceparadise)"
echo "- Complete business profile (Spice Paradise Restaurant)"
echo "- Premium subscription with 180-day trial"
echo "- Staff members, services, schedules"
echo "- Active ad campaigns"
echo "- Customer bookings and messages"
echo ""
read -p "Do you want to continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo ""
    echo "📦 Installing dependencies..."
    cd server && npm install @node-rs/argon2 --save
    
    echo ""
    echo "🗄️ Running database script..."
    docker-compose exec server npx tsx ../scripts/populate-test-data.ts
    
    echo ""
    echo "✅ Test data population complete!"
    echo ""
    echo "📋 Quick Test Guide:"
    echo "==================="
    echo "1. Business Owner Login:"
    echo "   URL: http://localhost:9102/auth"
    echo "   Email: owner@spiceparadise.com"
    echo "   Password: password123"
    echo ""
    echo "2. Customer Login:"
    echo "   Email: john.doe@email.com"
    echo "   Password: password123"
    echo ""
    echo "3. Test Features:"
    echo "   - Business Dashboard: Check all tabs"
    echo "   - Subscription: Premium tier with 180-day trial"
    echo "   - Location: Melbourne CBD with verified coordinates"
    echo "   - Services: 4 different restaurant services"
    echo "   - Staff: 3 staff members with schedules"
    echo "   - Ads: 2 active campaigns (check landing page)"
    echo "   - Bookings: 3 customer bookings"
    echo ""
fi