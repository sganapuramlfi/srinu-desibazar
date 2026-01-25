// Add restaurant promotions and clean up duplicates
import { db } from '../db/index.js';
import { 
  businessTenants, 
  restaurantMenuItems,
  restaurantMenuCategories
} from '../db/index.js';
import { eq, and, count } from 'drizzle-orm';

async function addRestaurantPromotions() {
  try {
    console.log('🎉 Adding restaurant promotions and cleaning up data...');

    // Get the Spice Pavilion restaurant
    const [restaurant] = await db
      .select()
      .from(businessTenants)
      .where(eq(businessTenants.slug, 'spice-pavilion-melbourne'))
      .limit(1);

    if (!restaurant) {
      console.error('❌ Spice Pavilion restaurant not found!');
      return;
    }

    // 1. CLEAN UP DUPLICATE MENU ITEMS
    console.log('🧹 Cleaning up duplicate menu items...');
    
    // Get all menu items for this business
    const allMenuItems = await db
      .select()
      .from(restaurantMenuItems)
      .where(eq(restaurantMenuItems.businessId, restaurant.id));

    console.log(`Found ${allMenuItems.length} total menu items`);

    // Group by name to find duplicates
    const itemsByName = allMenuItems.reduce((acc, item) => {
      if (!acc[item.name]) {
        acc[item.name] = [];
      }
      acc[item.name].push(item);
      return acc;
    }, {} as Record<string, typeof allMenuItems>);

    // Remove duplicates (keep the first one)
    let removedCount = 0;
    for (const [name, items] of Object.entries(itemsByName)) {
      if (items.length > 1) {
        console.log(`⚠️ Found ${items.length} duplicates of "${name}"`);
        
        // Keep the first item, remove the rest
        const toRemove = items.slice(1);
        for (const item of toRemove) {
          await db
            .delete(restaurantMenuItems)
            .where(eq(restaurantMenuItems.id, item.id));
          removedCount++;
        }
      }
    }

    console.log(`✅ Removed ${removedCount} duplicate menu items`);

    // 2. CLEAN UP DUPLICATE CATEGORIES
    console.log('🧹 Cleaning up duplicate categories...');
    
    const allCategories = await db
      .select()
      .from(restaurantMenuCategories)
      .where(eq(restaurantMenuCategories.businessId, restaurant.id));

    console.log(`Found ${allCategories.length} total categories`);

    const categoriesByName = allCategories.reduce((acc, cat) => {
      if (!acc[cat.name]) {
        acc[cat.name] = [];
      }
      acc[cat.name].push(cat);
      return acc;
    }, {} as Record<string, typeof allCategories>);

    let removedCatCount = 0;
    for (const [name, categories] of Object.entries(categoriesByName)) {
      if (categories.length > 1) {
        console.log(`⚠️ Found ${categories.length} duplicate categories of "${name}"`);
        
        // Keep the first category, remove the rest
        const toRemove = categories.slice(1);
        for (const cat of toRemove) {
          // First, update any menu items pointing to the duplicate to point to the first one
          await db
            .update(restaurantMenuItems)
            .set({ categoryId: categories[0].id })
            .where(eq(restaurantMenuItems.categoryId, cat.id));
          
          // Then remove the duplicate category
          await db
            .delete(restaurantMenuCategories)
            .where(eq(restaurantMenuCategories.id, cat.id));
          removedCatCount++;
        }
      }
    }

    console.log(`✅ Removed ${removedCatCount} duplicate categories`);

    // 3. ADD RESTAURANT PROMOTIONS (add to business settings)
    console.log('🎉 Adding restaurant promotions...');
    
    const promotions = {
      activePromotions: [
        {
          id: 'happy-hour-2024',
          title: 'Happy Hour Special',
          description: 'Get 20% off all appetizers and drinks between 5-7 PM on weekdays',
          discountType: 'percentage',
          discountValue: 20,
          applicableItems: ['appetizers', 'beverages'],
          timeRestrictions: {
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            startTime: '17:00',
            endTime: '19:00'
          },
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
          isActive: true,
          maxUses: 1000,
          currentUses: 47
        },
        {
          id: 'family-feast-2024',
          title: 'Family Feast Deal',
          description: 'Order any 2 curries, 1 biryani, 3 naan breads and get free appetizer + dessert',
          discountType: 'bundle',
          bundleItems: [
            { category: 'curries', quantity: 2 },
            { category: 'biryanis', quantity: 1 },
            { category: 'breads', quantity: 3 }
          ],
          freeItems: [
            { category: 'appetizers', quantity: 1 },
            { category: 'desserts', quantity: 1 }
          ],
          minimumOrderValue: 80,
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
          isActive: true,
          maxUses: 500,
          currentUses: 23
        },
        {
          id: 'birthday-special-2024',
          title: 'Birthday Celebration',
          description: 'Complimentary dessert and special decoration for birthday celebrations (advance booking required)',
          discountType: 'complimentary',
          freeItems: [
            { category: 'desserts', quantity: 1, notes: 'With birthday candle and decoration' }
          ],
          requirements: ['advance_booking', 'minimum_2_people'],
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 365 days
          isActive: true,
          maxUses: 365,
          currentUses: 12
        }
      ],
      pastPromotions: [
        {
          id: 'grand-opening-2024',
          title: 'Grand Opening Special',
          description: '50% off all orders during opening week',
          discountType: 'percentage',
          discountValue: 50,
          validFrom: '2024-01-15T00:00:00Z',
          validUntil: '2024-01-22T23:59:59Z',
          isActive: false,
          totalUses: 234
        }
      ]
    };

    // Update business with promotions data
    await db
      .update(businessTenants)
      .set({
        promotions: promotions,
        updatedAt: new Date()
      })
      .where(eq(businessTenants.id, restaurant.id));

    console.log('✅ Added restaurant promotions to business settings');

    // 4. Final verification
    console.log('🔍 Final verification...');
    
    const finalMenuItems = await db
      .select()
      .from(restaurantMenuItems)
      .where(eq(restaurantMenuItems.businessId, restaurant.id));

    const finalCategories = await db
      .select()
      .from(restaurantMenuCategories)
      .where(eq(restaurantMenuCategories.businessId, restaurant.id));

    console.log(`✅ Final count: ${finalCategories.length} categories, ${finalMenuItems.length} menu items`);

    // Show category breakdown
    for (const category of finalCategories) {
      const itemCount = finalMenuItems.filter(item => item.categoryId === category.id).length;
      console.log(`   📂 ${category.name}: ${itemCount} items`);
    }

    console.log('\n🎉 RESTAURANT PROMOTIONS & CLEANUP COMPLETE!');
    console.log('=' .repeat(60));
    console.log('✅ Cleaned up duplicate menu items and categories');
    console.log('✅ Added 3 active promotions + 1 past promotion');
    console.log('✅ Updated business settings with promotions data');
    console.log('\n🎯 PROMOTIONS ADDED:');
    console.log('   🕰️ Happy Hour Special (5-7 PM weekdays)');
    console.log('   👨‍👩‍👧‍👦 Family Feast Deal (bundle offer)'); 
    console.log('   🎂 Birthday Celebration (complimentary dessert)');
    console.log('\n🌐 Test at: http://localhost:5173/business/spice-pavilion-melbourne');

  } catch (error) {
    console.error('❌ Error adding promotions:', error);
  }
}

// Run the function
addRestaurantPromotions().then(() => process.exit(0));