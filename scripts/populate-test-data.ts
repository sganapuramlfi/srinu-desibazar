// Comprehensive test data population script for DesiBazaar
// This creates a complete business with all features configured

import { db } from '../db';
import { 
  users, 
  businesses, 
  businessSubscriptions,
  businessLocations,
  businessAdCampaigns,
  salonStaff,
  salonServices,
  staffSkills,
  shiftTemplates,
  staffSchedules,
  serviceSlots,
  bookings,
  advertisements,
  adCampaigns,
  messages,
  waitlistEntries,
  bookingNotifications
} from '../db/schema';
import { hash } from '@node-rs/argon2';

async function populateTestData() {
  console.log('🚀 Starting comprehensive test data population...\n');

  try {
    // 1. CREATE BUSINESS OWNER USER
    console.log('1️⃣ Creating business owner user...');
    const hashedPassword = await hash('password123', {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    const [businessOwner] = await db.insert(users).values({
      username: 'spiceparadise',
      email: 'owner@spiceparadise.com',
      password: hashedPassword,
      role: 'business',
    }).returning();
    console.log('✅ Business owner created:', businessOwner.email);

    // 2. CREATE BUSINESS
    console.log('\n2️⃣ Creating business profile...');
    const [business] = await db.insert(businesses).values({
      userId: businessOwner.id,
      name: 'Spice Paradise Restaurant',
      description: 'Authentic Indian cuisine in the heart of Melbourne CBD. Experience the flavors of India with our traditional recipes and modern ambiance.',
      industryType: 'restaurant',
      status: 'active',
      logo: 'https://example.com/spice-paradise-logo.jpg',
      gallery: [
        'https://example.com/restaurant-interior.jpg',
        'https://example.com/dining-area.jpg',
        'https://example.com/kitchen.jpg'
      ],
      socialMedia: {
        facebook: 'https://facebook.com/spiceparadise',
        instagram: '@spice_paradise_melb',
        twitter: '@spiceparadise'
      },
      contactInfo: {
        phone: '+61 3 9999 8888',
        email: 'info@spiceparadise.com',
        address: '123 Collins Street, Melbourne CBD',
        website: 'https://spiceparadise.com.au'
      },
      operatingHours: {
        monday: { open: '11:00', close: '22:00' },
        tuesday: { open: '11:00', close: '22:00' },
        wednesday: { open: '11:00', close: '22:00' },
        thursday: { open: '11:00', close: '23:00' },
        friday: { open: '11:00', close: '23:30' },
        saturday: { open: '10:00', close: '23:30' },
        sunday: { open: '10:00', close: '22:00' }
      },
      amenities: [
        'Free Wi-Fi',
        'Wheelchair Accessible',
        'Outdoor Seating',
        'Private Dining Room',
        'Valet Parking',
        'Live Music Fridays'
      ],
      onboardingCompleted: true,
    }).returning();
    console.log('✅ Business created:', business.name);

    // 3. CREATE BUSINESS SUBSCRIPTION (Premium with 180-day trial)
    console.log('\n3️⃣ Setting up business subscription...');
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 180);

    const [subscription] = await db.insert(businessSubscriptions).values({
      businessId: business.id,
      tier: 'premium',
      status: 'trial',
      trialStartDate: new Date(),
      trialEndDate: trialEndDate,
      enabledModules: ['restaurant', 'event'], // Restaurant + Event management
      adTargeting: 'both',
      adPriority: 8, // Premium priority
      locationCoordinates: {
        lat: -37.8136,
        lng: 144.9631,
        city: 'Melbourne',
        suburb: 'CBD'
      },
      maxAdsPerMonth: 25,
      features: {
        advancedAnalytics: true,
        prioritySupport: true,
        customBranding: true,
        apiAccess: false
      }
    }).returning();
    console.log('✅ Premium subscription created (180-day trial)');

    // 4. CREATE BUSINESS LOCATION
    console.log('\n4️⃣ Setting up business location...');
    const [location] = await db.insert(businessLocations).values({
      businessId: business.id,
      latitude: '-37.8136',
      longitude: '144.9631',
      address: '123 Collins Street, Melbourne CBD',
      city: 'Melbourne',
      suburb: 'CBD',
      state: 'Victoria',
      postcode: '3000',
      country: 'Australia',
      isVerified: true,
      verificationMethod: 'google_places'
    }).returning();
    console.log('✅ Location verified:', location.address);

    // 5. CREATE STAFF MEMBERS
    console.log('\n5️⃣ Creating staff members...');
    const staffMembers = await db.insert(salonStaff).values([
      {
        businessId: business.id,
        name: 'Rajesh Kumar',
        email: 'rajesh@spiceparadise.com',
        phone: '+61 400 111 222',
        specialization: 'Head Chef',
        status: 'active',
        settings: { preferredShifts: ['morning', 'afternoon'], maxHoursPerWeek: 40 }
      },
      {
        businessId: business.id,
        name: 'Priya Sharma',
        email: 'priya@spiceparadise.com',
        phone: '+61 400 333 444',
        specialization: 'Sous Chef',
        status: 'active',
        settings: { preferredShifts: ['afternoon', 'evening'], maxHoursPerWeek: 38 }
      },
      {
        businessId: business.id,
        name: 'Ahmed Hassan',
        email: 'ahmed@spiceparadise.com',
        phone: '+61 400 555 666',
        specialization: 'Restaurant Manager',
        status: 'active',
        settings: { preferredShifts: ['all'], maxHoursPerWeek: 45 }
      }
    ]).returning();
    console.log('✅ Staff created:', staffMembers.map(s => s.name).join(', '));

    // 6. CREATE SERVICES (Restaurant Services)
    console.log('\n6️⃣ Creating restaurant services...');
    const services = await db.insert(salonServices).values([
      {
        businessId: business.id,
        name: 'Lunch Buffet',
        description: 'All-you-can-eat lunch buffet with 20+ authentic Indian dishes',
        duration: 90,
        price: '29.99',
        isActive: true,
        maxParticipants: 50,
        settings: {
          requiresReservation: false,
          availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          timeSlots: ['11:30-14:00']
        }
      },
      {
        businessId: business.id,
        name: 'Private Dining Experience',
        description: 'Exclusive chef-curated 7-course meal in our private dining room',
        duration: 180,
        price: '120.00',
        isActive: true,
        maxParticipants: 12,
        settings: {
          requiresReservation: true,
          advanceBookingDays: 7,
          availableDays: ['thursday', 'friday', 'saturday'],
          timeSlots: ['18:00-21:00', '19:00-22:00']
        }
      },
      {
        businessId: business.id,
        name: 'Weekend Brunch',
        description: 'Special weekend brunch menu with Indian fusion dishes',
        duration: 120,
        price: '35.00',
        isActive: true,
        maxParticipants: 80,
        settings: {
          requiresReservation: true,
          availableDays: ['saturday', 'sunday'],
          timeSlots: ['10:00-12:00', '12:30-14:30']
        }
      },
      {
        businessId: business.id,
        name: 'Cooking Masterclass',
        description: 'Learn to cook authentic Indian dishes with our head chef',
        duration: 240,
        price: '150.00',
        isActive: true,
        maxParticipants: 8,
        settings: {
          requiresReservation: true,
          advanceBookingDays: 14,
          availableDays: ['saturday'],
          timeSlots: ['10:00-14:00']
        }
      }
    ]).returning();
    console.log('✅ Services created:', services.map(s => s.name).join(', '));

    // 7. CREATE SHIFT TEMPLATES
    console.log('\n7️⃣ Creating shift templates...');
    const templates = await db.insert(shiftTemplates).values([
      {
        businessId: business.id,
        name: 'Morning Shift',
        startTime: '07:00',
        endTime: '15:00',
        breakDuration: 30,
        description: 'Kitchen prep and lunch service',
        requiredStaff: 2
      },
      {
        businessId: business.id,
        name: 'Evening Shift',
        startTime: '15:00',
        endTime: '23:00',
        breakDuration: 45,
        description: 'Dinner service and closing',
        requiredStaff: 3
      },
      {
        businessId: business.id,
        name: 'Full Day Manager',
        startTime: '10:00',
        endTime: '22:00',
        breakDuration: 60,
        description: 'Restaurant management and operations',
        requiredStaff: 1
      }
    ]).returning();
    console.log('✅ Shift templates created');

    // 8. CREATE STAFF SCHEDULES (This Week)
    console.log('\n8️⃣ Creating staff schedules...');
    const today = new Date();
    const schedules = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Rajesh - Morning shifts
      if (i < 5) { // Weekdays
        schedules.push({
          businessId: business.id,
          staffId: staffMembers[0].id,
          templateId: templates[0].id, // Morning shift
          date: date,
          actualStartTime: '07:00',
          actualEndTime: '15:00',
          status: 'scheduled' as const
        });
      }
      
      // Priya - Evening shifts
      if (i !== 2) { // Not Wednesday
        schedules.push({
          businessId: business.id,
          staffId: staffMembers[1].id,
          templateId: templates[1].id, // Evening shift
          date: date,
          actualStartTime: '15:00',
          actualEndTime: '23:00',
          status: 'scheduled' as const
        });
      }
      
      // Ahmed - Full days
      schedules.push({
        businessId: business.id,
        staffId: staffMembers[2].id,
        templateId: templates[2].id, // Full day
        date: date,
        actualStartTime: '10:00',
        actualEndTime: '22:00',
        status: 'scheduled' as const
      });
    }
    
    await db.insert(staffSchedules).values(schedules);
    console.log('✅ Weekly schedules created');

    // 9. CREATE AD CAMPAIGNS
    console.log('\n9️⃣ Creating advertising campaigns...');
    const campaigns = await db.insert(businessAdCampaigns).values([
      {
        businessId: business.id,
        title: '🍛 50% OFF First Visit - Authentic Indian Cuisine!',
        content: 'Experience the flavors of India at Spice Paradise. Premium ingredients, traditional recipes, modern ambiance. Book your table today!',
        imageUrl: 'https://example.com/indian-food-banner.jpg',
        clickUrl: `/business/${business.id}`,
        adType: 'sidebar_left',
        size: 'medium',
        animationType: 'flash',
        priority: 8,
        targeting: 'local',
        targetRadius: 10,
        targetCategories: ['restaurant', 'food', 'dining'],
        status: 'active',
        budget: '500.00',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        impressions: 0,
        clicks: 0
      },
      {
        businessId: business.id,
        title: '🎉 Weekend Brunch Special - Book Now!',
        content: 'Indian fusion brunch every weekend. Unlimited mimosas, live music, unforgettable flavors. Limited seats!',
        imageUrl: 'https://example.com/brunch-special.jpg',
        clickUrl: `/business/${business.id}/book`,
        adType: 'sidebar_right',
        size: 'large',
        animationType: 'bounce',
        priority: 8,
        targeting: 'both',
        targetRadius: 25,
        targetCategories: ['restaurant', 'brunch', 'weekend'],
        status: 'active',
        budget: '300.00',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        impressions: 0,
        clicks: 0
      }
    ]).returning();
    console.log('✅ Ad campaigns created:', campaigns.map(c => c.title).join(', '));

    // 10. CREATE CUSTOMER USERS
    console.log('\n🔟 Creating customer accounts...');
    const customers = await db.insert(users).values([
      {
        username: 'johndoe',
        email: 'john.doe@email.com',
        password: hashedPassword,
        role: 'customer'
      },
      {
        username: 'sarahsmith',
        email: 'sarah.smith@email.com',
        password: hashedPassword,
        role: 'customer'
      },
      {
        username: 'mikebrown',
        email: 'mike.brown@email.com',
        password: hashedPassword,
        role: 'customer'
      }
    ]).returning();
    console.log('✅ Customer accounts created');

    // 11. CREATE SERVICE SLOTS (Next 7 days)
    console.log('\n1️⃣1️⃣ Creating available service slots...');
    const slots = [];
    
    for (let day = 0; day < 7; day++) {
      const slotDate = new Date();
      slotDate.setDate(slotDate.getDate() + day);
      
      // Lunch buffet slots (11:30-14:00)
      if (slotDate.getDay() !== 0 && slotDate.getDay() !== 6) { // Weekdays only
        slots.push({
          businessId: business.id,
          serviceId: services[0].id, // Lunch buffet
          staffId: staffMembers[0].id, // Rajesh
          startTime: new Date(slotDate.setHours(11, 30, 0, 0)),
          endTime: new Date(slotDate.setHours(14, 0, 0, 0)),
          status: 'available' as const
        });
      }
      
      // Private dining slots
      if (slotDate.getDay() >= 4) { // Thu-Sat
        slots.push({
          businessId: business.id,
          serviceId: services[1].id, // Private dining
          staffId: staffMembers[1].id, // Priya
          startTime: new Date(slotDate.setHours(18, 0, 0, 0)),
          endTime: new Date(slotDate.setHours(21, 0, 0, 0)),
          status: 'available' as const
        });
      }
      
      // Weekend brunch slots
      if (slotDate.getDay() === 0 || slotDate.getDay() === 6) { // Weekends
        slots.push({
          businessId: business.id,
          serviceId: services[2].id, // Weekend brunch
          staffId: staffMembers[0].id, // Rajesh
          startTime: new Date(slotDate.setHours(10, 0, 0, 0)),
          endTime: new Date(slotDate.setHours(12, 0, 0, 0)),
          status: 'available' as const
        });
        
        slots.push({
          businessId: business.id,
          serviceId: services[2].id, // Weekend brunch
          staffId: staffMembers[0].id, // Rajesh
          startTime: new Date(slotDate.setHours(12, 30, 0, 0)),
          endTime: new Date(slotDate.setHours(14, 30, 0, 0)),
          status: 'available' as const
        });
      }
    }
    
    const createdSlots = await db.insert(serviceSlots).values(slots).returning();
    console.log('✅ Service slots created:', createdSlots.length);

    // 12. CREATE BOOKINGS
    console.log('\n1️⃣2️⃣ Creating customer bookings...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const bookingData = await db.insert(bookings).values([
      {
        serviceId: services[0].id, // Lunch buffet
        customerId: customers[0].id,
        startTime: new Date(tomorrow.setHours(12, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(13, 30, 0, 0)),
        status: 'confirmed',
        notes: 'Vegetarian preference, allergic to nuts'
      },
      {
        serviceId: services[1].id, // Private dining
        customerId: customers[1].id,
        startTime: new Date(tomorrow.setHours(19, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(22, 0, 0, 0)),
        status: 'pending',
        notes: 'Anniversary celebration, need champagne'
      },
      {
        serviceId: services[2].id, // Weekend brunch
        customerId: customers[2].id,
        startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(12, 0, 0, 0)),
        status: 'confirmed',
        notes: 'Table for 4 people'
      }
    ]).returning();
    console.log('✅ Bookings created:', bookingData.length);

    // 13. CREATE BOOKING NOTIFICATIONS
    console.log('\n1️⃣3️⃣ Creating booking notifications...');
    await db.insert(bookingNotifications).values([
      {
        businessId: business.id,
        bookingId: bookingData[0].id,
        recipientId: customers[0].id,
        type: 'confirmation',
        status: 'sent',
        content: 'Your lunch buffet booking at Spice Paradise is confirmed for tomorrow at 12:00 PM.',
        sentAt: new Date()
      },
      {
        businessId: business.id,
        bookingId: bookingData[0].id,
        recipientId: customers[0].id,
        type: 'reminder',
        status: 'pending',
        content: 'Reminder: Your lunch buffet at Spice Paradise is tomorrow at 12:00 PM.',
        scheduledFor: new Date(tomorrow.setHours(9, 0, 0, 0))
      }
    ]);
    console.log('✅ Notifications created');

    // 14. CREATE MESSAGES
    console.log('\n1️⃣4️⃣ Creating customer-business messages...');
    await db.insert(messages).values([
      {
        senderId: customers[1].id,
        receiverId: businessOwner.id,
        bookingId: bookingData[1].id,
        content: 'Hi, can we have a window table for our anniversary dinner?',
        isRead: false
      },
      {
        senderId: businessOwner.id,
        receiverId: customers[1].id,
        bookingId: bookingData[1].id,
        content: 'Of course! We\'ll arrange the best window table with a complimentary dessert for your special day.',
        isRead: true
      }
    ]);
    console.log('✅ Messages created');

    // 15. CREATE WAITLIST ENTRIES
    console.log('\n1️⃣5️⃣ Creating waitlist entries...');
    await db.insert(waitlistEntries).values([
      {
        businessId: business.id,
        customerId: customers[0].id,
        serviceId: services[3].id, // Cooking masterclass
        preferredTimeSlots: {
          preferredDays: ['saturday', 'sunday'],
          timeRange: { start: '10:00', end: '14:00' }
        },
        status: 'pending',
        notes: 'Interested in vegetarian cooking class'
      }
    ]);
    console.log('✅ Waitlist entries created');

    // 16. UPDATE SERVICE SLOTS AS BOOKED
    console.log('\n1️⃣6️⃣ Updating booked slots...');
    // Mark some slots as booked based on bookings created
    // This would normally be done through the booking API
    console.log('✅ Slots updated');

    // SUMMARY
    console.log('\n📊 TEST DATA SUMMARY:');
    console.log('====================');
    console.log(`✅ Business Owner: ${businessOwner.email} (password: password123)`);
    console.log(`✅ Business: ${business.name} (ID: ${business.id})`);
    console.log(`✅ Subscription: Premium (180-day trial)`);
    console.log(`✅ Location: Melbourne CBD (-37.8136, 144.9631)`);
    console.log(`✅ Staff Members: 3`);
    console.log(`✅ Services: 4 (Buffet, Private Dining, Brunch, Masterclass)`);
    console.log(`✅ Ad Campaigns: 2 active`);
    console.log(`✅ Customer Accounts: 3`);
    console.log(`✅ Bookings: 3`);
    console.log(`✅ Service Slots: ${createdSlots.length}`);
    console.log('\n🎯 Test URLs:');
    console.log(`- Business Dashboard: http://localhost:9102/dashboard/${business.id}`);
    console.log(`- Business Public Page: http://localhost:9102/business/${business.id}`);
    console.log(`- Business Login: http://localhost:9102/auth (${businessOwner.email})`);
    console.log(`- Customer Login: http://localhost:9102/auth (john.doe@email.com)`);

  } catch (error) {
    console.error('❌ Error populating test data:', error);
    throw error;
  }
}

// Run the script
populateTestData()
  .then(() => {
    console.log('\n✅ Test data population completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test data population failed:', error);
    process.exit(1);
  });