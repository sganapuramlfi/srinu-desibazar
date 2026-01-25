import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Clock, 
  CheckCircle, 
  Package, 
  Truck, 
  Phone,
  User,
  DollarSign,
  ChefHat,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RestaurantOrder {
  id: number;
  businessId: number;
  orderNumber: string;
  orderType: "dine_in" | "takeout" | "delivery";
  customerName: string;
  customerPhone: string;
  customerId?: number;
  orderItems: Array<{
    item_id: number;
    name: string;
    quantity: number;
    price: string;
    modifications?: string[];
  }>;
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
}

interface MenuItem {
  id: number;
  name: string;
  price: string;
  preparationTime?: number;
  category?: {
    id: number;
    name: string;
  };
}

interface OrderStats {
  today: {
    total: number;
    received: number;
    preparing: number;
    ready: number;
    completed: number;
    cancelled: number;
    revenue: number;
  };
  activeOrders: number;
}

interface RestaurantOrdersTabProps {
  businessId: number;
}

const statusConfig = {
  received: { label: "New", icon: AlertCircle, color: "bg-blue-500", variant: "default" as const },
  preparing: { label: "Preparing", icon: ChefHat, color: "bg-orange-500", variant: "secondary" as const },
  ready: { label: "Ready", icon: CheckCircle, color: "bg-green-500", variant: "outline" as const },
  delivered: { label: "Out for Delivery", icon: Truck, color: "bg-purple-500", variant: "secondary" as const },
  completed: { label: "Completed", icon: Package, color: "bg-gray-500", variant: "outline" as const },
  cancelled: { label: "Cancelled", icon: AlertCircle, color: "bg-red-500", variant: "destructive" as const },
};

export function RestaurantOrdersTab({ businessId }: RestaurantOrdersTabProps) {
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch orders
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<RestaurantOrder[]>({
    queryKey: [`/api/restaurants/${businessId}/orders`, activeTab, selectedDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        if (activeTab === "active") {
          // Active orders: received, preparing, ready
          params.append('status', 'received,preparing,ready');
        } else {
          params.append('status', activeTab);
        }
      }
      if (selectedDate) {
        params.append('date', selectedDate);
      }
      params.append('limit', '50');
      
      const response = await fetch(`/api/restaurants/${businessId}/orders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    enabled: !!businessId,
    refetchInterval: 30000, // Refresh every 30 seconds for active orders
  });

  // Fetch order statistics
  const { data: orderStats } = useQuery<OrderStats>({
    queryKey: [`/api/restaurants/${businessId}/orders/stats`],
    enabled: !!businessId,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch menu items for order creation
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: [`/api/restaurants/${businessId}/menu/items`],
    enabled: !!businessId,
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch(`/api/restaurants/${businessId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error('Failed to create order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${businessId}/orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${businessId}/orders/stats`] });
      setIsCreateOrderOpen(false);
      toast({ title: "Success", description: "Order created successfully" });
    },
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await fetch(`/api/restaurants/${businessId}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update order status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${businessId}/orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${businessId}/orders/stats`] });
      toast({ title: "Success", description: "Order status updated" });
    },
  });

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig]?.color || "bg-gray-500";
  };

  const handleStatusUpdate = (orderId: number, newStatus: string) => {
    updateOrderStatusMutation.mutate({ orderId, status: newStatus });
  };

  const renderOrderActions = (order: RestaurantOrder) => {
    const actions = [];
    
    switch (order.status) {
      case "received":
        actions.push(
          <Button
            key="preparing"
            size="sm"
            onClick={() => handleStatusUpdate(order.id, "preparing")}
            className="bg-orange-500 hover:bg-orange-600"
          >
            Start Preparing
          </Button>
        );
        break;
      case "preparing":
        actions.push(
          <Button
            key="ready"
            size="sm"
            onClick={() => handleStatusUpdate(order.id, "ready")}
            className="bg-green-500 hover:bg-green-600"
          >
            Mark Ready
          </Button>
        );
        break;
      case "ready":
        if (order.orderType === "delivery") {
          actions.push(
            <Button
              key="delivered"
              size="sm"
              onClick={() => handleStatusUpdate(order.id, "delivered")}
              className="bg-purple-500 hover:bg-purple-600"
            >
              Out for Delivery
            </Button>
          );
        } else {
          actions.push(
            <Button
              key="completed"
              size="sm"
              onClick={() => handleStatusUpdate(order.id, "completed")}
              className="bg-gray-500 hover:bg-gray-600"
            >
              Complete Order
            </Button>
          );
        }
        break;
      case "delivered":
        actions.push(
          <Button
            key="completed"
            size="sm"
            onClick={() => handleStatusUpdate(order.id, "completed")}
            className="bg-gray-500 hover:bg-gray-600"
          >
            Mark Completed
          </Button>
        );
        break;
    }

    if (order.status !== "completed" && order.status !== "cancelled") {
      actions.push(
        <Button
          key="cancel"
          variant="outline"
          size="sm"
          onClick={() => handleStatusUpdate(order.id, "cancelled")}
          className="text-red-600 border-red-600 hover:bg-red-50"
        >
          Cancel
        </Button>
      );
    }

    return <div className="flex gap-2">{actions}</div>;
  };

  return (
    <div className="space-y-6">
      {/* Order Statistics Dashboard */}
      {orderStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Orders</p>
                  <p className="text-2xl font-bold">{orderStats.activeOrders}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Orders</p>
                  <p className="text-2xl font-bold">{orderStats.today.total}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
                  <p className="text-2xl font-bold">${orderStats.today.revenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{orderStats.today.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Management
              </CardTitle>
              <CardDescription>Manage and track your restaurant orders</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Take Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Take New Order</DialogTitle>
                    <DialogDescription>Create a new order for walk-in or phone customers</DialogDescription>
                  </DialogHeader>
                  <OrderCreationForm
                    businessId={businessId}
                    menuItems={menuItems}
                    onSubmit={(orderData) => createOrderMutation.mutate(orderData)}
                    isLoading={createOrderMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="active">Active ({orderStats?.activeOrders || 0})</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              <TabsTrigger value="all">All Orders</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{order.customerName}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {order.customerPhone}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {order.orderItems.map((item, index) => (
                            <div key={index} className="text-sm">
                              {item.quantity}x {item.name}
                              {item.modifications && item.modifications.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {item.modifications.join(", ")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {order.orderType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={statusConfig[order.status]?.variant || "default"}
                          className={`${getStatusColor(order.status)} text-white`}
                        >
                          {statusConfig[order.status]?.label || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Ordered: {formatTime(order.orderedAt)}</div>
                          {order.estimatedReadyAt && (
                            <div className="text-muted-foreground">
                              Ready: {formatTime(order.estimatedReadyAt)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {renderOrderActions(order)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Order Creation Form Component
interface OrderCreationFormProps {
  businessId: number;
  menuItems: MenuItem[];
  onSubmit: (orderData: any) => void;
  isLoading: boolean;
}

function OrderCreationForm({ businessId, menuItems, onSubmit, isLoading }: OrderCreationFormProps) {
  const [selectedItems, setSelectedItems] = useState<Array<{id: number, quantity: number, modifications: string}>>([]);
  const [orderType, setOrderType] = useState<string>("dine_in");

  const addItem = (itemId: number) => {
    const existingItem = selectedItems.find(item => item.id === itemId);
    if (existingItem) {
      setSelectedItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setSelectedItems(prev => [...prev, { id: itemId, quantity: 1, modifications: "" }]);
    }
  };

  const removeItem = (itemId: number) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
    } else {
      setSelectedItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, selectedItem) => {
      const menuItem = menuItems.find(item => item.id === selectedItem.id);
      if (menuItem) {
        return total + (parseFloat(menuItem.price) * selectedItem.quantity);
      }
      return total;
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const orderItems = selectedItems.map(selectedItem => {
      const menuItem = menuItems.find(item => item.id === selectedItem.id);
      return {
        item_id: selectedItem.id,
        name: menuItem?.name || "",
        quantity: selectedItem.quantity,
        price: menuItem?.price || "0",
        modifications: selectedItem.modifications ? selectedItem.modifications.split(",").map(m => m.trim()) : []
      };
    });

    const subtotal = calculateTotal();
    const tax = subtotal * 0.1; // 10% tax
    const deliveryFee = orderType === "delivery" ? 5.00 : 0;
    const total = subtotal + tax + deliveryFee;

    const orderData = {
      orderType,
      customerName: formData.get('customerName') as string,
      customerPhone: formData.get('customerPhone') as string,
      orderItems,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      tip: "0.00",
      total: total.toFixed(2),
      estimatedPrepTime: Math.max(...orderItems.map(item => {
        const menuItem = menuItems.find(mi => mi.id === item.item_id);
        return menuItem?.preparationTime || 20;
      })),
      deliveryAddress: orderType === "delivery" ? {
        street: formData.get('deliveryAddress') as string,
        city: formData.get('city') as string,
        postalCode: formData.get('postalCode') as string,
      } : null,
      deliveryInstructions: formData.get('deliveryInstructions') as string || null,
    };

    onSubmit(orderData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customerName">Customer Name</Label>
          <Input id="customerName" name="customerName" required />
        </div>
        <div>
          <Label htmlFor="customerPhone">Phone Number</Label>
          <Input id="customerPhone" name="customerPhone" type="tel" required />
        </div>
      </div>

      {/* Order Type */}
      <div>
        <Label htmlFor="orderType">Order Type</Label>
        <Select value={orderType} onValueChange={setOrderType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dine_in">Dine In</SelectItem>
            <SelectItem value="takeout">Takeout</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Delivery Address (if delivery) */}
      {orderType === "delivery" && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="deliveryAddress">Delivery Address</Label>
            <Input id="deliveryAddress" name="deliveryAddress" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required />
            </div>
            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" name="postalCode" required />
            </div>
          </div>
          <div>
            <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
            <Textarea id="deliveryInstructions" name="deliveryInstructions" />
          </div>
        </div>
      )}

      {/* Menu Items Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Items</h3>
        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border rounded-md p-2">
          {menuItems.map(item => (
            <div key={item.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <div>
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground ml-2">${item.price}</span>
              </div>
              <Button type="button" size="sm" onClick={() => addItem(item.id)}>
                Add
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Order Summary</h3>
          <div className="space-y-2">
            {selectedItems.map(selectedItem => {
              const menuItem = menuItems.find(item => item.id === selectedItem.id);
              return (
                <div key={selectedItem.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{menuItem?.name}</span>
                    <span className="text-muted-foreground ml-2">
                      ${menuItem?.price} each
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={() => updateQuantity(selectedItem.id, selectedItem.quantity - 1)}
                    >
                      -
                    </Button>
                    <span className="px-2">{selectedItem.quantity}</span>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={() => updateQuantity(selectedItem.id, selectedItem.quantity + 1)}
                    >
                      +
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => removeItem(selectedItem.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
            
            <div className="pt-2 border-t">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total: ${calculateTotal().toFixed(2)}</span>
                {orderType === "delivery" && <span className="text-sm text-muted-foreground">+ $5.00 delivery</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={isLoading || selectedItems.length === 0}>
          {isLoading ? "Creating Order..." : "Create Order"}
        </Button>
      </DialogFooter>
    </form>
  );
}