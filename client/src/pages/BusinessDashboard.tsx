import { useState, useEffect } from "react";
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
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SalonService, SalonStaff } from "@db/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

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

// Update shift template form schema
const shiftTemplateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  breaks: z.array(z.object({
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    duration: z.number().min(1, "Break duration must be at least 1 minute"),
    type: z.enum(["lunch", "short_break", "other"]),
  })).default([]),
  type: z.enum(["regular", "overtime", "holiday", "leave"]).default("regular"),
  isActive: z.boolean().default(true),
});

// Add shift template form schema
interface BusinessDashboardProps {
  businessId: number;
}

// Update ShiftTemplate interface to match the schema
interface ShiftTemplate {
  id: number;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  breaks?: {
    startTime: string;
    endTime: string;
    duration: number;
    type: "lunch" | "short_break" | "other";
  }[];
  type: "regular" | "overtime" | "holiday" | "leave";
  isActive: boolean;
}


export default function BusinessDashboard({ businessId }: BusinessDashboardProps) {
  // State hooks - keep all hooks at the top level
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { business, isLoading, error } = useBusiness(businessId);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [isEditingService, setIsEditingService] = useState<SalonService | null>(null);
  const [isEditingStaff, setIsEditingStaff] = useState<SalonStaff | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<SalonService | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<SalonStaff | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ShiftTemplate | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form hooks - initialize all forms at top level
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
      status: "active" as const,
    },
  });

  // Update form default values
  const shiftTemplateForm = useForm({
    resolver: zodResolver(shiftTemplateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      startTime: "09:00",
      endTime: "17:00",
      breaks: [],
      type: "regular" as const,
      isActive: true,
    },
  });

  // Query hooks
  const { data: services = [], isLoading: isLoadingServices } = useQuery<SalonService[]>({
    queryKey: [`/api/businesses/${businessId}/services`],
    enabled: !!businessId && business?.industryType === "salon",
  });

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<SalonStaff[]>({
    queryKey: [`/api/businesses/${businessId}/staff`],
    enabled: !!businessId && business?.industryType === "salon",
  });

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<ShiftTemplate[]>({
    queryKey: [`/api/businesses/${businessId}/shift-templates`],
    enabled: !!businessId && business?.industryType === "salon",
    queryFn: async () => {
      const res = await fetch(`/api/businesses/${businessId}/shift-templates`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to load shift templates");
      return res.json();
    },
  });

  // Effect hooks
  useEffect(() => {
    if (isEditingService) {
      serviceForm.reset({
        name: isEditingService.name,
        description: isEditingService.description || "",
        duration: isEditingService.duration,
        price: isEditingService.price.toString(),
        category: isEditingService.category,
        isActive: isEditingService.isActive,
      });
    }
  }, [isEditingService, serviceForm]);

  useEffect(() => {
    if (isEditingStaff) {
      staffForm.reset({
        name: isEditingStaff.name,
        email: isEditingStaff.email,
        phone: isEditingStaff.phone || "",
        specialization: isEditingStaff.specialization || "",
        status: isEditingStaff.status,
      });
    }
  }, [isEditingStaff, staffForm]);

  useEffect(() => {
    if (isEditingTemplate) {
      shiftTemplateForm.reset({
        name: isEditingTemplate.name,
        description: isEditingTemplate.description || "",
        startTime: isEditingTemplate.startTime,
        endTime: isEditingTemplate.endTime,
        breaks: isEditingTemplate.breaks || [],
        type: isEditingTemplate.type,
        isActive: isEditingTemplate.isActive,
      });
    }
  }, [isEditingTemplate, shiftTemplateForm]);

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

  // Add mutation hooks for edit/delete operations
  const editServiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceFormSchema> & { id: number }) => {
      const res = await fetch(`/api/businesses/${businessId}/services/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setIsEditingService(null);
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/services`] });
      toast({
        title: "Service updated",
        description: "The service has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const res = await fetch(`/api/businesses/${businessId}/services/${serviceId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setServiceToDelete(null);
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/services`] });
      toast({
        title: "Service deleted",
        description: "The service has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });


  // Add staff edit/delete mutations
  const editStaffMutation = useMutation({
    mutationFn: async (data: z.infer<typeof staffFormSchema> & { id: number }) => {
      const res = await fetch(`/api/businesses/${businessId}/staff/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setIsEditingStaff(null);
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/staff`] });
      toast({
        title: "Staff updated",
        description: "The staff member has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: number) => {
      const res = await fetch(`/api/businesses/${businessId}/staff/${staffId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setStaffToDelete(null);
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/staff`] });
      toast({
        title: "Staff deleted",
        description: "The staff member has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Add mutations for shift templates
  const addTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof shiftTemplateFormSchema>) => {
      const res = await fetch(`/api/businesses/${businessId}/shift-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setIsAddingTemplate(false);
      shiftTemplateForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/shift-templates`] });
      toast({
        title: "Template created",
        description: "The shift template has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const editTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof shiftTemplateFormSchema> & { id: number }) => {
      const res = await fetch(`/api/businesses/${businessId}/shift-templates/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setIsEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/shift-templates`] });
      toast({
        title: "Template updated",
        description: "The shift template has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const res = await fetch(`/api/businesses/${businessId}/shift-templates/${templateId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setTemplateToDelete(null);
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/shift-templates`] });
      toast({
        title: "Template deleted",
        description: "The shift template has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Move useEffect hooks to component level

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

  // Update the service card render to include edit and delete buttons
  const renderServiceCard = (service: SalonService) => (
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
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingService(service)}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setServiceToDelete(service)}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Update the staff card render to include edit and delete buttons
  const renderStaffCard = (member: SalonStaff) => (
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
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingStaff(member)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setStaffToDelete(member)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Update the template card render function
  const renderShiftTemplateCard = (template: ShiftTemplate) => (
    <Card key={template.id}>
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        <CardDescription>
          {template.startTime} - {template.endTime}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
          {template.breaks && template.breaks.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Breaks:</h4>
              <div className="space-y-1">
                {template.breaks.map((break_, index) => (
                  <p key={index} className="text-sm text-muted-foreground">
                    {break_.type === "lunch" ? "🍽️" : "☕️"} {break_.startTime} - {break_.endTime} ({break_.duration}min)
                  </p>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between items-center mt-4">
            <span className={`text-xs px-2 py-1 rounded-full ${
              template.type === "regular"
                ? "bg-green-100 text-green-700"
                : template.type === "overtime"
                ? "bg-yellow-100 text-yellow-700"
                : template.type === "holiday"
                ? "bg-blue-100 text-blue-700"
                : "bg-red-100 text-red-700"
            } capitalize`}>
              {template.type}
            </span>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingTemplate(template)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setTemplateToDelete(template)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Add edit dialogs and delete confirmation dialogs
  const renderDialogs = () => (
    <>
      {/* Service Edit Dialog */}
      <Dialog open={!!isEditingService} onOpenChange={() => setIsEditingService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update the service details
            </DialogDescription>
          </DialogHeader>
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit((data) => editServiceMutation.mutate({ ...data, id: isEditingService!.id }))} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={editServiceMutation.isPending}>
                {editServiceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Service...
                  </>
                ) : (
                  "Update Service"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Staff Edit Dialog */}
      <Dialog open={!!isEditingStaff} onOpenChange={() => setIsEditingStaff(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update the staff member details
            </DialogDescription>
          </DialogHeader>
          <Form {...staffForm}>
            <form onSubmit={staffForm.handleSubmit((data) => editStaffMutation.mutate({ ...data, id: isEditingStaff!.id }))} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={editStaffMutation.isPending}>
                {editStaffMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Staff...
                  </>
                ) : (
                  "Update Staff Member"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Service Delete Confirmation */}
      <AlertDialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {serviceToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteServiceMutation.mutate(serviceToDelete!.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteServiceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Staff Delete Confirmation */}
      <AlertDialog open={!!staffToDelete} onOpenChange={() => setStaffToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {staffToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStaffMutation.mutate(staffToDelete!.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteStaffMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shift Template Edit Dialog */}
      <Dialog open={!!isEditingTemplate || isAddingTemplate} 
       onOpenChange={() => isEditingTemplate ? setIsEditingTemplate(null) : setIsAddingTemplate(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingTemplate ? 'Edit' : 'Add'} Shift Template</DialogTitle>
            <DialogDescription>
              {isEditingTemplate ? 'Update the shift template details' : 'Create a new shift template'}
            </DialogDescription>
          </DialogHeader>
          <Form {...shiftTemplateForm}>
            <form onSubmit={shiftTemplateForm.handleSubmit((data) => 
              isEditingTemplate 
                ? editTemplateMutation.mutate({ ...data, id: isEditingTemplate.id })
                : addTemplateMutation.mutate(data)
            )} className="space-y-4">
              <FormField
                control={shiftTemplateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={shiftTemplateForm.control}
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
                  control={shiftTemplateForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={shiftTemplateForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={shiftTemplateForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="overtime">Overtime</SelectItem>
                        <SelectItem value="holiday">Holiday</SelectItem>
                        <SelectItem value="leave">Leave</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={shiftTemplateForm.control}
                name="breaks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breaks</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {field.value.map((breakItem, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Input
                                type="time"
                                value={breakItem.startTime}
                                onChange={(e) => {
                                  const newBreaks = [...field.value];
                                  newBreaks[index] = {
                                    ...newBreaks[index],
                                    startTime: e.target.value,
                                  };
                                  field.onChange(newBreaks);
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <Input
                                type="time"
                                value={breakItem.endTime}
                                onChange={(e) => {
                                  const newBreaks = [...field.value];
                                  newBreaks[index] = {
                                    ...newBreaks[index],
                                    endTime: e.target.value,
                                  };
                                  field.onChange(newBreaks);
                                }}
                              />
                            </div>
                            <Select
                              value={breakItem.type}
                              onValueChange={(value) => {
                                const newBreaks = [...field.value];
                                newBreaks[index] = {
                                  ...newBreaks[index],
                                  type: value as "lunch" | "short_break" | "other",
                                };
                                field.onChange(newBreaks);
                              }}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lunch">Lunch</SelectItem>
                                <SelectItem value="short_break">Short Break</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newBreaks = field.value.filter((_, i) => i !== index);
                                field.onChange(newBreaks);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            field.onChange([
                              ...field.value,
                              {
                                startTime: "12:00",
                                endTime: "13:00",
                                duration: 60,
                                type: "lunch",
                              },
                            ]);
                          }}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add Break
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                {isEditingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Shift Template Delete Confirmation */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {templateToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplateMutation.mutate(templateToDelete!.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteTemplateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // Update the main render to use the new card renderers and include dialogs
  const renderIndustrySpecificContent = () => {
    if (business.industryType === "salon") {
      return (
        <>
          <Tabs defaultValue="services" className="w-full">
            <TabsList className="grid grid-cols-7 w-full">
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="shifts">Shift Templates</TabsTrigger>
              <TabsTrigger value="mapping">Service-Staff</TabsTrigger>
              <TabsTrigger value="roster">Roster</TabsTrigger>
              <TabsTrigger value="slots">Slot Settings</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
            </TabsList>

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
                  services?.map(renderServiceCard)
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
                  staff?.map(renderStaffCard)
                )}
              </div>
            </TabsContent>

            <TabsContent value="shifts" className="p-4">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Shift Templates</h3>
                <Dialog open={isAddingTemplate} onOpenChange={setIsAddingTemplate}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Shift Template</DialogTitle>
                      <DialogDescription>
                        Create a new shift template with breaks and schedule
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...shiftTemplateForm}>
                      <form onSubmit={shiftTemplateForm.handleSubmit((data) => addTemplateMutation.mutate(data))} className="space-y-4">
                        {/* Add form fields for shift template */}
                        <FormField
                          control={shiftTemplateForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Template Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={shiftTemplateForm.control}
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
                            control={shiftTemplateForm.control}
                            name="startTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={shiftTemplateForm.control}
                            name="endTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={shiftTemplateForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Template Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="regular">Regular</SelectItem>
                                  <SelectItem value="overtime">Overtime</SelectItem>
                                  <SelectItem value="holiday">Holiday</SelectItem>
                                  <SelectItem value="leave">Leave</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={shiftTemplateForm.control}
                          name="breaks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Breaks</FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  {field.value.map((breakItem, index) => (
                                    <div key={index} className="flex gap-2 items-end">
                                      <div className="flex-1">
                                        <Input
                                          type="time"
                                          value={breakItem.startTime}
                                          onChange={(e) => {
                                            const newBreaks = [...field.value];
                                            newBreaks[index] = {
                                              ...newBreaks[index],
                                              startTime: e.target.value,
                                            };
                                            field.onChange(newBreaks);
                                          }}
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <Input
                                          type="time"
                                          value={breakItem.endTime}
                                          onChange={(e) => {
                                            const newBreaks = [...field.value];
                                            newBreaks[index] = {
                                              ...newBreaks[index],
                                              endTime: e.target.value,
                                            };
                                            field.onChange(newBreaks);
                                          }}
                                        />
                                      </div>
                                      <Select
                                        value={breakItem.type}
                                        onValueChange={(value) => {
                                          const newBreaks = [...field.value];
                                          newBreaks[index] = {
                                            ...newBreaks[index],
                                            type: value as "lunch" | "short_break" | "other",
                                          };
                                          field.onChange(newBreaks);
                                        }}
                                      >
                                        <SelectTrigger className="w-[120px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="lunch">Lunch</SelectItem>
                                          <SelectItem value="short_break">Short Break</SelectItem>
                                          <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          const newBreaks = field.value.filter((_, i) => i !== index);
                                          field.onChange(newBreaks);
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      field.onChange([
                                        ...field.value,
                                        {
                                          startTime: "12:00",
                                          endTime: "13:00",
                                          duration: 60,
                                          type: "lunch",
                                        },
                                      ]);
                                    }}
                                  >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Add Break
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" disabled={addTemplateMutation.isPending}>
                          {addTemplateMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding Template...
                            </>
                          ) : (
                            "Add Template"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoadingTemplates ? (
                  <div className="col-span-full flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !templates || templates.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No shift templates added yet. Add your first template to get started.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => renderShiftTemplateCard(template))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="mapping" className="p-4">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Service-Staff Mapping</h3>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Mapping
                </Button>
              </div>
              <div className="grid gap-4">
                {/* Service-staff mapping interface will go here */}
                <Card>
                  <CardHeader>
                    <CardTitle>Service Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Map services to qualified staff members</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="roster" className="p-4">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Staff Roster</h3>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Schedule
                </Button>
              </div>
              <div className="grid gap-4">
                {/* Weekly roster view will go here */}
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">View and manage staff schedules</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="slots" className="p-4">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Slot Settings</h3>
                <div className="space-x-2">
                  <Button variant="outline">
                    Auto-Generate
                  </Button>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Manual Slot
                  </Button>
                </div>
              </div>
              <div className="grid gap-4">
                {/* Slot configuration interface will go here */}
                <Card>
                  <CardHeader>
                    <CardTitle>Available Slots</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Configure and manage appointment slots</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="bookings" className="p-4">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Bookings</h3>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Booking
                </Button>
              </div>
              <div className="grid gap-4">
                {/* Bookings management interface will go here */}
                <Card>
                  <CardHeader>
                    <CardTitle>Today's Appointments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">View and manage current bookings</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto py-6">
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
          {renderIndustrySpecificContent()}
        </Card>
      </div>
      {renderDialogs()}
    </div>
  );
}