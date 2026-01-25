#!/usr/bin/env node

// Script to populate restaurant test data for order management testing

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';

// Import schemas
import * as coreSchema from './db/schema.js';
import * as restaurantSchema from './db/restaurant-schema.js';

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:9100/desibazaar";

const pool = new Pool({
  connectionString: databaseUrl,
});

const db = drizzle(pool, { schema: { ...coreSchema, ...restaurantSchema } });

const populateRestaurantTestData = async () => {
  console.log('🍽️  Populating Restaurant Test Data');
  console.log('=' .repeat(40));

  try {
    // Find or create a restaurant business
    let restaurant = await db
      .select()
      .from(coreSchema.businessTenants)
      .where(eq(coreSchema.businessTenants.industryType, 'restaurant'))
      .limit(1);

    if (restaurant.length === 0) {
      console.log('📝 Creating test restaurant business...');
      
      const [newRestaurant] = await db
        .insert(coreSchema.businessTenants)
        .values({
          name: 'Test Mumbai Restaurant',
          slug: 'test-mumbai-restaurant',
          industryType: 'restaurant',
          description: 'Authentic Indian cuisine for testing order management',
          status: 'active',
          contactInfo: {
            phone: '+61-123-456-789',
            email: 'test@mumbairestaurant.com',
            address: '123 Test Street, Melbourne, VIC 3000'
          },
          operatingHours: {
            monday: { open: '11:00', close: '22:00' },
            tuesday: { open: '11:00', close: '22:00' },
            wednesday: { open: '11:00', close: '22:00' },
            thursday: { open: '11:00', close: '22:00' },
            friday: { open: '11:00', close: '23:00' },
            saturday: { open: '11:00', close: '23:00' },
            sunday: { open: '11:00', close: '21:00' }
          }
        })
        .returning();
      
      restaurant = [newRestaurant];
      console.log('✅ Test restaurant created:', newRestaurant.name);
    }

    const businessId = restaurant[0].id;
    console.log(`📍 Using restaurant: ${restaurant[0].name} (ID: ${businessId})`);

    // Create menu categories
    console.log('\n📋 Creating menu categories...');
    
    const categories = [
      { name: 'Appetizers', description: 'Start your meal with our delicious appetizers', displayOrder: 1 },
      { name: 'Main Courses', description: 'Our signature main dishes', displayOrder: 2 },
      { name: 'Breads', description: 'Freshly baked Indian breads', displayOrder: 3 },
      { name: 'Beverages', description: 'Refreshing drinks', displayOrder: 4 }
    ];

    const insertedCategories = [];
    
    for (const category of categories) {
      const [inserted] = await db
        .insert(restaurantSchema.restaurantMenuCategories)
        .values({
          businessId,
          ...category,
          createdAt: new Date()
        })
        .returning();
      
      insertedCategories.push(inserted);
      console.log(`   ✅ ${inserted.name}`);
    }

    // Create menu items
    console.log('\n🍛 Creating menu items...');
    
    const menuItems = [
      // Appetizers
      {
        categoryId: insertedCategories[0].id,
        name: 'Samosa (2 pieces)',
        description: 'Crispy pastry filled with spiced potatoes and peas',
        price: '8.90',
        prepTimeMinutes: 10,
        spiceLevel: 2,
        dietaryTags: ['vegetarian'],
        inStock: true,
        displayOrder: 1
      },
      {
        categoryId: insertedCategories[0].id,
        name: 'Chicken Tikka',
        description: 'Marinated chicken pieces grilled in tandoor',
        price: '16.90',
        prepTimeMinutes: 15,
        spiceLevel: 3,
        dietaryTags: ['halal'],
        inStock: true,
        displayOrder: 2
      },
      
      // Main Courses
      {
        categoryId: insertedCategories[1].id,
        name: 'Butter Chicken',
        description: 'Tender chicken in rich, creamy tomato sauce',
        price: '24.90',
        prepTimeMinutes: 20,
        spiceLevel: 2,
        dietaryTags: ['halal'],
        inStock: true,
        displayOrder: 1
      },
      {
        categoryId: insertedCategories[1].id,
        name: 'Lamb Vindaloo',
        description: 'Spicy lamb curry with potatoes in tangy sauce',
        price: '28.90',
        prepTimeMinutes: 25,
        spiceLevel: 4,
        dietaryTags: ['halal'],
        inStock: true,
        displayOrder: 2
      },
      {
        categoryId: insertedCategories[1].id,
        name: 'Palak Paneer',
        description: 'Cottage cheese in creamy spinach gravy',
        price: '22.90',
        prepTimeMinutes: 18,
        spiceLevel: 2,
        dietaryTags: ['vegetarian'],
        inStock: true,
        displayOrder: 3
      },
      
      // Breads
      {
        categoryId: insertedCategories[2].id,
        name: 'Naan Bread',
        description: 'Traditional leavened bread baked in tandoor',
        price: '4.50',
        prepTimeMinutes: 8,
        spiceLevel: 0,
        dietaryTags: ['vegetarian'],
        inStock: true,
        displayOrder: 1
      },
      {
        categoryId: insertedCategories[2].id,
        name: 'Garlic Naan',
        description: 'Naan bread topped with fresh garlic and herbs',
        price: '5.50',
        prepTimeMinutes: 8,
        spiceLevel: 1,
        dietaryTags: ['vegetarian'],
        inStock: true,
        displayOrder: 2
      },
      
      // Beverages
      {
        categoryId: insertedCategories[3].id,
        name: 'Mango Lassi',
        description: 'Sweet yogurt drink with fresh mango',
        price: '6.90',
        prepTimeMinutes: 3,
        spiceLevel: 0,
        dietaryTags: ['vegetarian'],
        inStock: true,
        displayOrder: 1
      },
      {
        categoryId: insertedCategories[3].id,
        name: 'Masala Chai',
        description: 'Spiced Indian tea with milk',
        price: '4.90',
        prepTimeMinutes: 5,
        spiceLevel: 1,
        dietaryTags: ['vegetarian'],
        inStock: true,
        displayOrder: 2
      }
    ];

    for (const item of menuItems) {
      await db
        .insert(restaurantSchema.restaurantMenuItems)
        .values({
          businessId,
          ...item,
          createdAt: new Date()
        });
      
      console.log(`   ✅ ${item.name} - $${item.price}`);
    }

    // Create some sample restaurant tables
    console.log('\n🪑 Creating restaurant tables...');
    
    const tables = [
      { tableNumber: 'T01', maxCapacity: 2, floorArea: 'Main', tableShape: 'round' },
      { tableNumber: 'T02', maxCapacity: 4, floorArea: 'Main', tableShape: 'square' },
      { tableNumber: 'T03', maxCapacity: 6, floorArea: 'Main', tableShape: 'rectangle' },
      { tableNumber: 'T04', maxCapacity: 4, floorArea: 'Patio', tableShape: 'round', hasWindowView: true },
      { tableNumber: 'T05', maxCapacity: 8, floorArea: 'Private', tableShape: 'rectangle', isBooth: true }
    ];

    for (const table of tables) {
      await db
        .insert(restaurantSchema.restaurantTables)
        .values({
          businessId,
          ...table,
          createdAt: new Date()
        });
      
      console.log(`   ✅ Table ${table.tableNumber} (${table.maxCapacity} seats) - ${table.floorArea}`);
    }

    console.log('\n' + '='.repeat(40));
    console.log('✅ Restaurant test data populated successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Restaurant: ${restaurant[0].name}`);
    console.log(`   • Categories: ${categories.length}`);
    console.log(`   • Menu Items: ${menuItems.length}`);
    console.log(`   • Tables: ${tables.length}`);
    console.log('\n🚀 Ready for order management testing!');

  } catch (error) {
    console.error('💥 Error populating test data:', error);
  } finally {
    await pool.end();
  }
};

// Run the population script
populateRestaurantTestData();