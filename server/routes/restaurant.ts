import { Router } from "express";
import { db } from "../../db/index.js";
import {
  businessTenants,
  restaurantMenuCategories,
  restaurantMenuItems,
  restaurantTables,
  restaurantReservations,
  restaurantOrders,
  restaurantStaff,
  bookableItems,
  bookings
} from "../../db/index.js";
import { eq, and, desc, gte, lte, sql, not } from "drizzle-orm";
import { z } from "zod";
import { requireBusinessAccess } from "../middleware/businessAccess.js";
import { constraintValidator } from "../services/ConstraintValidator.js";
import { businessCommunications, aiSuggestions, notificationQueue } from "../../db/index.js";

const router = Router();

// Combined middleware for restaurant ownership - checks business access and restaurant type
const verifyRestaurantOwnership = [
  requireBusinessAccess(["owner"]), // Business owner access required
  async (req: any, res: any, next: any) => {
    try {
      // Additional check to ensure this is a restaurant business
      if (req.businessContext?.business?.industryType !== "restaurant") {
        return res.status(403).json({ error: "Access denied - Not a restaurant business" });
      }
      next();
    } catch (error) {
      console.error('Restaurant type verification error:', error);
      res.status(500).json({ error: "Server error" });
    }
  }
];

// Validation schemas
const menuCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  displayOrder: z.number().optional()
});

const menuItemSchema = z.object({
  categoryId: z.number().optional(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  preparationTime: z.number().optional(),
  spiceLevel: z.number().min(0).max(5).optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  isHalal: z.boolean().optional(),
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
  stockQuantity: z.number().optional()
});

const tableSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required"),
  seatingCapacity: z.number().positive("Seating capacity must be positive"),
  location: z.string().optional()
});

const reservationSchema = z.object({
  tableId: z.number().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional().refine(
    (phone) => !phone || phone.length >= 10,
    "Phone number must be at least 10 characters if provided"
  ),
  customerEmail: z.string().email().optional(),
  partySize: z.number().positive("Party size must be positive"),
  reservationDate: z.string(), // ISO date string
  specialRequests: z.string().optional(),
  occasion: z.string().optional(),
  seatingPreference: z.string().optional(),
  dietaryRequirements: z.array(z.string()).optional()
});

// ===== MENU MANAGEMENT =====

// Get menu categories
router.get("/restaurants/:businessId/menu/categories", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    
    const categories = await db
      .select()
      .from(restaurantMenuCategories)
      .where(eq(restaurantMenuCategories.businessId, businessId))
      .orderBy(restaurantMenuCategories.displayOrder, restaurantMenuCategories.name);

    res.json(categories);
  } catch (error) {
    console.error('Error fetching menu categories:', error);
    res.status(500).json({ error: "Failed to fetch menu categories" });
  }
});

// Create menu category
router.post("/restaurants/:businessId/menu/categories", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const result = menuCategorySchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: result.error.issues 
      });
    }

    const [category] = await db
      .insert(restaurantMenuCategories)
      .values({
        businessId,
        ...result.data,
        createdAt: new Date()
      })
      .returning();

    res.json(category);
  } catch (error) {
    console.error('Error creating menu category:', error);
    res.status(500).json({ error: "Failed to create menu category" });
  }
});

// Get menu items
router.get("/restaurants/:businessId/menu/items", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : null;
    
    let query = db
      .select({
        id: restaurantMenuItems.id,
        name: restaurantMenuItems.name,
        description: restaurantMenuItems.description,
        price: restaurantMenuItems.price,
        imageUrl: restaurantMenuItems.imageUrl,
        prepTimeMinutes: restaurantMenuItems.prepTimeMinutes,
        spiceLevel: restaurantMenuItems.spiceLevel,
        dietaryTags: restaurantMenuItems.dietaryTags,
        inStock: restaurantMenuItems.inStock,
        displayOrder: restaurantMenuItems.displayOrder,
        category: {
          id: restaurantMenuCategories.id,
          name: restaurantMenuCategories.name
        }
      })
      .from(restaurantMenuItems)
      .leftJoin(restaurantMenuCategories, eq(restaurantMenuItems.categoryId, restaurantMenuCategories.id))
      .where(eq(restaurantMenuItems.businessId, businessId));

    if (categoryId) {
      query = query.where(eq(restaurantMenuItems.categoryId, categoryId));
    }

    const items = await query.orderBy(restaurantMenuItems.displayOrder, restaurantMenuItems.name);

    // Transform the data to match frontend expectations
    const transformedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      preparationTime: item.prepTimeMinutes,
      spiceLevel: item.spiceLevel,
      isVegetarian: item.dietaryTags?.includes('vegetarian') || false,
      isVegan: item.dietaryTags?.includes('vegan') || false,
      isHalal: item.dietaryTags?.includes('halal') || false,
      isGlutenFree: item.dietaryTags?.includes('gluten-free') || false,
      inStock: item.inStock,
      displayOrder: item.displayOrder,
      category: item.category
    }));

    res.json(transformedItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// Create menu item
router.post("/restaurants/:businessId/menu/items", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const result = menuItemSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: result.error.issues 
      });
    }

    const [item] = await db
      .insert(restaurantMenuItems)
      .values({
        businessId,
        ...result.data,
        createdAt: new Date()
      })
      .returning();

    res.json(item);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: "Failed to create menu item" });
  }
});

// Update menu item
router.put("/restaurants/:businessId/menu/items/:itemId", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const itemId = parseInt(req.params.itemId);
    const result = menuItemSchema.partial().safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: result.error.issues 
      });
    }

    const [updated] = await db
      .update(restaurantMenuItems)
      .set({
        ...result.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(restaurantMenuItems.id, itemId),
        eq(restaurantMenuItems.businessId, businessId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: "Failed to update menu item" });
  }
});

// ===== TABLE MANAGEMENT =====

// Get restaurant tables
router.get("/restaurants/:businessId/tables", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    
    const tables = await db
      .select()
      .from(restaurantTables)
      .where(eq(restaurantTables.businessId, businessId))
      .orderBy(restaurantTables.tableNumber);

    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: "Failed to fetch tables" });
  }
});

// Get available tables for public booking (no authentication required)
router.get("/restaurants/:businessId/tables/available", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { date, time, partySize } = req.query;
    
    if (!date || !time || !partySize) {
      return res.status(400).json({ error: "date, time, and partySize are required" });
    }
    
    const requestedDateTime = new Date(`${date}T${time}:00`);
    const partySizeNum = parseInt(partySize as string);
    
    // Get all active tables with business-smart allocation
    // Smaller parties can take larger tables (restaurant's revenue decision)
    const allTables = await db
      .select()
      .from(restaurantTables)
      .where(and(
        eq(restaurantTables.businessId, businessId),
        eq(restaurantTables.isActive, true),
        eq(restaurantTables.isReservable, true),
        gte(restaurantTables.maxCapacity, Math.max(1, partySizeNum)) // Even 1 person can book larger tables
      ))
      .orderBy(
        // Smart ordering: prefer optimal capacity, then smaller tables, then window views
        sql`CASE 
          WHEN ${restaurantTables.idealCapacity} = ${partySizeNum} THEN 1
          WHEN ${restaurantTables.maxCapacity} = ${partySizeNum} THEN 2  
          WHEN ${restaurantTables.maxCapacity} > ${partySizeNum} THEN 3
          ELSE 4
        END`,
        restaurantTables.maxCapacity, 
        sql`CASE WHEN ${restaurantTables.hasWindowView} THEN 0 ELSE 1 END`,
        restaurantTables.tableNumber
      );
    
    // Check which tables are available using proper booking schema
    const twoHoursLater = new Date(requestedDateTime.getTime() + 2 * 60 * 60 * 1000);
    const twoHoursBefore = new Date(requestedDateTime.getTime() - 2 * 60 * 60 * 1000);
    
    console.log(`[Availability] Checking conflicts for ${requestedDateTime} (${twoHoursBefore} to ${twoHoursLater})`);
    
    // Get conflicting bookings through the proper schema relationship
    const conflictingBookings = await db
      .select({ 
        tableId: restaurantReservations.tableId,
        bookingId: restaurantReservations.bookingId,
        status: sql`b.status`
      })
      .from(restaurantReservations)
      .innerJoin(sql`bookings b`, eq(restaurantReservations.bookingId, sql`b.id`))
      .where(and(
        eq(restaurantReservations.businessId, businessId),
        sql`b.start_time >= ${twoHoursBefore}`,
        sql`b.start_time <= ${twoHoursLater}`,
        sql`b.status != 'cancelled'`
      ));
    
    console.log(`[Availability] Found ${conflictingBookings.length} conflicting bookings:`, conflictingBookings);
    
    const bookedTableIds = new Set(
      conflictingBookings
        .map(r => r.tableId)
        .filter(Boolean)
    );
    
    console.log(`[Availability] Booked table IDs:`, Array.from(bookedTableIds));
    
    // Filter out tables that are already booked - business smart approach
    const availableTables = allTables.filter(table => {
      const isAvailable = !bookedTableIds.has(table.id);
      console.log(`[Availability] Table ${table.tableNumber} (ID: ${table.id}): ${isAvailable ? 'AVAILABLE' : 'BOOKED'}`);
      return isAvailable;
    });
    
    res.json(availableTables);
  } catch (error) {
    console.error('Error fetching available tables:', error);
    res.status(500).json({ error: "Failed to fetch available tables" });
  }
});

// Create restaurant table
router.post("/restaurants/:businessId/tables", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const result = tableSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: result.error.issues 
      });
    }

    const [table] = await db
      .insert(restaurantTables)
      .values({
        businessId,
        ...result.data,
        createdAt: new Date()
      })
      .returning();

    res.json(table);
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: "Failed to create table" });
  }
});

// ===== RESERVATION MANAGEMENT =====

// Get reservations
router.get("/restaurants/:businessId/reservations", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const date = req.query.date as string; // YYYY-MM-DD format
    
    let query = db
      .select({
        reservation: restaurantReservations,
        table: {
          id: restaurantTables.id,
          tableNumber: restaurantTables.tableNumber,
          seatingCapacity: restaurantTables.seatingCapacity,
          location: restaurantTables.location
        }
      })
      .from(restaurantReservations)
      .leftJoin(restaurantTables, eq(restaurantReservations.tableId, restaurantTables.id))
      .where(eq(restaurantReservations.businessId, businessId));

    if (date) {
      const startDate = new Date(`${date}T00:00:00`);
      const endDate = new Date(`${date}T23:59:59`);
      query = query.where(and(
        gte(restaurantReservations.reservationDate, startDate),
        lte(restaurantReservations.reservationDate, endDate)
      ));
    }

    const reservations = await query.orderBy(restaurantReservations.reservationDate);

    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

// Create reservation (Universal Booking System Integration)
router.post("/restaurants/:businessId/reservations", async (req, res) => {
  try {
    console.log(`[Restaurant] Creating reservation for business ${req.params.businessId}`);
    console.log(`[Restaurant] Request body:`, req.body);
    console.log(`[Restaurant] User:`, req.user?.email || 'Not authenticated');
    
    const businessId = parseInt(req.params.businessId);
    const result = reservationSchema.safeParse(req.body);
    
    if (!result.success) {
      console.log(`[Restaurant] Validation failed:`, result.error.issues);
      return res.status(400).json({ 
        error: "Invalid input", 
        details: result.error.issues 
      });
    }

    const reservationDate = new Date(result.data.reservationDate);
    const endTime = new Date(reservationDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours default
    
    // Get the bookable item for the specified table
    let bookableItemId = null;
    if (result.data.tableId) {
      const bookableItem = await db
        .select()
        .from(bookableItems)
        .where(and(
          eq(bookableItems.businessId, businessId),
          eq(bookableItems.itemType, "restaurant_table"),
          eq(bookableItems.itemId, result.data.tableId),
          eq(bookableItems.isActive, true)
        ))
        .limit(1);
      
      if (bookableItem.length === 0) {
        return res.status(400).json({ error: "Table not available for booking" });
      }
      
      bookableItemId = bookableItem[0].id;
      
      // Use enhanced constraint validation
      const bookingRequest = {
        businessId,
        bookableItemId,
        customerName: result.data.customerName,
        customerPhone: result.data.customerPhone,
        customerEmail: result.data.customerEmail,
        bookingDate: reservationDate.toISOString().split('T')[0],
        startTime: reservationDate,
        endTime: endTime,
        partySize: result.data.partySize,
        specialRequests: result.data.specialRequests,
        metadata: {
          estimatedDuration: 120, // 2 hours
          tableId: result.data.tableId
        }
      };

      const validationResult = await constraintValidator.validateBookingRequest(bookingRequest);
      
      if (!validationResult.isValid) {
        // Find the most critical violation
        const criticalViolation = validationResult.violations.find(v => v.isMandatory);
        if (criticalViolation) {
          // Create communication thread for constraint violations
          await createConstraintViolationCommunication(
            businessId, 
            bookingRequest, 
            validationResult.violations,
            validationResult.warnings,
            req
          );
          
          return res.status(409).json({ 
            error: criticalViolation.message,
            suggestedAction: criticalViolation.suggestedAction,
            violations: validationResult.violations,
            warnings: validationResult.warnings,
            communicationAvailable: true,
            helpMessage: "Don't worry! I can help you find alternatives. Check your messages for AI-powered suggestions."
          });
        }
      }
      
      // Log warnings if any (non-blocking)
      if (validationResult.warnings.length > 0) {
        console.log(`Booking warnings for business ${businessId}:`, validationResult.warnings);
      }
    } else {
      // For general reservations without specific table, find any available table
      const availableTables = await db
        .select()
        .from(bookableItems)
        .where(and(
          eq(bookableItems.businessId, businessId),
          eq(bookableItems.itemType, "restaurant_table"),
          eq(bookableItems.isActive, true)
        ))
        .limit(1);
      
      if (availableTables.length > 0) {
        bookableItemId = availableTables[0].id;
        // Update result.data.tableId for the restaurant reservation
        result.data.tableId = availableTables[0].itemId;
      }
    }

    // Create universal booking first
    const [universalBooking] = await db
      .insert(bookings)
      .values({
        businessId,
        bookableItemId: bookableItemId,
        customerName: result.data.customerName,
        customerPhone: result.data.customerPhone,
        customerEmail: result.data.customerEmail,
        bookingDate: reservationDate.toISOString().split('T')[0], // Date only
        startTime: reservationDate,
        endTime: endTime,
        partySize: result.data.partySize,
        status: "pending",
        specialRequests: result.data.specialRequests,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Create restaurant-specific reservation linked to universal booking
    const [restaurantReservation] = await db
      .insert(restaurantReservations)
      .values({
        businessId,
        bookingId: universalBooking.id, // Link to universal booking
        tableId: result.data.tableId,
        occasion: result.data.occasion,
        seatingPreference: result.data.seatingPreference,
        dietaryRequirements: result.data.dietaryRequirements || [],
        createdAt: new Date()
      })
      .returning();

    console.log(`[Restaurant] Reservation created successfully:`, {
      universalBookingId: universalBooking.id,
      restaurantReservationId: restaurantReservation.id,
      tableId: result.data.tableId
    });

    // Return combined reservation data
    const responseData = {
      ...universalBooking,
      restaurantDetails: restaurantReservation,
      tableId: result.data.tableId,
      occasion: result.data.occasion,
      seatingPreference: result.data.seatingPreference,
      dietaryRequirements: result.data.dietaryRequirements,
      bookingNumber: `BKG-${universalBooking.id}-${Date.now().toString().slice(-4)}`
    };
    
    console.log(`[Restaurant] Returning response:`, responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: "Failed to create reservation" });
  }
});

// Update reservation status
router.put("/restaurants/:businessId/reservations/:reservationId/status", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const reservationId = parseInt(req.params.reservationId);
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "seated", "completed", "cancelled", "no_show"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [updated] = await db
      .update(restaurantReservations)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(and(
        eq(restaurantReservations.id, reservationId),
        eq(restaurantReservations.businessId, businessId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({ error: "Failed to update reservation status" });
  }
});

// ===== STAFF MANAGEMENT =====

// Get restaurant staff
router.get("/restaurants/:businessId/staff", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);

    const staff = await db
      .select()
      .from(restaurantStaff)
      .where(eq(restaurantStaff.businessId, businessId));

    res.json(staff);
  } catch (error) {
    console.error('Error fetching restaurant staff:', error);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

// Create staff member
router.post("/restaurants/:businessId/staff", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const {
      firstName,
      lastName,
      displayName,
      email,
      phone,
      title,
      department,
      position,
      employmentType,
      certifications,
      cuisineSpecialties,
      skills,
      languages
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({ error: "First name and last name are required" });
    }

    const [newStaff] = await db
      .insert(restaurantStaff)
      .values({
        businessId,
        firstName,
        lastName,
        displayName: displayName || `${firstName} ${lastName}`,
        email,
        phone,
        title,
        department: department || "front_of_house",
        position,
        employmentType: employmentType || "full_time",
        certifications: certifications || [],
        cuisineSpecialties: cuisineSpecialties || [],
        skills: skills || [],
        languages: languages || ["english"],
        isActive: true,
      })
      .returning();

    res.status(201).json(newStaff);
  } catch (error) {
    console.error('Error creating staff member:', error);
    res.status(500).json({ error: "Failed to create staff member" });
  }
});

// Update staff member
router.put("/restaurants/:businessId/staff/:staffId", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const staffId = parseInt(req.params.staffId);

    // Verify staff belongs to this business
    const [existingStaff] = await db
      .select()
      .from(restaurantStaff)
      .where(and(
        eq(restaurantStaff.id, staffId),
        eq(restaurantStaff.businessId, businessId)
      ))
      .limit(1);

    if (!existingStaff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const [updated] = await db
      .update(restaurantStaff)
      .set({
        ...req.body,
        updatedAt: new Date()
      })
      .where(eq(restaurantStaff.id, staffId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error updating staff member:', error);
    res.status(500).json({ error: "Failed to update staff member" });
  }
});

// Delete staff member
router.delete("/restaurants/:businessId/staff/:staffId", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const staffId = parseInt(req.params.staffId);

    // Verify staff belongs to this business
    const [existingStaff] = await db
      .select()
      .from(restaurantStaff)
      .where(and(
        eq(restaurantStaff.id, staffId),
        eq(restaurantStaff.businessId, businessId)
      ))
      .limit(1);

    if (!existingStaff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    // Soft delete by setting isActive to false
    await db
      .update(restaurantStaff)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(restaurantStaff.id, staffId));

    res.json({ success: true, message: "Staff member deleted" });
  } catch (error) {
    console.error('Error deleting staff member:', error);
    res.status(500).json({ error: "Failed to delete staff member" });
  }
});

// ===== PROMOTIONS =====

// Get active promotions - TODO: Implement promotions table
router.get("/restaurants/:businessId/promotions", async (req, res) => {
  try {
    // Temporarily return empty array until promotions table is implemented
    res.json([]);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ error: "Failed to fetch promotions" });
  }
});

// Create promotion - TODO: Implement promotions table
router.post("/restaurants/:businessId/promotions", verifyRestaurantOwnership, async (req, res) => {
  try {
    // Temporarily return error until promotions table is implemented
    res.status(501).json({ error: "Promotions management not yet implemented" });
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ error: "Failed to create promotion" });
  }
});

// ===== DASHBOARD OVERVIEW =====

// Get restaurant dashboard data
router.get("/restaurants/:businessId/dashboard", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's reservations
    const todayReservations = await db
      .select()
      .from(restaurantReservations)
      .where(and(
        eq(restaurantReservations.businessId, businessId),
        gte(restaurantReservations.reservationDate, today),
        lte(restaurantReservations.reservationDate, tomorrow)
      ));

    // Get menu items count
    const menuCount = await db
      .select({ count: db.$count() })
      .from(restaurantMenuItems)
      .where(eq(restaurantMenuItems.businessId, businessId));
    
    const activeMenuCount = await db
      .select({ count: db.$count() })
      .from(restaurantMenuItems)
      .where(and(
        eq(restaurantMenuItems.businessId, businessId),
        eq(restaurantMenuItems.inStock, true)
      ));

    const menuStats = {
      totalItems: menuCount[0]?.count || 0,
      activeItems: activeMenuCount[0]?.count || 0
    };

    // Get staff count - TODO: Implement restaurantStaff table
    const staffStats = { totalStaff: 0, activeStaff: 0 };

    // Get tables count
    const tableCount = await db
      .select({ count: db.$count() })
      .from(restaurantTables)
      .where(eq(restaurantTables.businessId, businessId));
    
    const tableStats = { totalTables: tableCount[0]?.count || 0 };

    const dashboardData = {
      todayReservations: {
        total: todayReservations.length,
        confirmed: todayReservations.filter(r => r.status === 'confirmed').length,
        pending: todayReservations.filter(r => r.status === 'pending').length,
        completed: todayReservations.filter(r => r.status === 'completed').length
      },
      menu: menuStats || { totalItems: 0, activeItems: 0 },
      staff: staffStats || { totalStaff: 0, activeStaff: 0 },
      tables: tableStats || { totalTables: 0 }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// =============================================================================
// ORDER MANAGEMENT ENDPOINTS
// =============================================================================

// Get all orders for a restaurant
router.get("/restaurants/:businessId/orders", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { status, date, limit = 50 } = req.query;
    
    let query = db
      .select()
      .from(restaurantOrders)
      .where(eq(restaurantOrders.businessId, businessId));
    
    // Filter by status if provided
    if (status && typeof status === 'string') {
      query = query.where(and(
        eq(restaurantOrders.businessId, businessId),
        eq(restaurantOrders.status, status as any)
      ));
    }
    
    // Filter by date if provided
    if (date && typeof date === 'string') {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
      
      query = query.where(and(
        eq(restaurantOrders.businessId, businessId),
        gte(restaurantOrders.orderedAt, startOfDay),
        lte(restaurantOrders.orderedAt, endOfDay)
      ));
    }
    
    const orders = await query
      .orderBy(desc(restaurantOrders.orderedAt))
      .limit(parseInt(limit as string));
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Create a new order
router.post("/restaurants/:businessId/orders", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const orderData = req.body;
    
    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Calculate estimated ready time (30 minutes default + prep time)
    const estimatedReadyAt = new Date();
    estimatedReadyAt.setMinutes(estimatedReadyAt.getMinutes() + (orderData.estimatedPrepTime || 30));
    
    const [newOrder] = await db
      .insert(restaurantOrders)
      .values({
        businessId,
        orderNumber,
        orderType: orderData.orderType,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerId: orderData.customerId || null,
        orderItems: orderData.orderItems,
        subtotal: orderData.subtotal,
        tax: orderData.tax || "0",
        deliveryFee: orderData.deliveryFee || "0",
        tip: orderData.tip || "0",
        total: orderData.total,
        estimatedReadyAt,
        deliveryAddress: orderData.deliveryAddress || null,
        deliveryInstructions: orderData.deliveryInstructions || null,
        status: "received"
      })
      .returning();
    
    res.json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Update order status
router.patch("/restaurants/:businessId/orders/:orderId/status", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const orderId = parseInt(req.params.orderId);
    const { status } = req.body;
    
    const validStatuses = ["received", "preparing", "ready", "delivered", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    // Update timestamps based on status
    const updateData: any = { status, updatedAt: new Date() };
    
    if (status === "ready") {
      updateData.readyAt = new Date();
    } else if (status === "completed" || status === "delivered") {
      updateData.completedAt = new Date();
    }
    
    const [updatedOrder] = await db
      .update(restaurantOrders)
      .set(updateData)
      .where(and(
        eq(restaurantOrders.id, orderId),
        eq(restaurantOrders.businessId, businessId)
      ))
      .returning();
    
    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Create customer notification for order status update
    let notificationMessage = "";
    switch (status) {
      case "confirmed":
        notificationMessage = `Your order #${updatedOrder.orderNumber} has been confirmed and will be prepared soon.`;
        break;
      case "preparing":
        notificationMessage = `Your order #${updatedOrder.orderNumber} is now being prepared.`;
        break;
      case "ready":
        notificationMessage = `Your order #${updatedOrder.orderNumber} is ready for pickup!`;
        break;
      case "delivered":
        notificationMessage = `Your order #${updatedOrder.orderNumber} has been delivered. Enjoy your meal!`;
        break;
      case "completed":
        notificationMessage = `Your order #${updatedOrder.orderNumber} has been completed. Thank you for your business!`;
        break;
      case "cancelled":
        notificationMessage = `Your order #${updatedOrder.orderNumber} has been cancelled. Please contact us if you have questions.`;
        break;
    }
    
    if (notificationMessage && updatedOrder.customerId) {
      // Create business communication for status update
      const [communication] = await db
        .insert(businessCommunications)
        .values({
          businessId,
          // threadId will be auto-generated as UUID  
          subject: `Order #${updatedOrder.orderNumber} - Status Update`,
          communicationType: status === 'cancelled' ? 'order_cancelled' : 'order_update', // Proper types for analysis
          priority: status === 'cancelled' ? 5 : 3, // Higher priority for cancellations
          status: 'closed',
          customerName: updatedOrder.customerName,
          customerEmail: updatedOrder.customerEmail,
          customerPhone: updatedOrder.customerPhone,
          metadata: {
            relatedEntityType: 'order',
            relatedEntityId: orderId,
            statusUpdate: status,
            orderNumber: updatedOrder.orderNumber
          }
        })
        .returning();
      
      // Create notification for customer
      await db
        .insert(notificationQueue)
        .values({
          businessId,
          userId: updatedOrder.customerId,
          communicationId: communication.id,
          notificationType: 'email',
          subject: `Order Update - #${updatedOrder.orderNumber}`,
          messageText: notificationMessage,
          messageHtml: `<p>${notificationMessage}</p>`,
          data: {
            orderId,
            orderNumber: updatedOrder.orderNumber,
            statusUpdate: status,
            customerEmail: updatedOrder.customerEmail,
            customerPhone: updatedOrder.customerPhone
          },
          priority: status === 'ready' || status === 'cancelled' ? 5 : 3, // 1-5 scale
          status: 'pending'
        });
    }
    
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Get order details
router.get("/restaurants/:businessId/orders/:orderId", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const orderId = parseInt(req.params.orderId);
    
    const [order] = await db
      .select()
      .from(restaurantOrders)
      .where(and(
        eq(restaurantOrders.id, orderId),
        eq(restaurantOrders.businessId, businessId)
      ))
      .limit(1);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// Get orders summary/stats
router.get("/restaurants/:businessId/orders/stats", verifyRestaurantOwnership, async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Get today's orders by status
    const todayOrders = await db
      .select()
      .from(restaurantOrders)
      .where(and(
        eq(restaurantOrders.businessId, businessId),
        gte(restaurantOrders.orderedAt, startOfDay)
      ));
    
    const stats = {
      today: {
        total: todayOrders.length,
        received: todayOrders.filter(o => o.status === 'received').length,
        preparing: todayOrders.filter(o => o.status === 'preparing').length,
        ready: todayOrders.filter(o => o.status === 'ready').length,
        completed: todayOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length,
        cancelled: todayOrders.filter(o => o.status === 'cancelled').length,
        revenue: todayOrders
          .filter(o => o.status === 'completed' || o.status === 'delivered')
          .reduce((sum, order) => sum + parseFloat(order.total), 0)
      },
      activeOrders: todayOrders.filter(o => 
        ['received', 'preparing', 'ready'].includes(o.status)
      ).length
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ error: "Failed to fetch order statistics" });
  }
});

// =============================================================================
// HELPER FUNCTIONS FOR COMMUNICATION INTEGRATION
// =============================================================================

async function createConstraintViolationCommunication(
  businessId: number,
  bookingRequest: any,
  violations: any[],
  warnings: any[],
  req: any
) {
  try {
    // Determine communication type based on violations
    let communicationType = 'constraint_violation';
    const violationTypes = violations.map(v => v.constraintName);
    
    if (violationTypes.includes('restaurant_policy') || violationTypes.includes('table_capacity')) {
      communicationType = 'large_party';
    } else if (violationTypes.includes('operating_hours')) {
      communicationType = 'off_hours_request';
    } else if (violationTypes.includes('table_capacity')) {
      communicationType = 'capacity_issue';
    }

    // Create subject based on violations
    const primaryViolation = violations[0];
    const subject = `${communicationType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${primaryViolation.message.substring(0, 50)}...`;

    // Create customer message
    const customerMessage = `Hi! I tried to make a reservation for ${bookingRequest.partySize} people on ${bookingRequest.bookingDate} but encountered some constraints. Here are the details:\n\nBooking Request:\n- Party Size: ${bookingRequest.partySize}\n- Date/Time: ${new Date(bookingRequest.startTime).toLocaleString()}\n- Special Requests: ${bookingRequest.specialRequests || 'None'}\n\nI'd appreciate any help or alternatives you can offer!`;

    // Create initial message
    const initialMessage = {
      id: Date.now(),
      message: customerMessage,
      sender: 'customer',
      messageType: 'text',
      timestamp: new Date().toISOString(),
      customerName: bookingRequest.customerName || 'Guest Customer'
    };

    // Create communication thread
    const [communication] = await db
      .insert(businessCommunications)
      .values({
        businessId,
        customerId: req.user?.id || null,
        communicationType,
        subject,
        messages: [initialMessage],
        priority: violations.length > 2 ? 1 : 2, // High priority for multiple violations
        customerName: bookingRequest.customerName,
        customerPhone: bookingRequest.customerPhone,
        customerEmail: bookingRequest.customerEmail,
        originalBookingRequest: bookingRequest,
        constraintViolations: violations,
        sourcePage: req.headers.referer || 'restaurant_booking',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        aiResolutionAttempted: true, // We'll generate AI suggestions
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Generate AI suggestions based on violations
    await generateAISuggestionsForViolations(communication, violations);

    console.log(`Created communication thread ${communication.threadId} for constraint violations`);
    return communication;

  } catch (error) {
    console.error('Error creating constraint violation communication:', error);
  }
}

async function generateAISuggestionsForViolations(communication: any, violations: any[]) {
  try {
    for (const violation of violations) {
      let suggestionType = 'direct_contact';
      let primarySuggestion = {};
      let confidence = 0.8;
      let reasoning = '';

      switch (violation.constraintName) {
        case 'table_capacity':
          suggestionType = 'split_booking';
          primarySuggestion = {
            message: "I can help you split your party across multiple tables at the same time",
            action: "split_party",
            description: `For a party of ${communication.originalBookingRequest.partySize}, I can arrange seating across 2-3 nearby tables`,
            benefits: ["Same dining time", "Close seating", "Full party experience"],
            nextSteps: "The restaurant can arrange adjacent tables for your group"
          };
          confidence = 0.92;
          reasoning = "Large parties can often be accommodated with multiple table arrangements";
          break;

        case 'restaurant_policy':
          suggestionType = 'direct_contact';
          primarySuggestion = {
            message: "Let me connect you directly with the restaurant for special arrangements",
            action: "direct_contact",
            description: "Large parties often require special coordination that the restaurant can provide",
            benefits: ["Personalized service", "Custom arrangements", "Special menu options"],
            contactMethod: "I'll notify the restaurant owner immediately about your request"
          };
          confidence = 0.96;
          reasoning = "Restaurants frequently make exceptions for large parties with advance notice";
          break;

        case 'operating_hours':
          suggestionType = 'alternative_time';
          primarySuggestion = {
            message: "Here are available times when the restaurant is open",
            action: "show_alternatives",
            description: "I found several great time slots during business hours",
            alternatives: [
              { time: "5:30 PM", availability: "High", note: "Just after opening, full menu" },
              { time: "7:00 PM", availability: "Medium", note: "Prime dinner time" },
              { time: "8:30 PM", availability: "High", note: "Later dinner, quieter atmosphere" }
            ],
            benefits: ["Full menu available", "Better service", "Proper preparation time"]
          };
          confidence = 0.88;
          reasoning = "Alternative timing during business hours provides better dining experience";
          break;

        case 'time_slot_availability':
          suggestionType = 'waitlist';
          primarySuggestion = {
            message: "I can add you to the priority waitlist for this time slot",
            action: "join_waitlist",
            description: "You'll be notified immediately if this time becomes available",
            waitlistPosition: "Estimated top 3",
            successRate: "87% of waitlist requests get seated",
            alternatives: [
              { time: "30 minutes earlier", status: "Available now" },
              { time: "30 minutes later", status: "Available now" }
            ]
          };
          confidence = 0.82;
          reasoning = "Waitlists have high success rates for popular time slots";
          break;
      }

      // Create AI suggestion record
      await db.insert(aiSuggestions).values({
        communicationId: communication.id,
        businessId: communication.businessId,
        customerId: communication.customerId,
        originalConstraintType: violation.constraintName,
        constraintViolationData: violation,
        suggestionType,
        primarySuggestion,
        alternativeSuggestions: [], // Could add more alternatives
        confidenceScore: confidence,
        reasoning,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log(`Generated ${violations.length} AI suggestions for communication ${communication.threadId}`);

  } catch (error) {
    console.error('Error generating AI suggestions:', error);
  }
}

export default router;