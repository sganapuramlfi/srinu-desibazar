import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { restaurantTables, businessTenants } from './db/index.js';
import { eq } from 'drizzle-orm';

const connectionString = 'postgresql://postgres:postgres@localhost:9100/desibazaar';
const client = postgres(connectionString);
const db = drizzle(client);

async function checkAndAddTables() {
  try {
    console.log('🔍 Checking restaurant tables...');
    
    // Get all restaurant businesses
    const restaurants = await db
      .select()
      .from(businessTenants)
      .where(eq(businessTenants.industryType, 'restaurant'));
    
    console.log(`Found ${restaurants.length} restaurants`);
    
    for (const restaurant of restaurants) {
      console.log(`\n📍 Checking tables for: ${restaurant.businessName} (ID: ${restaurant.id})`);
      
      // Check existing tables
      const existingTables = await db
        .select()
        .from(restaurantTables)
        .where(eq(restaurantTables.businessId, restaurant.id));
      
      console.log(`   Existing tables: ${existingTables.length}`);
      
      if (existingTables.length === 0) {
        console.log('   ⚡ Adding default tables...');
        
        // Add default tables for this restaurant
        const defaultTables = [
          { tableNumber: 'T1', seatingCapacity: 2, location: 'Window' },
          { tableNumber: 'T2', seatingCapacity: 4, location: 'Main Dining' },
          { tableNumber: 'T3', seatingCapacity: 4, location: 'Main Dining' },
          { tableNumber: 'T4', seatingCapacity: 6, location: 'Main Dining' },
          { tableNumber: 'T5', seatingCapacity: 2, location: 'Window' },
          { tableNumber: 'T6', seatingCapacity: 8, location: 'Private' },
        ];
        
        for (const table of defaultTables) {
          await db.insert(restaurantTables).values({
            businessId: restaurant.id,
            tableNumber: table.tableNumber,
            seatingCapacity: table.seatingCapacity,
            location: table.location,
            isActive: true,
            createdAt: new Date()
          });
          console.log(`     ✅ Added ${table.tableNumber} (${table.seatingCapacity} seats, ${table.location})`);
        }
      } else {
        console.log('   ✅ Tables already exist');
        existingTables.forEach(table => {
          console.log(`     - ${table.tableNumber}: ${table.seatingCapacity} seats, ${table.location}`);
        });
      }
    }
    
    console.log('\n🎉 Table check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkAndAddTables();