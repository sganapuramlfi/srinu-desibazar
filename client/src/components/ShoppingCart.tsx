import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  CreditCard,
  Clock,
  MapPin,
  Truck
} from 'lucide-react';

export const CartButton: React.FC = () => {
  const { state, toggleCart, getTotalItems } = useCart();
  const totalItems = getTotalItems();

  if (totalItems === 0) return null;

  return (
    <Button 
      onClick={toggleCart}
      className="fixed bottom-4 right-4 z-50 rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
      size="icon"
    >
      <ShoppingCart className="h-6 w-6" />
      {totalItems > 0 && (
        <Badge className="absolute -top-2 -right-2 bg-red-500 text-white min-w-[20px] h-5 flex items-center justify-center text-xs">
          {totalItems}
        </Badge>
      )}
    </Button>
  );
};

export const CartSidebar: React.FC = () => {
  const { state, removeFromCart, updateQuantity, clearCart, getTotalPrice, toggleCart } = useCart();
  const { user } = useUser();
  const { toast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeout' | 'delivery'>('dine_in');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to place your order.",
        variant: "destructive"
      });
      return;
    }

    if (state.items.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Add some items to your cart before checking out.",
        variant: "destructive"
      });
      return;
    }

    setIsCheckingOut(true);

    try {
      const orderData = {
        orderItems: state.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        orderType,
        specialInstructions,
        deliveryAddress: orderType === 'delivery' ? 'Customer address here' : null
      };

      const response = await fetch(`/api/businesses/${state.businessId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Order Placed Successfully!",
          description: `Your order #${result.order.orderNumber} has been placed. Check your dashboard for updates.`,
        });
        clearCart();
        // Redirect to dashboard
        window.location.href = '/my-dashboard?tab=orders';
      } else {
        throw new Error(result.error || 'Failed to place order');
      }
    } catch (error: any) {
      toast({
        title: "Order Failed",
        description: error.message || "Unable to place your order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const subtotal = getTotalPrice();
  const tax = subtotal * 0.10; // 10% tax
  const deliveryFee = orderType === 'delivery' ? 5.00 : 0;
  const total = subtotal + tax + deliveryFee;

  if (!state.isOpen) return null;

  return (
    <Sheet open={state.isOpen} onOpenChange={toggleCart}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Your Order</span>
            <Button variant="ghost" size="sm" onClick={toggleCart}>
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
          {state.businessName && (
            <SheetDescription>
              From {state.businessName}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {state.items.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Your cart is empty</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3">
                {state.items.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">${item.price} each</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Order Type Selection */}
              <Card className="p-4">
                <h4 className="font-medium mb-3">Order Type</h4>
                <Select value={orderType} onValueChange={(value: any) => setOrderType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine_in">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        Dine In
                      </div>
                    </SelectItem>
                    <SelectItem value="takeout">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Takeout
                      </div>
                    </SelectItem>
                    <SelectItem value="delivery">
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 mr-2" />
                        Delivery (+$5.00)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Card>

              {/* Special Instructions */}
              <Card className="p-4">
                <h4 className="font-medium mb-3">Special Instructions</h4>
                <Textarea
                  placeholder="Any special requests or dietary restrictions..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={3}
                />
              </Card>

              {/* Order Summary */}
              <Card className="p-4">
                <h4 className="font-medium mb-3">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (10%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>${deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </Card>

              {/* Checkout Button */}
              <div className="space-y-2">
                <Button 
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  size="lg"
                >
                  {isCheckingOut ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Placing Order...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Place Order (${total.toFixed(2)})
                    </div>
                  )}
                </Button>
                <Button variant="outline" onClick={clearCart} className="w-full">
                  Clear Cart
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};