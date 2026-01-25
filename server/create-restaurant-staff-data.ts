import { db } from '../db/index.js';
import { businessTenants, restaurantStaff } from '../db/index.js';
import { eq } from 'drizzle-orm';

async function createRestaurantStaffData() {
  try {
    console.log('👨‍🍳 Creating restaurant staff data...');

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

    console.log(`🏪 Creating staff for: ${restaurant.name} (ID: ${restaurant.id})`);

    // Create restaurant staff members
    const staffMembers = [
      {
        businessId: restaurant.id,
        userId: null,
        firstName: 'Rajesh',
        lastName: 'Kumar',
        displayName: 'Chef Rajesh',
        email: 'rajesh.kumar@spicepavilion.com.au',
        phone: '+61412345678',
        title: 'Head Chef',
        bio: 'Authentic Indian cuisine specialist with 15 years of experience. Master of North Indian curries and tandoor cooking.',
        yearsExperience: 15,
        department: 'kitchen',
        position: 'Head Chef',
        certifications: ['food_safety', 'haccp', 'allergen_management'],
        employeeId: 'SP-001',
        hireDate: new Date('2023-01-15'),
        employmentType: 'full_time',
        workingHours: {
          monday: { start: '10:00', end: '22:00' },
          tuesday: { start: '10:00', end: '22:00' },
          wednesday: { start: '10:00', end: '22:00' },
          thursday: { start: '10:00', end: '22:00' },
          friday: { start: '10:00', end: '23:00' },
          saturday: { start: '10:00', end: '23:00' },
          sunday: { start: '16:00', end: '22:00' }
        },
        breakDurationMinutes: 45,
        maxShiftHours: 12,
        cuisineSpecialties: ['north_indian', 'tandoor', 'curries', 'biryani'],
        skills: ['menu_planning', 'kitchen_management', 'spice_blending', 'cost_control'],
        languages: ['english', 'hindi', 'punjabi'],
        performanceRating: 4.8,
        customerRating: 4.9,
        isActive: true,
        canTakeOrders: false,
        canHandlePayments: false
      },
      {
        businessId: restaurant.id,
        userId: null,
        firstName: 'Priya',
        lastName: 'Sharma',
        displayName: 'Chef Priya',
        email: 'priya.sharma@spicepavilion.com.au',
        phone: '+61423456789',
        title: 'Sous Chef',
        bio: 'South Indian cuisine expert specializing in vegetarian dishes and traditional cooking methods.',
        yearsExperience: 8,
        department: 'kitchen',
        position: 'Sous Chef',
        certifications: ['food_safety', 'first_aid'],
        employeeId: 'SP-002',
        hireDate: new Date('2023-03-01'),
        employmentType: 'full_time',
        workingHours: {
          monday: { start: '11:00', end: '20:00' },
          tuesday: { start: '11:00', end: '20:00' },
          wednesday: { start: '11:00', end: '20:00' },
          thursday: { start: '11:00', end: '20:00' },
          friday: { start: '11:00', end: '21:00' },
          saturday: { start: '11:00', end: '21:00' },
          sunday: { start: 'OFF', end: 'OFF' }
        },
        breakDurationMinutes: 30,
        maxShiftHours: 9,
        cuisineSpecialties: ['south_indian', 'vegetarian', 'dosa', 'curry'],
        skills: ['prep_work', 'garnishing', 'inventory_management'],
        languages: ['english', 'hindi', 'tamil'],
        performanceRating: 4.6,
        customerRating: 4.7,
        isActive: true,
        canTakeOrders: false,
        canHandlePayments: false
      },
      {
        businessId: restaurant.id,
        userId: null,
        firstName: 'Sarah',
        lastName: 'Mitchell',
        displayName: 'Sarah',
        email: 'sarah.mitchell@spicepavilion.com.au',
        phone: '+61434567890',
        title: 'Restaurant Manager',
        bio: 'Experienced restaurant manager with expertise in customer service and operations management.',
        yearsExperience: 12,
        department: 'management',
        position: 'Restaurant Manager',
        certifications: ['rsa', 'first_aid', 'food_safety', 'management'],
        employeeId: 'SP-003',
        hireDate: new Date('2022-11-01'),
        employmentType: 'full_time',
        workingHours: {
          monday: { start: '09:00', end: '18:00' },
          tuesday: { start: '12:00', end: '21:00' },
          wednesday: { start: '12:00', end: '21:00' },
          thursday: { start: '12:00', end: '21:00' },
          friday: { start: '12:00', end: '22:00' },
          saturday: { start: '12:00', end: '22:00' },
          sunday: { start: 'OFF', end: 'OFF' }
        },
        breakDurationMinutes: 30,
        maxShiftHours: 9,
        cuisineSpecialties: [],
        skills: ['customer_service', 'staff_management', 'scheduling', 'inventory', 'pos_systems'],
        languages: ['english'],
        performanceRating: 4.7,
        customerRating: 4.8,
        isActive: true,
        canTakeOrders: true,
        canHandlePayments: true
      },
      {
        businessId: restaurant.id,
        userId: null,
        firstName: 'Aiden',
        lastName: 'Walsh',
        displayName: 'Aiden',
        email: 'aiden.walsh@spicepavilion.com.au',
        phone: '+61445678901',
        title: 'Senior Server',
        bio: 'Friendly and knowledgeable server with excellent product knowledge and customer service skills.',
        yearsExperience: 5,
        department: 'front_of_house',
        position: 'Senior Server',
        certifications: ['rsa', 'food_safety'],
        employeeId: 'SP-004',
        hireDate: new Date('2023-05-15'),
        employmentType: 'full_time',
        workingHours: {
          monday: { start: 'OFF', end: 'OFF' },
          tuesday: { start: '16:00', end: '23:00' },
          wednesday: { start: '16:00', end: '23:00' },
          thursday: { start: '16:00', end: '23:00' },
          friday: { start: '16:00', end: '00:00' },
          saturday: { start: '16:00', end: '00:00' },
          sunday: { start: '16:00', end: '22:00' }
        },
        breakDurationMinutes: 30,
        maxShiftHours: 8,
        cuisineSpecialties: [],
        skills: ['table_service', 'wine_knowledge', 'upselling', 'cash_handling', 'customer_relations'],
        languages: ['english'],
        performanceRating: 4.5,
        customerRating: 4.7,
        isActive: true,
        canTakeOrders: true,
        canHandlePayments: true
      },
      {
        businessId: restaurant.id,
        userId: null,
        firstName: 'Maya',
        lastName: 'Patel',
        displayName: 'Maya',
        email: 'maya.patel@spicepavilion.com.au',
        phone: '+61456789012',
        title: 'Server',
        bio: 'Enthusiastic server with great knowledge of Indian cuisine and excellent customer communication.',
        yearsExperience: 2,
        department: 'front_of_house',
        position: 'Server',
        certifications: ['rsa', 'food_safety'],
        employeeId: 'SP-005',
        hireDate: new Date('2023-08-01'),
        employmentType: 'part_time',
        workingHours: {
          monday: { start: 'OFF', end: 'OFF' },
          tuesday: { start: 'OFF', end: 'OFF' },
          wednesday: { start: '17:00', end: '22:00' },
          thursday: { start: '17:00', end: '22:00' },
          friday: { start: '17:00', end: '23:00' },
          saturday: { start: '17:00', end: '23:00' },
          sunday: { start: '17:00', end: '22:00' }
        },
        breakDurationMinutes: 30,
        maxShiftHours: 6,
        cuisineSpecialties: [],
        skills: ['table_service', 'order_taking', 'food_knowledge', 'multitasking'],
        languages: ['english', 'hindi', 'gujarati'],
        performanceRating: 4.3,
        customerRating: 4.5,
        isActive: true,
        canTakeOrders: true,
        canHandlePayments: false
      }
    ];

    // Insert staff members
    for (const staff of staffMembers) {
      try {
        await db.insert(restaurantStaff).values(staff);
        console.log(`✅ Created staff: ${staff.displayName} - ${staff.title} (${staff.department})`);
      } catch (error) {
        console.log(`⚠️ Staff member may already exist: ${staff.displayName}`);
      }
    }

    // Verify staff creation
    const allStaff = await db
      .select()
      .from(restaurantStaff)
      .where(eq(restaurantStaff.businessId, restaurant.id));

    console.log(`\n👥 Total staff members: ${allStaff.length}`);
    
    // Group by department
    const byDepartment = allStaff.reduce((acc, staff) => {
      acc[staff.department] = (acc[staff.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Staff by Department:');
    Object.entries(byDepartment).forEach(([dept, count]) => {
      console.log(`   ${dept}: ${count} staff`);
    });

    console.log('\n🎉 RESTAURANT STAFF CREATION COMPLETE!');
    console.log('=' .repeat(60));
    console.log('✅ 5 staff members created across all departments');
    console.log('✅ Kitchen: Head Chef + Sous Chef');
    console.log('✅ Front of House: Senior Server + Server');
    console.log('✅ Management: Restaurant Manager');
    console.log('\n🌐 Staff can be managed from dashboard:');
    console.log(`   Dashboard: http://localhost:5173/dashboard/${restaurant.slug}`);

  } catch (error) {
    console.error('❌ Error creating restaurant staff:', error);
  }
}

createRestaurantStaffData().then(() => process.exit(0));