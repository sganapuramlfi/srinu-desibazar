import { Router } from "express";
import { db } from "../../db/index.js";
import { 
  platformUsers,
  businessTenants,
  bookings,
  businessReviews,
  businessCommunications,
  restaurantMenuItems,
  restaurantMenuCategories,
  restaurantOrders,
  notificationQueue
} from "../../db/index.js";
import { eq, and, desc, or } from "drizzle-orm";
import { requireAuth } from "../middleware/businessAccess.js";

const router = Router();

// =============================================================================
// CONSUMER BOOKINGS
// =============================================================================

// Get consumer's booking history across all businesses
router.get("/bookings", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    
    // Get all bookings where customer email matches user email
    const userBookings = await db
      .select({
        booking: bookings,
        business: {
          id: businessTenants.id,
          name: businessTenants.name,
          slug: businessTenants.slug,
          industryType: businessTenants.industryType,
          logoUrl: businessTenants.logoUrl
        }
      })
      .from(bookings)
      .innerJoin(businessTenants, eq(businessTenants.id, bookings.businessId))
      .where(eq(bookings.customerEmail, (req.user as any).email))
      .orderBy(desc(bookings.createdAt));

    res.json(userBookings);
  } catch (error) {
    console.error('Error fetching consumer bookings:', error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// =============================================================================
// CONSUMER MESSAGES
// =============================================================================

// Get consumer's messages with businesses
router.get("/messages", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    
    // Get all business communications for this consumer
    const userMessages = await db
      .select({
        id: businessCommunications.id,
        businessId: businessCommunications.businessId,
        subject: businessCommunications.subject,
        messages: businessCommunications.messages,
        status: businessCommunications.status,
        priority: businessCommunications.priority,
        createdAt: businessCommunications.createdAt,
        updatedAt: businessCommunications.updatedAt,
        business: {
          id: businessTenants.id,
          name: businessTenants.name,
          slug: businessTenants.slug,
          logoUrl: businessTenants.logoUrl
        }
      })
      .from(businessCommunications)
      .innerJoin(businessTenants, eq(businessTenants.id, businessCommunications.businessId))
      .where(or(
        eq(businessCommunications.customerId, userId),
        eq(businessCommunications.customerEmail, (req.user as any).email)
      ))
      .orderBy(desc(businessCommunications.updatedAt));

    res.json(userMessages);
  } catch (error) {
    console.error('Error fetching consumer messages:', error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send message to business
router.post("/messages", requireAuth, async (req, res) => {
  try {
    const { businessId, subject, message } = req.body;
    const userId = (req.user as any).id;
    const userEmail = (req.user as any).email;
    
    if (!businessId || !message) {
      return res.status(400).json({ error: "Business ID and message are required" });
    }

    // Create initial message
    const initialMessage = {
      id: Date.now(),
      message,
      sender: 'customer',
      messageType: 'text',
      timestamp: new Date().toISOString(),
      customerName: (req.user as any).fullName || 'Customer'
    };

    // Create communication thread
    const [communication] = await db
      .insert(businessCommunications)
      .values({
        businessId,
        customerId: userId,
        communicationType: 'general_inquiry',
        subject: subject || `Message from ${(req.user as any).fullName || 'Customer'}`,
        messages: [initialMessage],
        priority: 2,
        customerName: (req.user as any).fullName,
        customerPhone: (req.user as any).phone,
        customerEmail: userEmail,
        sourcePage: 'consumer_dashboard',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.json(communication);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// =============================================================================
// CONSUMER FAVORITES
// =============================================================================

// Get consumer's favorite businesses
router.get("/favorites", requireAuth, async (req, res) => {
  try {
    // For now, return empty array as we need to implement favorites table
    // TODO: Create customer_favorites table and implement favorites functionality
    res.json([]);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

// Toggle favorite business
router.post("/favorites/:businessId", requireAuth, async (req, res) => {
  try {
    const { businessId } = req.params;
    // TODO: Implement toggle favorite functionality
    res.json({ message: "Favorites feature coming soon" });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: "Failed to update favorites" });
  }
});

// =============================================================================
// BUSINESS DISCOVERY
// =============================================================================

// Get businesses by industry for consumer browsing
router.get("/businesses", async (req, res) => {
  try {
    const { industry, location, search } = req.query;
    
    let query = db
      .select({
        id: businessTenants.id,
        name: businessTenants.name,
        slug: businessTenants.slug,
        industryType: businessTenants.industryType,
        description: businessTenants.description,
        logoUrl: businessTenants.logoUrl,
        contactInfo: businessTenants.contactInfo,
        operatingHours: businessTenants.operatingHours,
        amenities: businessTenants.amenities,
        city: businessTenants.city,
        state: businessTenants.state,
        isVerified: businessTenants.isVerified
      })
      .from(businessTenants)
      .where(eq(businessTenants.status, 'active'));
    
    // Add industry filter
    if (industry && industry !== 'all') {
      query = query.where(and(
        eq(businessTenants.status, 'active'),
        eq(businessTenants.industryType, industry as string)
      ));
    }
    
    const businesses = await query.limit(50);
    
    res.json({
      success: true,
      businesses,
      total: businesses.length,
      filters: {
        industry: industry || 'all',
        location: location || 'all',
        search: search || ''
      }
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: "Failed to fetch businesses" });
  }
});

// Get business menu (for restaurants)
router.get("/businesses/:businessId/menu", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    
    // Get business info
    const [business] = await db
      .select()
      .from(businessTenants)
      .where(and(
        eq(businessTenants.id, businessId),
        eq(businessTenants.status, 'active')
      ))
      .limit(1);
      
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }
    
    if (business.industryType !== 'restaurant') {
      return res.status(400).json({ error: "Menu only available for restaurants" });
    }
    
    // Get menu categories and items
    const categories = await db
      .select()
      .from(restaurantMenuCategories)
      .where(and(
        eq(restaurantMenuCategories.businessId, businessId),
        eq(restaurantMenuCategories.isActive, true)
      ))
      .orderBy(restaurantMenuCategories.displayOrder);
    
    const items = await db
      .select()
      .from(restaurantMenuItems)
      .where(and(
        eq(restaurantMenuItems.businessId, businessId),
        eq(restaurantMenuItems.inStock, true)
      ))
      .orderBy(restaurantMenuItems.displayOrder);
    
    // Group items by category
    const menuData = categories.map(category => ({
      ...category,
      items: items.filter(item => item.categoryId === category.id)
    }));
    
    res.json({
      business: {
        id: business.id,
        name: business.name,
        description: business.description,
        logoUrl: business.logoUrl,
        operatingHours: business.operatingHours
      },
      menu: menuData
    });
  } catch (error) {
    console.error('Error fetching business menu:', error);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

// =============================================================================
// RESTAURANT ORDERING (Consumer placing orders)
// =============================================================================

// Place restaurant order
router.post("/businesses/:businessId/orders", requireAuth, async (req, res) => {
  try {
    console.log('[Order] Starting order placement...');
    console.log('[Order] User authenticated:', req.isAuthenticated());
    console.log('[Order] User data:', req.user);
    
    const businessId = parseInt(req.params.businessId);
    const userId = (req.user as any).id;
    const userEmail = (req.user as any).email;
    const { orderItems, orderType, deliveryAddress, specialInstructions } = req.body;
    
    console.log('[Order] Order details:', {
      businessId,
      userId,
      userEmail,
      itemCount: orderItems?.length,
      orderType
    });
    
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({ error: "Order items are required" });
    }
    
    // Calculate totals
    let subtotal = 0;
    for (const item of orderItems) {
      subtotal += parseFloat(item.price) * item.quantity;
    }
    
    const tax = subtotal * 0.10; // 10% tax
    const deliveryFee = orderType === 'delivery' ? 5.00 : 0;
    const total = subtotal + tax + deliveryFee;
    
    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    console.log('[Order] Generated order number:', orderNumber);
    
    // Create order
    console.log('[Order] Creating order in database...');
    const [order] = await db
      .insert(restaurantOrders)
      .values({
        businessId,
        orderNumber,
        orderType: orderType || 'dine_in',
        customerName: (req.user as any).fullName || userEmail.split('@')[0],
        customerPhone: (req.user as any).phone || '',
        customerEmail: userEmail,
        customerId: userId,
        orderItems: JSON.stringify(orderItems),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        total: total.toFixed(2),
        deliveryAddress: deliveryAddress || '',
        deliveryInstructions: specialInstructions || '',
        status: "received",
        orderedAt: new Date()
      })
      .returning();
    
    console.log('[Order] Order created successfully:', order.id);
    
    // Create business communication alert for new order
    console.log('[Order] Creating business communication alert...');
    const [communication] = await db
      .insert(businessCommunications)
      .values({
        businessId,
        // threadId will be auto-generated as UUID
        subject: `New Order #${orderNumber}`,
        communicationType: 'order_placed', // Proper type for intelligent analysis
        priority: 4, // High priority for new orders
        status: 'open',
        customerName: (req.user as any).fullName || userEmail,
        customerEmail: userEmail,
        customerPhone: (req.user as any).phone,
        metadata: {
          relatedEntityType: 'order',
          relatedEntityId: order.id,
          orderType,
          orderTotal: total.toFixed(2),
          itemCount: orderItems.length,
          orderNumber
        }
      })
      .returning();
    
    console.log('[Order] Communication alert created:', communication.id);
    
    // Create notification for business owner
    console.log('[Order] Creating notification for business owner...');
    await db
      .insert(notificationQueue)
      .values({
        businessId,
        communicationId: communication.id,
        notificationType: 'email',
        subject: `New Order #${orderNumber} - $${total.toFixed(2)}`,
        messageText: `You have received a new ${orderType || 'dine-in'} order from ${(req.user as any).fullName || userEmail}. Order total: $${total.toFixed(2)}`,
        messageHtml: `<p>You have received a new <strong>${orderType || 'dine-in'}</strong> order from <strong>${(req.user as any).fullName || userEmail}</strong>.</p><p>Order total: <strong>$${total.toFixed(2)}</strong></p>`,
        data: {
          orderId: order.id,
          orderNumber,
          orderType,
          customerName: (req.user as any).fullName || userEmail,
          customerEmail: userEmail,
          orderTotal: total.toFixed(2)
        },
        priority: 5, // high priority (1-5 scale, 5 being highest)
        status: 'pending'
      });
    
    console.log('[Order] Notification created successfully');
    console.log('[Order] Order placement completed successfully');
    
    res.json({
      success: true,
      order,
      message: "Order placed successfully"
    });
  } catch (error: any) {
    console.error('Error placing order:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      table: error.table,
      column: error.column
    });
    
    // Send more detailed error to help debug
    res.status(500).json({ 
      error: "Failed to place order",
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        detail: error.detail
      } : undefined
    });
  }
});

// Get consumer's orders
router.get("/orders", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    
    const orders = await db
      .select({
        order: restaurantOrders,
        business: {
          id: businessTenants.id,
          name: businessTenants.name,
          slug: businessTenants.slug,
          logoUrl: businessTenants.logoUrl
        }
      })
      .from(restaurantOrders)
      .innerJoin(businessTenants, eq(businessTenants.id, restaurantOrders.businessId))
      .where(eq(restaurantOrders.customerId, userId))
      .orderBy(desc(restaurantOrders.orderedAt));
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching consumer orders:', error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default router;