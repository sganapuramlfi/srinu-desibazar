import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, differenceInMinutes } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Clock,
  Package,
  CheckCircle,
  XCircle,
  RefreshCw,
  ShoppingCart,
  AlertTriangle,
  Phone,
  MapPin,
  Utensils,
  Timer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: string;
  modifications?: string[];
}

interface Order {
  id: number;
  businessId: number;
  businessName: string;
  orderNumber: string;
  orderType: "dine_in" | "takeout" | "delivery";
  customerName: string;
  customerPhone: string;
  orderItems: OrderItem[];
  subtotal: string;
  tax: string;
  deliveryFee: string;
  tip: string;
  total: string;
  status: "received" | "preparing" | "ready" | "delivered" | "completed" | "cancelled";
  orderedAt: string;
  estimatedReadyAt: string;
  readyAt?: string;
  completedAt?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode: string;
  };
  deliveryInstructions?: string;
  cancellationPolicy?: {
    timeLimit: number; // minutes
    type: 'auto' | 'request'; // auto-cancel vs request approval
  };
}

interface CancellationPolicy {
  timeLimit: number;
  type: 'auto' | 'request';
  message: string;
}

export default function OrderHistoryPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);

  // Fetch user's orders
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders/my-orders'],
    enabled: !!user,
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason, orderBusinessId }: { 
      orderId: number; 
      reason: string; 
      orderBusinessId: number;
    }) => {
      const response = await fetch(`/api/businesses/${orderBusinessId}/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason, requestedBy: 'customer' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel order');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/my-orders'] });
      
      if (data.immediate) {
        toast({
          title: "✅ Order Cancelled",
          description: "Your order has been cancelled immediately and you will receive a full refund.",
        });
      } else {
        toast({
          title: "📝 Cancellation Requested",
          description: "Your cancellation request has been sent to the restaurant. You'll be notified of their decision.",
        });
      }
      
      setSelectedOrder(null);
      setCancellationReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (order: Order) => {
      // Add all items from the order to cart
      const cartItems = order.orderItems.map(item => ({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: item.quantity,
        modifications: item.modifications || []
      }));

      // This would integrate with your existing cart system
      const response = await fetch(`/api/businesses/${order.businessId}/cart/bulk-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: cartItems }),
      });

      if (!response.ok) {
        throw new Error('Failed to add items to cart');
      }

      return response.json();
    },
    onSuccess: (data, order) => {
      toast({
        title: "🛒 Items Added to Cart",
        description: `${order.orderItems.length} items from ${order.businessName} have been added to your cart.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reorder Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received': return <Clock className="h-3 w-3" />;
      case 'preparing': return <Utensils className="h-3 w-3" />;
      case 'ready': return <Package className="h-3 w-3" />;
      case 'delivered': return <CheckCircle className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const canCancelOrder = (order: Order): { canCancel: boolean; policy: CancellationPolicy } => {
    const orderTime = parseISO(order.orderedAt);
    const minutesSinceOrder = differenceInMinutes(new Date(), orderTime);
    
    // Default policy if not specified
    const defaultPolicy = { timeLimit: 15, type: 'auto' as const };
    const policy = order.cancellationPolicy || defaultPolicy;
    
    const isActive = ['received', 'preparing'].includes(order.status);
    const withinTimeLimit = minutesSinceOrder <= policy.timeLimit;
    
    let message = "";
    let canCancel = false;
    
    if (!isActive) {
      message = "This order cannot be cancelled as it's already being processed or completed.";
    } else if (withinTimeLimit && policy.type === 'auto') {
      message = `You can cancel this order immediately (within ${policy.timeLimit} minutes of ordering).`;
      canCancel = true;
    } else if (policy.type === 'request' || !withinTimeLimit) {
      message = `Cancellation requests after ${policy.timeLimit} minutes require restaurant approval.`;
      canCancel = true;
    }
    
    return {
      canCancel,
      policy: { ...policy, message }
    };
  };

  const handleCancelOrder = (orderId: number) => {
    if (!selectedOrder || !cancellationReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for cancellation.",
        variant: "destructive"
      });
      return;
    }

    cancelOrderMutation.mutate({
      orderId,
      reason: cancellationReason.trim(),
      orderBusinessId: selectedOrder.businessId,
    });
  };

  const handleReorder = (order: Order) => {
    reorderMutation.mutate(order);
  };

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading your orders...</span>
      </div>
    );
  }

  const activeOrders = orders.filter(order => 
    ['received', 'preparing', 'ready', 'delivered'].includes(order.status)
  );
  const completedOrders = orders.filter(order => order.status === 'completed');
  const cancelledOrders = orders.filter(order => order.status === 'cancelled');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order History</h1>
        <div className="text-sm text-muted-foreground">
          {orders.length} total orders
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedOrders.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelledOrders.length})
          </TabsTrigger>
        </TabsList>

        {['active', 'completed', 'cancelled'].map((tab) => {
          const tabOrders = tab === 'active' ? activeOrders : 
                          tab === 'completed' ? completedOrders : cancelledOrders;
          
          return (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {tabOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No {tab} orders found.
                  </CardContent>
                </Card>
              ) : (
                tabOrders.map((order) => {
                  const { canCancel, policy } = canCancelOrder(order);
                  
                  return (
                    <Card key={order.id}>
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl">{order.businessName}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Order #{order.orderNumber} • {order.orderType.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(order.orderedAt), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <Badge className={`flex items-center gap-1 ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          {/* Order Items */}
                          <div>
                            <h4 className="font-medium mb-2">Items ({order.orderItems.length})</h4>
                            <div className="space-y-1">
                              {order.orderItems.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span>{item.quantity}x {item.name}</span>
                                  <span>{formatCurrency(item.price)}</span>
                                </div>
                              ))}
                              {order.orderItems.length > 3 && (
                                <p className="text-sm text-muted-foreground">
                                  +{order.orderItems.length - 3} more items
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Order Total */}
                          <div className="flex justify-between font-medium">
                            <span>Total</span>
                            <span>{formatCurrency(order.total)}</span>
                          </div>

                          {/* Delivery Info */}
                          {order.orderType === 'delivery' && order.deliveryAddress && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 mt-0.5" />
                              <span>
                                {order.deliveryAddress.street}, {order.deliveryAddress.city} {order.deliveryAddress.postalCode}
                              </span>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Order #{order.orderNumber}</DialogTitle>
                                  <DialogDescription>
                                    {order.businessName} • {format(parseISO(order.orderedAt), 'MMM d, yyyy h:mm a')}
                                  </DialogDescription>
                                </DialogHeader>
                                {/* Order details content would go here */}
                                <div className="space-y-4">
                                  {/* Complete order breakdown */}
                                  <div>
                                    <h4 className="font-medium mb-2">All Items</h4>
                                    {order.orderItems.map((item, idx) => (
                                      <div key={idx} className="flex justify-between py-1">
                                        <div>
                                          <span>{item.quantity}x {item.name}</span>
                                          {item.modifications && item.modifications.length > 0 && (
                                            <p className="text-xs text-muted-foreground ml-4">
                                              {item.modifications.join(', ')}
                                            </p>
                                          )}
                                        </div>
                                        <span>{formatCurrency(item.price)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <div className="border-t pt-2 space-y-1">
                                    <div className="flex justify-between">
                                      <span>Subtotal</span>
                                      <span>{formatCurrency(order.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Tax</span>
                                      <span>{formatCurrency(order.tax)}</span>
                                    </div>
                                    {parseFloat(order.deliveryFee) > 0 && (
                                      <div className="flex justify-between">
                                        <span>Delivery Fee</span>
                                        <span>{formatCurrency(order.deliveryFee)}</span>
                                      </div>
                                    )}
                                    {parseFloat(order.tip) > 0 && (
                                      <div className="flex justify-between">
                                        <span>Tip</span>
                                        <span>{formatCurrency(order.tip)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-medium border-t pt-1">
                                      <span>Total</span>
                                      <span>{formatCurrency(order.total)}</span>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* Reorder Button */}
                            {(order.status === 'completed') && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleReorder(order)}
                                disabled={reorderMutation.isPending}
                              >
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Reorder
                              </Button>
                            )}

                            {/* Cancel Button */}
                            {canCancel && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => setSelectedOrder(order)}
                                  >
                                    Cancel Order
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Cancel Order #{order.orderNumber}?</DialogTitle>
                                    <DialogDescription>
                                      <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                                          <span className="text-sm">{policy.message}</span>
                                        </div>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="cancellation-reason">Reason for cancellation</Label>
                                      <Textarea
                                        id="cancellation-reason"
                                        placeholder="Please let us know why you're cancelling..."
                                        value={cancellationReason}
                                        onChange={(e) => setCancellationReason(e.target.value)}
                                        className="mt-1"
                                      />
                                    </div>
                                    
                                    <div className="flex gap-3 justify-end">
                                      <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                                        Keep Order
                                      </Button>
                                      <Button 
                                        variant="destructive"
                                        onClick={() => handleCancelOrder(order.id)}
                                        disabled={cancelOrderMutation.isPending || !cancellationReason.trim()}
                                      >
                                        {cancelOrderMutation.isPending ? "Cancelling..." : "Cancel Order"}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}