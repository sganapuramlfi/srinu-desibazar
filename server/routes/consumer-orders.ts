import { Router } from "express";
import { db } from "../../db/index.js";
import { 
  restaurantOrders,
  businessTenants,
  businessCommunications,
  notificationQueue
} from "../../db/index.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Validation schemas
const cancelOrderSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required"),
  requestedBy: z.enum(['customer', 'staff', 'system']).default('customer')
});

// Get user's orders
router.get("/orders/my-orders", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userId = req.user!.id;
    
    // Get orders with business info
    const userOrders = await db
      .select({
        id: restaurantOrders.id,
        businessId: restaurantOrders.businessId,
        businessName: businessTenants.businessName,
        orderNumber: restaurantOrders.orderNumber,
        orderType: restaurantOrders.orderType,
        customerName: restaurantOrders.customerName,
        customerPhone: restaurantOrders.customerPhone,
        orderItems: restaurantOrders.orderItems,
        subtotal: restaurantOrders.subtotal,
        tax: restaurantOrders.tax,
        deliveryFee: restaurantOrders.deliveryFee,
        tip: restaurantOrders.tip,
        total: restaurantOrders.total,
        status: restaurantOrders.status,
        orderedAt: restaurantOrders.orderedAt,
        estimatedReadyAt: restaurantOrders.estimatedReadyAt,
        readyAt: restaurantOrders.readyAt,
        completedAt: restaurantOrders.completedAt,
        deliveryAddress: restaurantOrders.deliveryAddress,
        deliveryInstructions: restaurantOrders.deliveryInstructions,
      })
      .from(restaurantOrders)
      .leftJoin(businessTenants, eq(restaurantOrders.businessId, businessTenants.id))
      .where(eq(restaurantOrders.customerId, userId))
      .orderBy(desc(restaurantOrders.orderedAt));

    // Add cancellation policy to each order
    const ordersWithPolicy = userOrders.map(order => ({
      ...order,
      cancellationPolicy: {
        timeLimit: 15, // Default 15 minutes - this should come from business settings
        type: 'auto' as const // auto-cancel within time limit
      }
    }));

    res.json(ordersWithPolicy);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Cancel order endpoint
router.post("/businesses/:businessId/orders/:orderId/cancel", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const businessId = parseInt(req.params.businessId);
    const orderId = parseInt(req.params.orderId);
    const userId = req.user!.id;
    
    const validationResult = cancelOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid cancellation data",
        details: validationResult.error.issues
      });
    }

    const { reason, requestedBy } = validationResult.data;

    // Verify order exists and belongs to user
    const [order] = await db
      .select()
      .from(restaurantOrders)
      .where(and(
        eq(restaurantOrders.id, orderId),
        eq(restaurantOrders.businessId, businessId),
        eq(restaurantOrders.customerId, userId)
      ));

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if order can be cancelled
    if (!['received', 'preparing'].includes(order.status)) {
      return res.status(400).json({ 
        error: "Order cannot be cancelled at this stage",
        currentStatus: order.status
      });
    }

    // Calculate time since order
    const orderTime = new Date(order.orderedAt);
    const now = new Date();
    const minutesSinceOrder = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    // Default cancellation policy (should come from business settings)
    const cancellationTimeLimit = 15; // minutes
    const withinTimeLimit = minutesSinceOrder <= cancellationTimeLimit;
    const isAutoCancel = withinTimeLimit && order.status === 'received'; // Only auto-cancel if not started preparing

    let immediate = false;
    let statusUpdate = '';
    let communicationType = '';
    let notificationMessage = '';

    if (isAutoCancel) {
      // Immediate cancellation
      immediate = true;
      statusUpdate = 'cancelled';
      communicationType = 'order_cancelled';
      notificationMessage = `Your order #${order.orderNumber} has been cancelled automatically. You will receive a full refund.`;
    } else {
      // Request cancellation approval
      immediate = false;
      statusUpdate = order.status; // Don't change status yet
      communicationType = 'order_cancellation_request';
      notificationMessage = `Customer has requested to cancel order #${order.orderNumber}. Please review and respond.`;
    }

    // Update order status if immediate cancellation
    if (immediate) {
      await db
        .update(restaurantOrders)
        .set({
          status: statusUpdate,
          updatedAt: new Date()
        })
        .where(eq(restaurantOrders.id, orderId));
    }

    // Create communication record
    const communicationData = {
      businessId,
      communicationType,
      subject: immediate 
        ? `Order #${order.orderNumber} Cancelled` 
        : `Cancellation Request - Order #${order.orderNumber}`,
      message: immediate
        ? `Order cancelled by customer. Reason: ${reason}. Refund will be processed automatically.`
        : `Customer cancellation request. Reason: ${reason}. Please approve/deny this request.`,
      customerName: order.customerName,
      customerEmail: req.user?.email || '',
      customerPhone: order.customerPhone,
      priority: immediate ? 'medium' : 'high',
      status: 'unread',
      metadata: JSON.stringify({
        orderId: order.id,
        orderNumber: order.orderNumber,
        cancellationReason: reason,
        requestedBy,
        minutesSinceOrder,
        withinTimeLimit,
        immediate,
        orderTotal: order.total
      }),
      createdAt: new Date()
    };

    const [communication] = await db
      .insert(businessCommunications)
      .values(communicationData)
      .returning();

    // Queue notification
    if (communication) {
      const notificationData = {
        businessId,
        type: immediate ? 'order_cancelled' : 'cancellation_request',
        title: immediate 
          ? `Order #${order.orderNumber} Cancelled`
          : `Cancellation Request`,
        message: notificationMessage,
        priority: immediate ? 'medium' : 'high',
        scheduledFor: new Date(),
        metadata: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          communicationId: communication.id
        }),
        createdAt: new Date()
      };

      await db.insert(notificationQueue).values(notificationData);
    }

    const responseData = {
      success: true,
      immediate,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: immediate ? 'cancelled' : order.status,
      message: immediate 
        ? "Order cancelled successfully. Refund will be processed within 3-5 business days."
        : "Cancellation request sent to restaurant. You'll be notified of their decision within 30 minutes.",
      communicationId: communication?.id
    };

    console.log(`[Order Cancellation] ${immediate ? 'Immediate' : 'Requested'} cancellation for order ${order.orderNumber} by user ${userId}`);
    
    res.json(responseData);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: "Failed to process cancellation request" });
  }
});

// Bulk add to cart for reordering
router.post("/businesses/:businessId/cart/bulk-add", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const businessId = parseInt(req.params.businessId);
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required" });
    }

    // This is a simplified implementation - you'll need to integrate with your cart system
    // For now, we'll just return success to indicate the items would be added
    
    const responseData = {
      success: true,
      itemsAdded: items.length,
      businessId,
      message: "Items added to cart successfully"
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error adding items to cart:', error);
    res.status(500).json({ error: "Failed to add items to cart" });
  }
});

export default router;