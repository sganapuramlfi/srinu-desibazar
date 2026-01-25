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
import { Plus, Edit, Trash2, Users, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RestaurantStaff {
  id: number;
  businessId: number;
  name: string;
  email?: string;
  phone: string;
  role: "manager" | "head_chef" | "sous_chef" | "cook" | "waiter" | "host" | "bartender" | "cashier";
  hourlyRate?: number;
  startDate?: string;
  workingDays: string[];
  shiftPreference?: "morning" | "afternoon" | "evening" | "night" | "flexible";
  skills: string[];
  certifications: string[];
  status: "active" | "inactive" | "on_leave" | "terminated";
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

interface RestaurantStaffTabProps {
  businessId: number;
}

const RESTAURANT_ROLES = [
  { value: "manager", label: "Manager", icon: "👔" },
  { value: "head_chef", label: "Head Chef", icon: "👨‍🍳" },
  { value: "sous_chef", label: "Sous Chef", icon: "👩‍🍳" },
  { value: "cook", label: "Cook", icon: "🧑‍🍳" },
  { value: "waiter", label: "Waiter", icon: "🙋‍♂️" },
  { value: "host", label: "Host", icon: "🤵" },
  { value: "bartender", label: "Bartender", icon: "🍸" },
  { value: "cashier", label: "Cashier", icon: "💰" },
];

const WORKING_DAYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];

const RESTAURANT_SKILLS = [
  "food_safety", "customer_service", "cash_handling", "bartending", 
  "wine_knowledge", "inventory_management", "kitchen_equipment", "food_preparation",
  "order_taking", "pos_systems", "cleaning_protocols", "first_aid"
];

export function RestaurantStaffTab({ businessId }: RestaurantStaffTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<RestaurantStaff | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch restaurant staff
  const { data: staff = [], isLoading } = useQuery<RestaurantStaff[]>({
    queryKey: [`/api/restaurants/${businessId}/staff`],
    enabled: !!businessId,
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: Partial<RestaurantStaff>) => {
      const response = await fetch(`/api/restaurants/${businessId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create staff member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${businessId}/staff`] });
      setIsDialogOpen(false);
      toast({ title: "Success", description: "Staff member added successfully" });
    },
  });

  const handleCreateStaff = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get working days
    const workingDays = WORKING_DAYS.filter(day => 
      formData.get(`workingDays_${day}`) === 'on'
    );
    
    // Get skills
    const skills = RESTAURANT_SKILLS.filter(skill => 
      formData.get(`skills_${skill}`) === 'on'
    );

    createStaffMutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      role: formData.get('role') as any,
      hourlyRate: formData.get('hourlyRate') ? parseFloat(formData.get('hourlyRate') as string) : undefined,
      workingDays,
      shiftPreference: formData.get('shiftPreference') as any,
      skills,
      notes: formData.get('notes') as string,
    });
  };

  const getRoleIcon = (role: string) => {
    const roleInfo = RESTAURANT_ROLES.find(r => r.value === role);
    return roleInfo?.icon || "👤";
  };

  const getRoleLabel = (role: string) => {
    const roleInfo = RESTAURANT_ROLES.find(r => r.value === role);
    return roleInfo?.label || role;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Restaurant Staff
              </CardTitle>
              <CardDescription>Manage your restaurant team with specialized roles</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Restaurant Staff Member</DialogTitle>
                  <DialogDescription>Add a new team member with restaurant-specific role</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateStaff}>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="name" placeholder="John Smith" required />
                      </div>
                      <div>
                        <Label htmlFor="role">Restaurant Role</Label>
                        <Select name="role" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESTAURANT_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.icon} {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" name="phone" placeholder="+61 400 123 456" required />
                      </div>
                      <div>
                        <Label htmlFor="email">Email (Optional)</Label>
                        <Input id="email" name="email" type="email" placeholder="john@restaurant.com" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                        <Input id="hourlyRate" name="hourlyRate" type="number" step="0.01" placeholder="25.00" />
                      </div>
                      <div>
                        <Label htmlFor="shiftPreference">Shift Preference</Label>
                        <Select name="shiftPreference">
                          <SelectTrigger>
                            <SelectValue placeholder="Select preference" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="morning">Morning (6AM-2PM)</SelectItem>
                            <SelectItem value="afternoon">Afternoon (2PM-10PM)</SelectItem>
                            <SelectItem value="evening">Evening (6PM-12AM)</SelectItem>
                            <SelectItem value="night">Night (10PM-6AM)</SelectItem>
                            <SelectItem value="flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Working Days</Label>
                      <div className="grid grid-cols-4 gap-4 mt-2">
                        {WORKING_DAYS.map((day) => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox id={`workingDays_${day}`} name={`workingDays_${day}`} />
                            <Label htmlFor={`workingDays_${day}`} className="capitalize">
                              {day.slice(0, 3)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Restaurant Skills</Label>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        {RESTAURANT_SKILLS.map((skill) => (
                          <div key={skill} className="flex items-center space-x-2">
                            <Checkbox id={`skills_${skill}`} name={`skills_${skill}`} />
                            <Label htmlFor={`skills_${skill}`} className="text-sm">
                              {skill.replace('_', ' ').toUpperCase()}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Input id="notes" name="notes" placeholder="Additional information..." />
                    </div>
                  </div>
                  <DialogFooter className="mt-4">
                    <Button type="submit" disabled={createStaffMutation.isPending}>
                      Add Staff Member
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
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Working Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      {member.shiftPreference && (
                        <div className="text-sm text-muted-foreground capitalize">
                          Prefers {member.shiftPreference} shift
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getRoleIcon(member.role)}</span>
                      <span>{getRoleLabel(member.role)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{member.phone}</div>
                      {member.email && (
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.hourlyRate ? `$${member.hourlyRate}/hr` : "Not set"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.workingDays.slice(0, 3).map((day) => (
                        <Badge key={day} variant="outline" className="text-xs">
                          {day.slice(0, 3).toUpperCase()}
                        </Badge>
                      ))}
                      {member.workingDays.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.workingDays.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(member.status)}>
                      {member.status.replace('_', ' ').toUpperCase()}
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
              ))}
            </TableBody>
          </Table>
          
          {staff.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No staff members yet</h3>
              <p className="text-muted-foreground">Start building your restaurant team by adding staff members.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}