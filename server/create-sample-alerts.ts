// Test script to create sample business communications data
import { db } from '../db/index.js';
import { 
  businessCommunications, 
  businessAlertPreferences, 
  aiSuggestions,
  notificationQueue,
  businessTenants 
} from '../db/index.js';

async function createSampleAlertData() {
  try {
    console.log('🔧 Creating sample business alerts data...');

    // Get first business (should be business ID 1)
    const [business] = await db.select().from(businessTenants).limit(1);
    if (!business) {
      console.error('No business found! Please create a business first.');
      return;
    }

    console.log(`📊 Creating alerts for business: ${business.name} (ID: ${business.id})`);

    // 1. Create sample business communications (constraint violations)
    const sampleCommunications = [
      {
        businessId: business.id,
        customerId: null,
        communicationType: 'large_party' as const,
        subject: 'Large Party Request - Wedding Reception',
        messages: [{
          id: Date.now(),
          message: 'Hi! I need to book a table for 25 people for a wedding reception this Saturday at 7 PM. Can you accommodate us?',
          sender: 'customer',
          messageType: 'text',
          timestamp: new Date().toISOString(),
          customerName: 'Sarah Wilson'
        }],
        priority: 1, // Critical
        customerName: 'Sarah Wilson',
        customerPhone: '+61412345678',
        customerEmail: 'sarah.wilson@email.com',
        originalBookingRequest: {
          partySize: 25,
          preferredTime: '19:00',
          occasion: 'wedding_reception',
          date: new Date().toISOString().split('T')[0]
        },
        constraintViolations: [{
          constraintName: 'table_capacity',
          message: 'Party size (25) exceeds maximum table capacity (12)',
          suggestedAction: 'Consider splitting party or booking private dining room'
        }],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        businessId: business.id,
        customerId: null,
        communicationType: 'off_hours_request' as const,
        subject: 'Early Morning Booking Request',
        messages: [{
          id: Date.now() + 1,
          message: 'Can I book a table for 4 people at 6 AM tomorrow? We have an early flight.',
          sender: 'customer',
          messageType: 'text',
          timestamp: new Date().toISOString(),
          customerName: 'Mike Chen'
        }],
        priority: 2, // High
        customerName: 'Mike Chen',
        customerPhone: '+61423456789',
        customerEmail: 'mike.chen@email.com',
        originalBookingRequest: {
          partySize: 4,
          preferredTime: '06:00',
          occasion: 'business_travel'
        },
        constraintViolations: [{
          constraintName: 'operating_hours',
          message: 'Restaurant opens at 7:00 AM (requested: 6:00 AM)',
          suggestedAction: 'Suggest 7:00 AM opening time or breakfast alternatives'
        }],
        createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        updatedAt: new Date(Date.now() - 45 * 60 * 1000)
      },
      {
        businessId: business.id,
        customerId: null,
        communicationType: 'capacity_issue' as const,
        subject: 'Fully Booked - Customer Inquiry',
        messages: [{
          id: Date.now() + 2,
          message: 'All tables seem to be booked for Friday night. Any chance of a cancellation?',
          sender: 'customer', 
          messageType: 'text',
          timestamp: new Date().toISOString(),
          customerName: 'Emma Davis'
        }],
        priority: 3, // Medium
        customerName: 'Emma Davis',
        customerPhone: '+61434567890',
        customerEmail: 'emma.davis@email.com',
        originalBookingRequest: {
          partySize: 2,
          preferredTime: '19:30',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 days from now
        },
        constraintViolations: [{
          constraintName: 'fully_booked',
          message: 'No tables available for requested time slot',
          suggestedAction: 'Offer waitlist or alternative time slots'
        }],
        createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
        updatedAt: new Date(Date.now() - 20 * 60 * 1000)
      }
    ];

    console.log('📝 Inserting business communications...');
    const insertedCommunications = await db
      .insert(businessCommunications)
      .values(sampleCommunications)
      .returning();

    // 2. Create sample AI suggestions for these communications
    console.log('🤖 Creating AI suggestions...');
    const sampleAISuggestions = [
      {
        communicationId: insertedCommunications[0].id,
        businessId: business.id,
        customerId: null,
        originalConstraintType: 'table_capacity',
        constraintViolationData: sampleCommunications[0].constraintViolations[0],
        suggestionType: 'split_booking' as const,
        primarySuggestion: {
          message: 'I can book you across 2 nearby tables for your party of 25',
          action: 'split_party_booking',
          tables: [
            { id: 1, capacity: 12, time: '19:00' },
            { id: 3, capacity: 14, time: '19:00' }
          ],
          estimatedRevenue: 1250.00
        },
        alternativeSuggestions: [
          {
            type: 'private_dining',
            message: 'Private dining room available (seats 30)',
            additionalCost: 200
          },
          {
            type: 'alternative_time',
            message: 'Full capacity available at 6:00 PM or 9:00 PM',
            times: ['18:00', '21:00']
          }
        ],
        confidenceScore: '0.92',
        reasoning: 'High confidence based on table availability and successful similar bookings',
        createdAt: new Date(Date.now() - 110 * 60 * 1000) // 110 minutes ago
      },
      {
        communicationId: insertedCommunications[1].id,
        businessId: business.id,
        customerId: null,
        originalConstraintType: 'operating_hours',
        constraintViolationData: sampleCommunications[1].constraintViolations[0],
        suggestionType: 'alternative_time' as const,
        primarySuggestion: {
          message: 'How about 7:00 AM when we open? I can reserve your table',
          action: 'suggest_opening_time',
          alternativeTime: '07:00',
          earlyBirdDiscount: '10%'
        },
        alternativeSuggestions: [
          {
            type: 'nearby_venue',
            message: '24/7 cafe 2 blocks away serves breakfast',
            venue: 'Early Bird Cafe'
          }
        ],
        confidenceScore: '0.88',
        reasoning: 'Strong alternative with early bird discount incentive',
        createdAt: new Date(Date.now() - 40 * 60 * 1000) // 40 minutes ago  
      }
    ];

    const insertedSuggestions = await db
      .insert(aiSuggestions)
      .values(sampleAISuggestions)
      .returning();

    // 3. Create business alert preferences
    console.log('⚙️ Creating alert preferences...');
    await db
      .insert(businessAlertPreferences)
      .values({
        businessId: business.id,
        emailAlerts: true,
        smsAlerts: true,
        inAppAlerts: true,
        constraintViolations: true,
        largePartyRequests: true,
        offHoursRequests: true,
        immediateAlerts: ['large_party_requests', 'urgent_issues'],
        primaryEmail: 'owner@padmafoods.com',
        smsPhone: '+61412345000'
      })
      .onConflictDoNothing();

    // 4. Create some pending notifications
    console.log('📧 Creating notification queue...');
    await db
      .insert(notificationQueue)
      .values([
        {
          businessId: business.id,
          notificationType: 'email' as const,
          subject: 'Urgent: Large Party Request Needs Response',
          messageText: 'Sarah Wilson needs a table for 25 people - wedding reception',
          data: { communicationId: insertedCommunications[0].id },
          priority: 1,
          status: 'pending' as const
        },
        {
          businessId: business.id,
          notificationType: 'sms' as const,
          subject: 'New Customer Request',
          messageText: 'Early morning booking request from Mike Chen',
          data: { communicationId: insertedCommunications[1].id },
          priority: 2,
          status: 'pending' as const
        }
      ]);

    console.log('✅ Sample business alerts data created successfully!');
    console.log(`📊 Created:`);
    console.log(`   - ${insertedCommunications.length} communications`);
    console.log(`   - ${insertedSuggestions.length} AI suggestions`);
    console.log(`   - 1 alert preferences record`);
    console.log(`   - 2 pending notifications`);
    console.log(`\n🎯 Now test the alerts dashboard at: http://localhost:5173/dashboard/${business.slug}`);

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
}

// Run the function
createSampleAlertData().then(() => process.exit(0));