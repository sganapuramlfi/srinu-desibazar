import { db } from '../db/index.js';
import { businessTenants, restaurantReservations, restaurantTables } from '../db/index.js';
import { eq } from 'drizzle-orm';

async function checkBusinessAndCreateReservations() {
  try {
    console.log('🔍 Checking business data...');
    
    // Check all businesses
    const businesses = await db.select().from(businessTenants);
    console.log(`Found ${businesses.length} total businesses`);
    
    businesses.forEach(b => {
      console.log(`- ID: ${b.id}, Name: ${b.name}, Slug: ${b.slug}, Active: ${b.isActive}`);
    });

    // Find Spice Pavilion specifically
    const spicePavilion = await db.select()
      .from(businessTenants)
      .where(eq(businessTenants.slug, 'spice-pavilion-melbourne'))
      .limit(1);

    if (spicePavilion.length === 0) {
      console.error('❌ Spice Pavilion not found with slug: spice-pavilion-melbourne');
      return;
    }

    const restaurant = spicePavilion[0];
    console.log(`✅ Found Spice Pavilion: ${restaurant.name} (ID: ${restaurant.id})`);
    console.log(`   Slug: ${restaurant.slug}`);
    console.log(`   Active: ${restaurant.isActive}`);
    console.log(`   Published: ${restaurant.isPublished}`);

    // Check current reservations
    const currentReservations = await db.select()
      .from(restaurantReservations)
      .where(eq(restaurantReservations.businessId, restaurant.id));

    console.log(`\n📅 Current reservations: ${currentReservations.length}`);

    // Get tables
    const tables = await db.select()
      .from(restaurantTables)
      .where(eq(restaurantTables.businessId, restaurant.id));

    console.log(`🪑 Restaurant tables: ${tables.length}`);
    tables.forEach(t => {
      console.log(`   Table ${t.tableNumber}: ${t.maxCapacity} seats (${t.floorArea})`);
    });

    // Create customer-bookable reservations for next few days
    console.log('\n🎯 Creating customer-bookable reservations...');

    const bookableReservations = [
      {
        businessId: restaurant.id,
        tableId: tables[0]?.id, // T1 - 2 seats
        customerName: 'Available Slot',
        customerPhone: '+61400000001',
        customerEmail: 'available@test.com',
        partySize: 2,
        reservationDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        reservationTime: '18:00',
        duration: 90,
        status: 'available' as const,
        specialRequests: '',
        notes: 'Available for booking',
        confirmationCode: 'AVAIL-001',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        businessId: restaurant.id,
        tableId: tables[1]?.id, // T2 - 4 seats
        customerName: 'Available Slot',
        customerPhone: '+61400000002',
        customerEmail: 'available@test.com',
        partySize: 4,
        reservationDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        reservationTime: '19:00',
        duration: 120,
        status: 'available' as const,
        specialRequests: '',
        notes: 'Available for booking',
        confirmationCode: 'AVAIL-002',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        businessId: restaurant.id,
        tableId: tables[2]?.id, // T3 - 6 seats
        customerName: 'Available Slot',
        customerPhone: '+61400000003',
        customerEmail: 'available@test.com',
        partySize: 6,
        reservationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        reservationTime: '18:30',
        duration: 150,
        status: 'available' as const,
        specialRequests: '',
        notes: 'Available for booking',
        confirmationCode: 'AVAIL-003',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const reservation of bookableReservations) {
      if (reservation.tableId) {
        try {
          await db.insert(restaurantReservations).values(reservation);
          console.log(`✅ Created available slot: Table ${tables.find(t => t.id === reservation.tableId)?.tableNumber} for ${reservation.partySize} people`);
        } catch (error) {
          console.log(`⚠️ Slot may already exist: Table ${tables.find(t => t.id === reservation.tableId)?.tableNumber}`);
        }
      }
    }

    console.log('\n🌐 STOREFRONT TESTING URLs:');
    console.log(`Business Page: http://localhost:5173/business/${restaurant.slug}`);
    console.log(`Dashboard: http://localhost:5173/dashboard/${restaurant.slug}`);
    console.log('\n👥 TEST CUSTOMER LOGIN:');
    console.log('Email: sarah.johnson@email.com');
    console.log('Password: consumer123');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkBusinessAndCreateReservations().then(() => process.exit(0));