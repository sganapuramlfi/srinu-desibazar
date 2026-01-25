import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Percent, Clock, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Promotion {
  id: number;
  businessId: number;
  title: string;
  description?: string;
  type: "happy_hour" | "daily_special" | "flash_sale" | "combo_deal" | "first_time_discount";
  discountType: "percentage" | "fixed_amount" | "buy_one_get_one";
  discountValue?: number;
  applicableItems: number[];
  minimumOrderValue?: number;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  applicableDays: string[];
  maxUsagePerCustomer?: number;
  maxTotalUsage?: number;
  currentUsage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface RestaurantPromotionsTabProps {
  businessId: number;
}

const PROMOTION_TYPES = [
  { value: "happy_hour", label: "Happy Hour", icon: "🍻", description: "Time-based discounts (e.g., 5-7 PM)" },
  { value: "daily_special", label: "Daily Special", icon: "⭐", description: "Special offers for specific days" },
  { value: "flash_sale", label: "Flash Sale", icon: "⚡", description: "Limited-time offers" },
  { value: "combo_deal", label: "Combo Deal", icon: "🍽️", description: "Bundle discounts" },
  { value: "first_time_discount", label: "First Time Discount", icon: "🎉", description: "New customer welcome offer" },
];

const DAYS_OF_WEEK = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];

export function RestaurantPromotionsTab({ businessId }: RestaurantPromotionsTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch promotions
  const { data: promotions = [], isLoading } = useQuery<Promotion[]>({
    queryKey: [`/api/restaurants/${businessId}/promotions`],
    enabled: !!businessId,
  });

  // Create promotion mutation
  const createPromotionMutation = useMutation({
    mutationFn: async (data: Partial<Promotion>) => {
      const response = await fetch(`/api/restaurants/${businessId}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create promotion');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${businessId}/promotions`] });
      setIsDialogOpen(false);
      toast({ title: "Success", description: "Promotion created successfully" });
    },
  });

  const handleCreatePromotion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get applicable days
    const applicableDays = DAYS_OF_WEEK.filter(day => 
      formData.get(`applicableDays_${day}`) === 'on'
    );

    createPromotionMutation.mutate({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      type: formData.get('type') as any,
      discountType: formData.get('discountType') as any,
      discountValue: formData.get('discountValue') ? parseFloat(formData.get('discountValue') as string) : undefined,
      minimumOrderValue: formData.get('minimumOrderValue') ? parseFloat(formData.get('minimumOrderValue') as string) : undefined,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      applicableDays,
      maxUsagePerCustomer: formData.get('maxUsagePerCustomer') ? parseInt(formData.get('maxUsagePerCustomer') as string) : undefined,
      maxTotalUsage: formData.get('maxTotalUsage') ? parseInt(formData.get('maxTotalUsage') as string) : undefined,
    });
  };

  const getPromotionTypeInfo = (type: string) => {
    return PROMOTION_TYPES.find(t => t.value === type) || PROMOTION_TYPES[0];
  };

  const getStatusColor = (promotion: Promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    
    if (!promotion.isActive) return 'bg-gray-100 text-gray-800';
    if (now < startDate) return 'bg-blue-100 text-blue-800';
    if (now > endDate) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (promotion: Promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    
    if (!promotion.isActive) return 'INACTIVE';
    if (now < startDate) return 'SCHEDULED';
    if (now > endDate) return 'EXPIRED';
    return 'ACTIVE';
  };

  const formatDiscountValue = (promotion: Promotion) => {
    switch (promotion.discountType) {
      case 'percentage':
        return `${promotion.discountValue}% OFF`;
      case 'fixed_amount':
        return `$${promotion.discountValue} OFF`;
      case 'buy_one_get_one':
        return 'BOGO';
      default:
        return 'DISCOUNT';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Restaurant Promotions
              </CardTitle>
              <CardDescription>Create and manage happy hours, flash sales, and special offers</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Promotion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Restaurant Promotion</DialogTitle>
                  <DialogDescription>Set up a new promotion or special offer</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePromotion}>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div>
                      <Label htmlFor="title">Promotion Title</Label>
                      <Input id="title" name="title" placeholder="e.g., Happy Hour - 20% Off Drinks" required />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" placeholder="Describe your promotion..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">Promotion Type</Label>
                        <Select name="type" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROMOTION_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <span>{type.icon}</span>
                                  <div>
                                    <div>{type.label}</div>
                                    <div className="text-xs text-muted-foreground">{type.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="discountType">Discount Type</Label>
                        <Select name="discountType" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select discount" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage Off (%)</SelectItem>
                            <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                            <SelectItem value="buy_one_get_one">Buy One Get One</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="discountValue">Discount Value</Label>
                        <Input 
                          id="discountValue" 
                          name="discountValue" 
                          type="number" 
                          step="0.01" 
                          placeholder="20 (for 20% or $20)" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="minimumOrderValue">Minimum Order ($)</Label>
                        <Input 
                          id="minimumOrderValue" 
                          name="minimumOrderValue" 
                          type="number" 
                          step="0.01" 
                          placeholder="50.00" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input id="startDate" name="startDate" type="date" required />
                      </div>
                      <div>
                        <Label htmlFor="endDate">End Date</Label>
                        <Input id="endDate" name="endDate" type="date" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time (Optional)</Label>
                        <Input id="startTime" name="startTime" type="time" placeholder="17:00" />
                      </div>
                      <div>
                        <Label htmlFor="endTime">End Time (Optional)</Label>
                        <Input id="endTime" name="endTime" type="time" placeholder="19:00" />
                      </div>
                    </div>

                    <div>
                      <Label>Applicable Days</Label>
                      <div className="grid grid-cols-4 gap-4 mt-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox id={`applicableDays_${day}`} name={`applicableDays_${day}`} />
                            <Label htmlFor={`applicableDays_${day}`} className="capitalize">
                              {day.slice(0, 3)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="maxUsagePerCustomer">Max Uses Per Customer</Label>
                        <Input 
                          id="maxUsagePerCustomer" 
                          name="maxUsagePerCustomer" 
                          type="number" 
                          placeholder="1" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxTotalUsage">Max Total Usage</Label>
                        <Input 
                          id="maxTotalUsage" 
                          name="maxTotalUsage" 
                          type="number" 
                          placeholder="100" 
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="mt-4">
                    <Button type="submit" disabled={createPromotionMutation.isPending}>
                      Create Promotion
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Promotion</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promotion) => {
                const typeInfo = getPromotionTypeInfo(promotion.type);
                return (
                  <TableRow key={promotion.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{promotion.title}</div>
                        {promotion.description && (
                          <div className="text-sm text-muted-foreground">{promotion.description}</div>
                        )}
                        {promotion.startTime && promotion.endTime && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {promotion.startTime} - {promotion.endTime}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{typeInfo.icon}</span>
                        <span>{typeInfo.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        <Badge variant="secondary">{formatDiscountValue(promotion)}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(promotion.startDate).toLocaleDateString()}</div>
                        <div className="text-muted-foreground">
                          to {new Date(promotion.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{promotion.currentUsage} used</div>
                        {promotion.maxTotalUsage && (
                          <div className="text-muted-foreground">
                            of {promotion.maxTotalUsage} max
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(promotion)}>
                        {getStatusText(promotion)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {promotions.length === 0 && (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No promotions yet</h3>
              <p className="text-muted-foreground">Start attracting customers with special offers and promotions.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}