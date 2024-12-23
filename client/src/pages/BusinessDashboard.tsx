import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "../hooks/use-user";
import { useBusiness } from "../hooks/use-business";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Calendar,
  Users,
  BarChart,
  Settings,
  PlusCircle,
  Store,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SalonService, SalonStaff } from "@db/schema";

// Service form schema
const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  category: z.string().min(1, "Category is required"),
  isActive: z.boolean().default(true),
});

// Staff form schema
const staffFormSchema = z.object({
  name: z.string().min(1, "Staff name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  specialization: z.string().min(1, "Specialization is required"),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
  schedule: z.record(z.object({
    start: z.string(),
    end: z.string(),
  })).optional(),
});

interface BusinessDashboardProps {
  businessId: number;
}

export default function BusinessDashboard({ businessId }: BusinessDashboardProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { business, isLoading, error } = useBusiness(businessId);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const queryClient = useQueryClient();

  // Query hooks for services and staff
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: [`/api/businesses/${businessId}/services`],
    enabled: !!businessId && business?.industryType === "salon",
    queryFn: () =>
      fetch(`/api/businesses/${businessId}/services`, { credentials: "include" })
        .then((res) => res.json())
        .catch((err) => {throw new Error("Failed to load services");}),
  });

  const { data: staff, isLoading: isLoadingStaff } = useQuery({
    queryKey: [`/api/businesses/${businessId}/staff`],
    enabled: !!businessId && business?.industryType === "salon",
    queryFn: () =>
      fetch(`/api/businesses/${businessId}/staff`, { credentials: "include" })
        .then((res) => res.json())
        .catch((err) => {throw new Error("Failed to load staff");}),
  });

  // Form hooks
  const serviceForm = useForm({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 30,
      price: "",
      category: "",
      isActive: true,
    },
  });

  const staffForm = useForm({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      specialization: "",
      status: "active",
      schedule: {
        monday: { start: "09:00", end: "17:00" },
      },
    },
  });

  // Mutations
  const addServiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceFormSchema>) => {
      const res = await fetch(`/api/businesses/${businessId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setIsAddingService(false);
      serviceForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/services`] });
    },
    onError: (error) => {
      console.error("Error adding service:", error);
      //Optionally display error message to the user.
    },
  });

  const addStaffMutation = useMutation({
    mutationFn: async (data: z.infer<typeof staffFormSchema>) => {
      const res = await fetch(`/api/businesses/${businessId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setIsAddingStaff(false);
      staffForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/staff`] });
    },
    onError: (error) => {
      console.error("Error adding staff:", error);
      //Optionally display error message to the user.
    },
  });

  // Early returns for loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Error</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              {error?.message || "Failed to load business dashboard"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render industry-specific content
  const renderIndustrySpecificContent = () => {
    if (business.industryType === "salon") {
      return (
        <>
          <TabsContent value="services" className="p-4">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Salon Services</h3>
              <Dialog open={isAddingService} onOpenChange={setIsAddingService}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Service</DialogTitle>
                    <DialogDescription>
                      Add a new service to your salon's catalog
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...serviceForm}>
                    <form onSubmit={serviceForm.handleSubmit((data) => addServiceMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={serviceForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={serviceForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={serviceForm.control}
                          name="duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration (minutes)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={serviceForm.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price ($)</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={serviceForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="hair">Hair</SelectItem>
                                <SelectItem value="spa">Spa</SelectItem>
                                <SelectItem value="nails">Nails</SelectItem>
                                <SelectItem value="makeup">Makeup</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={addServiceMutation.isPending}>
                        {addServiceMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding Service...
                          </>
                        ) : (
                          "Add Service"
                        )}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoadingServices ? (
                <div className="col-span-full flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : services?.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No services added yet. Add your first service to get started.
                </div>
              ) : (
                services?.map((service) => (
                  <Card key={service.id}>
                    <CardHeader>
                      <CardTitle>{service.name}</CardTitle>
                      <CardDescription>
                        {service.duration} mins • ${service.price}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {service.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {service.category}
                        </span>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="staff" className="p-4">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Staff Management</h3>
              <Dialog open={isAddingStaff} onOpenChange={setIsAddingStaff}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                    <DialogDescription>
                      Add a new staff member to your salon
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...staffForm}>
                    <form onSubmit={staffForm.handleSubmit((data) => addStaffMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={staffForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={staffForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={staffForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={staffForm.control}
                        name="specialization"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specialization</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select specialization" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="hair">Hair Stylist</SelectItem>
                                <SelectItem value="spa">Spa Therapist</SelectItem>
                                <SelectItem value="nails">Nail Artist</SelectItem>
                                <SelectItem value="makeup">Makeup Artist</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={staffForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="on_leave">On Leave</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={addStaffMutation.isPending}>
                        {addStaffMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding Staff...
                          </>
                        ) : (
                          "Add Staff Member"
                        )}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoadingStaff ? (
                <div className="col-span-full flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : staff?.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No staff members added yet. Add your first staff member to get started.
                </div>
              ) : (
                staff?.map((member) => (
                  <Card key={member.id}>
                    <CardHeader>
                      <CardTitle>{member.name}</CardTitle>
                      <CardDescription>{member.specialization}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm">
                          Email: {member.email}
                        </p>
                        <p className="text-sm">
                          Phone: {member.phone}
                        </p>
                        <div className="flex justify-between items-center mt-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            member.status === "active"
                              ? "bg-green-100 text-green-700"
                              : member.status === "on_leave"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {member.status}
                          </span>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Store className="h-6 w-6 text-primary mr-2" />
          <h1 className="text-xl font-semibold">{business.name}</h1>
          <span className="ml-2 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
            {business.status}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-8 p-8">
        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">No bookings yet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0</div>
              <p className="text-xs text-muted-foreground">Start adding services</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">No customers yet</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <Card className="flex-1">
          <Tabs defaultValue="services" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none px-4">
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {renderIndustrySpecificContent()}

            <TabsContent value="bookings" className="p-4">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Bookings</h3>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Booking
                </Button>
              </div>
              <div className="text-sm text-muted-foreground text-center py-8">
                No bookings found. Start by adding your first booking.
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="p-4">
              <h3 className="text-lg font-semibold mb-4">Analytics</h3>
              <div className="text-sm text-muted-foreground text-center py-8">
                Analytics will be available once you start getting bookings.
              </div>
            </TabsContent>

            <TabsContent value="settings" className="p-4">
              <h3 className="text-lg font-semibold mb-4">Business Settings</h3>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your business profile and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Profile settings form will be implemented here */}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Working Hours</CardTitle>
                    <CardDescription>
                      Set your business operating hours
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Working hours form will be implemented here */}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}