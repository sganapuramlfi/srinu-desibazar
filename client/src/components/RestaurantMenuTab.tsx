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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MenuCategory {
  id: number;
  businessId: number;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface MenuItem {
  id: number;
  businessId: number;
  categoryId?: number;
  name: string;
  description?: string;
  price: string;
  imageUrl?: string;
  preparationTime?: number;
  calories?: number;
  spiceLevel?: number;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isHalal: boolean;
  isAvailable: boolean;
  availableFrom?: string;
  availableTo?: string;
  stockQuantity?: number;
  displayOrder: number;
  createdAt: string;
  updatedAt?: string;
  category?: {
    id: number;
    name: string;
  };
}

interface RestaurantMenuTabProps {
  businessId: number;
}

export function RestaurantMenuTab({ businessId }: RestaurantMenuTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch menu categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<MenuCategory[]>({
    queryKey: [`/api/restaurants/${businessId}/menu/categories`],
    enabled: !!businessId,
  });

  // Fetch menu items
  const { data: menuItems = [], isLoading: isLoadingItems } = useQuery<MenuItem[]>({
    queryKey: [`/api/restaurants/${businessId}/menu/items`],
    enabled: !!businessId,
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: Partial<MenuCategory>) => {
      const response = await fetch(`/api/restaurants/${businessId}/menu/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${businessId}/menu/categories`] });
      setIsCategoryDialogOpen(false);
      toast({ title: "Success", description: "Menu category created successfully" });
    },
  });

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: Partial<MenuItem>) => {
      const response = await fetch(`/api/restaurants/${businessId}/menu/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create menu item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${businessId}/menu/items`] });
      setIsItemDialogOpen(false);
      toast({ title: "Success", description: "Menu item created successfully" });
    },
  });

  const filteredItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter(item => item.categoryId === parseInt(selectedCategory));

  const handleCreateCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createCategoryMutation.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      displayOrder: parseInt(formData.get('displayOrder') as string) || 0,
    });
  };

  const handleCreateItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createItemMutation.mutate({
      categoryId: formData.get('categoryId') ? parseInt(formData.get('categoryId') as string) : undefined,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      preparationTime: formData.get('preparationTime') ? parseInt(formData.get('preparationTime') as string) : undefined,
      calories: formData.get('calories') ? parseInt(formData.get('calories') as string) : undefined,
      spiceLevel: formData.get('spiceLevel') ? parseInt(formData.get('spiceLevel') as string) : undefined,
      isVegetarian: formData.get('isVegetarian') === 'on',
      isVegan: formData.get('isVegan') === 'on',
      isGlutenFree: formData.get('isGlutenFree') === 'on',
      isHalal: formData.get('isHalal') === 'on',
    });
  };

  return (
    <div className="space-y-6">
      {/* Categories Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Menu Categories
              </CardTitle>
              <CardDescription>Organize your menu into categories</CardDescription>
            </div>
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Menu Category</DialogTitle>
                  <DialogDescription>Add a new category to organize your menu items</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCategory}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Category Name</Label>
                      <Input id="name" name="name" placeholder="e.g., Appetizers, Main Courses" required />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" placeholder="Brief description of this category" />
                    </div>
                    <div>
                      <Label htmlFor="displayOrder">Display Order</Label>
                      <Input id="displayOrder" name="displayOrder" type="number" placeholder="1" />
                    </div>
                  </div>
                  <DialogFooter className="mt-4">
                    <Button type="submit" disabled={createCategoryMutation.isPending}>
                      Create Category
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              All Items
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id.toString() ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id.toString())}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Menu Items</CardTitle>
            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Menu Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Menu Item</DialogTitle>
                  <DialogDescription>Add a new item to your restaurant menu</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateItem}>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Item Name</Label>
                        <Input id="name" name="name" placeholder="e.g., Butter Chicken" required />
                      </div>
                      <div>
                        <Label htmlFor="categoryId">Category</Label>
                        <Select name="categoryId">
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" placeholder="Describe your dish" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="price">Price ($)</Label>
                        <Input id="price" name="price" type="number" step="0.01" placeholder="24.90" required />
                      </div>
                      <div>
                        <Label htmlFor="preparationTime">Prep Time (min)</Label>
                        <Input id="preparationTime" name="preparationTime" type="number" placeholder="25" />
                      </div>
                      <div>
                        <Label htmlFor="calories">Calories</Label>
                        <Input id="calories" name="calories" type="number" placeholder="450" />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="spiceLevel">Spice Level (0-5)</Label>
                      <Select name="spiceLevel">
                        <SelectTrigger>
                          <SelectValue placeholder="Select spice level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 - No Spice</SelectItem>
                          <SelectItem value="1">1 - Mild</SelectItem>
                          <SelectItem value="2">2 - Medium</SelectItem>
                          <SelectItem value="3">3 - Hot</SelectItem>
                          <SelectItem value="4">4 - Very Hot</SelectItem>
                          <SelectItem value="5">5 - Extremely Hot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Dietary Information</Label>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="isVegetarian" name="isVegetarian" />
                          <Label htmlFor="isVegetarian">Vegetarian</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="isVegan" name="isVegan" />
                          <Label htmlFor="isVegan">Vegan</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="isGlutenFree" name="isGlutenFree" />
                          <Label htmlFor="isGlutenFree">Gluten Free</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="isHalal" name="isHalal" />
                          <Label htmlFor="isHalal">Halal</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="mt-4">
                    <Button type="submit" disabled={createItemMutation.isPending}>
                      Create Menu Item
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
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Prep Time</TableHead>
                <TableHead>Dietary</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {categories.find(c => c.id === item.categoryId)?.name || "Uncategorized"}
                  </TableCell>
                  <TableCell>${item.price}</TableCell>
                  <TableCell>{item.preparationTime ? `${item.preparationTime} min` : "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {item.isVegetarian && <Badge variant="secondary">Veg</Badge>}
                      {item.isVegan && <Badge variant="secondary">Vegan</Badge>}
                      {item.isHalal && <Badge variant="secondary">Halal</Badge>}
                      {item.isGlutenFree && <Badge variant="secondary">GF</Badge>}
                      {item.spiceLevel && <Badge variant="outline">🌶️ {item.spiceLevel}</Badge>}
                    </div>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}