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

interface StaffSkill {
  id: number;
  staffId: number;
  serviceId: number;
  proficiencyLevel: "trainee" | "junior" | "senior" | "expert";
}

const ServiceStaffTab = ({ 
  businessId,
  industryType 
}: { 
  businessId: number;
  industryType?: string;
}) => {
  const [selectedStaff, setSelectedStaff] = useState<SalonStaff | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: staffSkills = [], isLoading: isLoadingSkills } = useQuery<StaffSkill[]>({
    queryKey: [`/api/businesses/${businessId}/staff-skills`],
    enabled: !!businessId && !!selectedStaff,
  });

  const { data: services = [], isLoading: isLoadingServices } = useQuery<SalonService[]>({
    queryKey: [`/api/businesses/${businessId}/services`],
    enabled: !!businessId,
  });

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<SalonStaff[]>({
    queryKey: [`/api/businesses/${businessId}/staff`],
    enabled: !!businessId,
  });

  // Update staff skills mutation
  const updateSkillsMutation = useMutation({
    mutationFn: async (data: { staffId: number; serviceIds: number[] }) => {
      const response = await fetch(`/api/businesses/${businessId}/staff/${data.staffId}/skills`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ serviceIds: data.serviceIds }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/staff-skills`] });
      toast({
        title: "Success",
        description: "Staff services have been updated successfully.",
      });
      setIsUpdating(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update staff services",
      });
      setIsUpdating(false);
    },
  });

  // Load staff member's current services
  useEffect(() => {
    if (selectedStaff) {
      const currentServiceIds = staffSkills
        .filter(skill => skill.staffId === selectedStaff.id)
        .map(skill => skill.serviceId);
      setSelectedServiceIds(currentServiceIds);
    } else {
      setSelectedServiceIds([]);
    }
  }, [selectedStaff, staffSkills]);

  const handleStaffSelect = (member: SalonStaff) => {
    setSelectedStaff(member);
  };

  const handleServiceToggle = (serviceId: number) => {
    setSelectedServiceIds(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  };

  const handleSaveAssignments = async () => {
    if (!selectedStaff) return;

    setIsUpdating(true);
    await updateSkillsMutation.mutateAsync({
      staffId: selectedStaff.id,
      serviceIds: selectedServiceIds,
    });
  };

  if (isLoadingStaff || isLoadingServices || isLoadingSkills) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Selection Column */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Staff Members</h3>
          <div className="space-y-3">
            {staff.map((member) => (
              <Card
                key={member.id}
                className={`cursor-pointer transition-colors ${
                  selectedStaff?.id === member.id 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleStaffSelect(member)}
              >
                <CardHeader>
                  <CardTitle className="text-base">{member.name}</CardTitle>
                  <CardDescription>{member.specialization}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Service Assignment Column */}
        <div>
          {selectedStaff ? (
            <>
              <h3 className="text-lg font-semibold mb-4">
                Assign Services to {selectedStaff.name}
              </h3>
              <div className="space-y-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedServiceIds.includes(service.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleServiceToggle(service.id)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className="mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.duration} mins • ${service.price}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  className="w-full mt-4"
                  onClick={handleSaveAssignments}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Assignments'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] border rounded-lg bg-muted/50">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">No Staff Member Selected</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Select a staff member to assign services
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Current Assignments Overview */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Current Service Assignments</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => {
            const memberServices = services.filter(service => 
              staffSkills
                .filter(skill => skill.staffId === member.id)
                .map(skill => skill.serviceId)
                .includes(service.id)
            );

            return (
              <Card key={member.id}>
                <CardHeader>
                  <CardTitle className="text-base">{member.name}</CardTitle>
                  <CardDescription>{member.specialization}</CardDescription>
                </CardHeader>
                <CardContent>
                  {memberServices.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {memberServices.map((service) => (
                        <span
                          key={service.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                        >
                          {service.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No services assigned
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function BusinessDashboard({ businessId }: BusinessDashboardProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { business, isLoading: isLoadingBusiness, error } = useBusiness(businessId);
  const [activeTab, setActiveTab] = useState('services');
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

  const { data: services = [], isLoading: isLoadingServices } = useQuery<SalonService[]>({
    queryKey: [`/api/businesses/${businessId}/services`],
    enabled: !!businessId && business?.industryType === "salon" && activeTab === 'services',
  });

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<SalonStaff[]>({
    queryKey: [`/api/businesses/${businessId}/staff`],
    enabled: !!businessId && business?.industryType === "salon" && (activeTab === 'staff' || activeTab === 'service-staff'),
  });

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<ShiftTemplate[]>({
    queryKey: [`/api/businesses/${businessId}/shift-templates`],
    enabled: !!businessId && business?.industryType === "salon" && activeTab === 'shift-templates',
    queryFn: async () => {
      const res = await fetch(`/api/businesses/${businessId}/shift-templates`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to load shift templates");
      return res.json();
    },
  });


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

  const renderShiftTemplateCard = (template: ShiftTemplate) => {
    const formatTime = (time: string) => {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const calculateBreakDuration = (startTime: string, endTime: string) => {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const diffMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      return diffMinutes;
    };

    return (
      <Card key={template.id} className="relative w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">{template.name}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {formatTime(template.startTime)} - {formatTime(template.endTime)}
              </CardDescription>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
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
          </div>
        </CardHeader>
        <CardContent className="pb-16">
          <div className="space-y-3">
            {template.description && (
              <p className="text-sm text-muted-foreground break-words">{template.description}</p>
            )}
            {template.breaks && template.breaks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Breaks:</h4>
                <div className="space-y-2">
                  {template.breaks.map((break_, index) => {
                    const duration = calculateBreakDuration(break_.startTime, break_.endTime);
                    return (
                      <div key={index} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg shrink-0">
                            {break_.type === "lunch" ? "🍽️" : "☕️"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {formatTime(break_.startTime)} - {formatTime(break_.endTime)}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize truncate">
                              {break_.type} ({duration} min)
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="absolute bottom-4 right-4 space-x-2"><Button
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
        </CardContent>
      </Card>
    );
  };

  const renderDialogs = () => (
    <>
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

      <AlertDialog open={!!staffToDelete} onOpenChange={()=> setStaffToDelete(null)}>
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

  if (isLoadingBusiness) {
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
              <div className="text-2xl font-bold">+12,234</div>
              <p className="text-xs text-muted-foreground">
                +19% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="flex-1">
          {business?.industryType === "salon" ? (
            <>
              <Tabs defaultValue="services" className="space-y-6" onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="services">Services</TabsTrigger>
                  <TabsTrigger value="staff">Staff</TabsTrigger>
                  <TabsTrigger value="shift-templates">Shift Templates</TabsTrigger>
                  <TabsTrigger value="service-staff">Service-Staff</TabsTrigger>
                  <TabsTrigger value="roster">Roster</TabsTrigger>
                  <TabsTrigger value="slot-settings">Slot Settings</TabsTrigger>
                  <TabsTrigger value="bookings">Bookings</TabsTrigger>
                </TabsList>

                <TabsContent value="services" className="p-4">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Services</h2>
                    <Button onClick={() => setIsAddingService(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Service
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {services.map(service => renderServiceCard(service))}
                  </div>
                </TabsContent>

                <TabsContent value="staff" className="p-4">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Staff</h2>
                    <Button onClick={() => setIsAddingStaff(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Staff
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {staff.map(member => renderStaffCard(member))}
                  </div>
                </TabsContent>

                <TabsContent value="shift-templates" className="p-4">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Shift Templates</h2>
                    <Button onClick={() => setIsAddingTemplate(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Template
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map(template => renderShiftTemplateCard(template))}
                  </div>
                </TabsContent>

                <TabsContent value="service-staff" className="p-4">
                  <ServiceStaffTab 
                    businessId={businessId}
                    industryType={business.industryType}
                  />
                </TabsContent>

                <TabsContent value="roster" className="p-4">
                  <div className="flex justify-between mb-4">
                    <h2 className="text-2xl font-bold">Roster</h2>
                  </div>
                  <p className="text-muted-foreground">
                    Roster management coming soon...
                  </p>
                </TabsContent>

                <TabsContent value="slot-settings" className="p-4">
                  <div className="flex justify-between mb-4">
                    <h2 className="text-2xl font-bold">Slot Settings</h2>
                  </div>
                  <p className="text-muted-foreground">
                    Slot settings management coming soon...
                  </p>
                </TabsContent>

                <TabsContent value="bookings" className="p-4">
                  <div className="flex justify-between mb-4">
                    <h2 className="text-2xl font-bold">Bookings</h2>
                  </div>
                  <p className="text-muted-foreground">
                    Booking management coming soon...
                  </p>
                </TabsContent>
              </Tabs>
              {renderDialogs()}
            </>
          ) : (
            <div className="p-4">
              <Card className="w-full">
                <CardContent className="pt-6">
                  <div className="flex mb-4 gap-2">
                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                    <h1 className="text-2xl font-bold text-gray-900">Industry Not Supported</h1>
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    This industry type is not yet supported in the dashboard.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}