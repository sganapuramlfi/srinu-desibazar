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
import { Plus, Edit, Trash2, Calendar, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RestaurantTable {
  id: number;
  businessId: number;
  tableNumber: string;
  seatingCapacity: number;
  location?: string;
  isActive: boolean;
  createdAt: string;
}

interface TableReservation {
  id: number;
  businessId: number;
  tableId?: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationDate: string;
  duration: number;
  specialRequests?: string;
  status: "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
  createdAt: string;
  updatedAt?: string;
  table?: {
    id: number;
    tableNumber: string;
    seatingCapacity: number;
    location?: string;
  };
}

interface RestaurantTablesTabProps {
  businessId: number;
}

export function RestaurantTablesTab({ businessId }: RestaurantTablesTabProps) {
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch restaurant tables
  const { data: tables = [], isLoading: isLoadingTables } = useQuery<RestaurantTable[]>({
    queryKey: [`/api/restaurants/${businessId}/tables`],
    enabled: !!businessId,
  });

  // Fetch reservations for selected date
  const { data: reservations = [], isLoading: isLoadingReservations } = useQuery<TableReservation[]>({
    queryKey: [`/api/restaurants/${businessId}/reservations`, selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${businessId}/reservations?date=${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch reservations');
      return response.json();
    },
    enabled: !!businessId,
  });

  // Create table mutation
  const createTableMutation = useMutation({
    mutationFn: async (data: Partial<RestaurantTable>) => {
      const response = await fetch(`/api/restaurants/${businessId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create table');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${businessId}/tables`] });
      setIsTableDialogOpen(false);
      toast({ title: "Success", description: "Table created successfully" });
    },
  });

  // Create reservation mutation
  const createReservationMutation = useMutation({
    mutationFn: async (data: Partial<TableReservation>) => {
      const response = await fetch(`/api/restaurants/${businessId}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create reservation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${businessId}/reservations`] });
      setIsReservationDialogOpen(false);
      toast({ title: "Success", description: "Reservation created successfully" });
    },
  });

  // Update reservation status mutation
  const updateReservationStatusMutation = useMutation({
    mutationFn: async ({ reservationId, status }: { reservationId: number; status: string }) => {
      const response = await fetch(`/api/restaurants/${businessId}/reservations/${reservationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update reservation status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${businessId}/reservations`] });
      toast({ title: "Success", description: "Reservation status updated" });
    },
  });

  const handleCreateTable = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTableMutation.mutate({
      tableNumber: formData.get('tableNumber') as string,
      seatingCapacity: parseInt(formData.get('seatingCapacity') as string),
      location: formData.get('location') as string,
    });
  };

  const handleCreateReservation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const reservationDate = formData.get('reservationDate') as string;
    const reservationTime = formData.get('reservationTime') as string;
    
    createReservationMutation.mutate({
      tableId: formData.get('tableId') ? parseInt(formData.get('tableId') as string) : undefined,
      customerName: formData.get('customerName') as string,
      customerPhone: formData.get('customerPhone') as string,
      customerEmail: formData.get('customerEmail') as string,
      partySize: parseInt(formData.get('partySize') as string),
      reservationDate: `${reservationDate}T${reservationTime}:00`,
      specialRequests: formData.get('specialRequests') as string,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'seated': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Restaurant Tables Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Restaurant Tables
              </CardTitle>
              <CardDescription>Manage your restaurant seating arrangement</CardDescription>
            </div>
            <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Table
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Restaurant Table</DialogTitle>
                  <DialogDescription>Add a new table to your restaurant</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTable}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="tableNumber">Table Number</Label>
                      <Input id="tableNumber" name="tableNumber" placeholder="e.g., T1, W1" required />
                    </div>
                    <div>
                      <Label htmlFor="seatingCapacity">Seating Capacity</Label>
                      <Input id="seatingCapacity" name="seatingCapacity" type="number" placeholder="4" required />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Select name="location">
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Main Dining">Main Dining</SelectItem>
                          <SelectItem value="Window">Window</SelectItem>
                          <SelectItem value="Private">Private</SelectItem>
                          <SelectItem value="Outdoor">Outdoor</SelectItem>
                          <SelectItem value="Bar">Bar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="mt-4">
                    <Button type="submit" disabled={createTableMutation.isPending}>
                      Create Table
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
                <TableHead>Table Number</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.id}>
                  <TableCell className="font-medium">{table.tableNumber}</TableCell>
                  <TableCell>{table.seatingCapacity} guests</TableCell>
                  <TableCell>{table.location || "Main Dining"}</TableCell>
                  <TableCell>
                    <Badge variant={table.isActive ? "default" : "secondary"}>
                      {table.isActive ? "Active" : "Inactive"}
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
        </CardContent>
      </Card>

      {/* Table Reservations Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Table Reservations
              </CardTitle>
              <CardDescription>Manage customer table bookings</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Dialog open={isReservationDialogOpen} onOpenChange={setIsReservationDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Reservation
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Table Reservation</DialogTitle>
                    <DialogDescription>Book a table for a customer</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateReservation}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="customerName">Customer Name</Label>
                          <Input id="customerName" name="customerName" placeholder="John Smith" required />
                        </div>
                        <div>
                          <Label htmlFor="customerPhone">Phone Number</Label>
                          <Input id="customerPhone" name="customerPhone" placeholder="+61 400 123 456" required />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="customerEmail">Email (Optional)</Label>
                        <Input id="customerEmail" name="customerEmail" type="email" placeholder="john@example.com" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="partySize">Party Size</Label>
                          <Input id="partySize" name="partySize" type="number" placeholder="4" required />
                        </div>
                        <div>
                          <Label htmlFor="tableId">Preferred Table</Label>
                          <Select name="tableId">
                            <SelectTrigger>
                              <SelectValue placeholder="Any available" />
                            </SelectTrigger>
                            <SelectContent>
                              {tables.map((table) => (
                                <SelectItem key={table.id} value={table.id.toString()}>
                                  {table.tableNumber} ({table.seatingCapacity} seats, {table.location})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="reservationDate">Date</Label>
                          <Input id="reservationDate" name="reservationDate" type="date" required />
                        </div>
                        <div>
                          <Label htmlFor="reservationTime">Time</Label>
                          <Input id="reservationTime" name="reservationTime" type="time" required />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="specialRequests">Special Requests</Label>
                        <Input id="specialRequests" name="specialRequests" placeholder="e.g., window table, high chair needed" />
                      </div>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button type="submit" disabled={createReservationMutation.isPending}>
                        Create Reservation
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Party Size</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((reservation: any) => (
                <TableRow key={reservation.reservation.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{reservation.reservation.customerName}</div>
                      <div className="text-sm text-muted-foreground">{reservation.reservation.customerPhone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {reservation.table ? `${reservation.table.tableNumber} (${reservation.table.location})` : "Any table"}
                  </TableCell>
                  <TableCell>{reservation.reservation.partySize} guests</TableCell>
                  <TableCell>
                    {new Date(reservation.reservation.reservationDate).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(reservation.reservation.status)}>
                      {reservation.reservation.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      onValueChange={(value) => 
                        updateReservationStatusMutation.mutate({
                          reservationId: reservation.reservation.id,
                          status: value
                        })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Update" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">Confirm</SelectItem>
                        <SelectItem value="seated">Seat</SelectItem>
                        <SelectItem value="completed">Complete</SelectItem>
                        <SelectItem value="cancelled">Cancel</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
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