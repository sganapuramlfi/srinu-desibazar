/**
 * Populate Subscription Plans
 * Creates the three subscription tiers in the database
 * Run with: npx tsx db/populate-subscription-plans.ts
 */

import { db } from './index.js';
import { subscriptionPlans } from './index.js';

async function populateSubscriptionPlans() {
  console.log('🎯 Populating subscription plans...\n');

  // Define subscription plans
  const plans = [
    {
      // FREE TRIAL PLAN
      name: 'Free Trial',
      description: '180-day trial with essential features to get started',
      priceMonthly: '0',
      priceYearly: '0',
      currency: 'AUD',
      billingInterval: 'monthly' as const,
      trialDays: 180,
      isActive: true,
      isPopular: false,
      displayOrder: 0,

      // Limits
      maxStaff: 3,
      maxBookingsPerMonth: 50,
      maxProducts: 20,
      storageGb: 2,
      aiCreditsPerMonth: 50,

      // Features
      enabledModules: JSON.stringify(['salon', 'restaurant']),
      enabledFeatures: JSON.stringify([
        'basic_booking',
        'basic_reporting',
        'customer_management',
        'business_profile',
      ]),

      // Access
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: false,

      // Stripe (to be filled in later)
      stripePriceId: null,
      stripeProductId: null,
    },
    {
      // PREMIUM PLAN
      name: 'Premium',
      description: 'Advanced features for growing businesses',
      priceMonthly: '79',
      priceYearly: '790', // $790/year = $65.83/month (save 17%)
      currency: 'AUD',
      billingInterval: 'monthly' as const,
      trialDays: 14,
      isActive: true,
      isPopular: true, // Most popular plan
      displayOrder: 1,

      // Limits
      maxStaff: 15,
      maxBookingsPerMonth: 500,
      maxProducts: 100,
      storageGb: 10,
      aiCreditsPerMonth: 500,

      // Features
      enabledModules: JSON.stringify([
        'salon',
        'restaurant',
        'event',
        'retail',
      ]),
      enabledFeatures: JSON.stringify([
        'basic_booking',
        'advanced_booking',
        'analytics',
        'promotions',
        'reviews',
        'customer_management',
        'business_profile',
        'staff_scheduling',
        'inventory_management',
        'email_marketing',
        'sms_notifications',
        'custom_branding',
      ]),

      // Access
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: true,

      // Stripe (to be filled in later)
      stripePriceId: null,
      stripeProductId: null,
    },
    {
      // ENTERPRISE PLAN
      name: 'Enterprise',
      description: 'Unlimited power for large businesses',
      priceMonthly: '299',
      priceYearly: '2990', // $2990/year = $249.17/month (save 17%)
      currency: 'AUD',
      billingInterval: 'monthly' as const,
      trialDays: 14,
      isActive: true,
      isPopular: false,
      displayOrder: 2,

      // Limits (null = unlimited)
      maxStaff: null,
      maxBookingsPerMonth: null,
      maxProducts: null,
      storageGb: 50,
      aiCreditsPerMonth: 5000,

      // Features (ALL features)
      enabledModules: JSON.stringify([
        'salon',
        'restaurant',
        'event',
        'realestate',
        'retail',
        'professional',
      ]),
      enabledFeatures: JSON.stringify([
        'basic_booking',
        'advanced_booking',
        'analytics',
        'advanced_analytics',
        'promotions',
        'reviews',
        'customer_management',
        'business_profile',
        'staff_scheduling',
        'advanced_scheduling',
        'inventory_management',
        'email_marketing',
        'sms_notifications',
        'custom_branding',
        'api_access',
        'white_label',
        'multi_location',
        'custom_integrations',
        'dedicated_support',
        'training_sessions',
      ]),

      // Access
      apiAccess: true,
      whiteLabel: true,
      prioritySupport: true,

      // Stripe (to be filled in later)
      stripePriceId: null,
      stripeProductId: null,
    },
  ];

  // Insert plans
  for (const plan of plans) {
    try {
      const [inserted] = await db
        .insert(subscriptionPlans)
        .values(plan)
        .returning();

      console.log(`✅ Created plan: ${inserted.name} (ID: ${inserted.id})`);
      console.log(`   Price: $${plan.priceMonthly}/month or $${plan.priceYearly}/year`);
      console.log(`   Limits: ${plan.maxStaff === null ? 'Unlimited' : plan.maxStaff} staff, ${plan.maxBookingsPerMonth === null ? 'Unlimited' : plan.maxBookingsPerMonth} bookings/month`);
      console.log(`   Features: ${JSON.parse(plan.enabledFeatures as string).length} features`);
      console.log('');
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation - plan already exists
        console.log(`⏭️  Plan ${plan.name} already exists, skipping...`);
      } else {
        console.error(`❌ Error creating plan ${plan.name}:`, error.message);
      }
    }
  }

  console.log('\n✅ Subscription plans populated successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Create corresponding products/prices in Stripe Dashboard');
  console.log('   2. Update plans with stripePriceId and stripeProductId');
  console.log('   3. Configure webhook in Stripe to point to your server');
  console.log('\n🔗 Stripe Dashboard: https://dashboard.stripe.com/products');
}

// Run the script
populateSubscriptionPlans()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
