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
import { addDays, format, startOfWeek, isSameDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Package, UserPlus, CalendarDays } from "lucide-react";

// Form Schemas
const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  category: z.string().min(1, "Category is required"),
  isActive: z.boolean().default(true),
});

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

interface BusinessDashboardProps {
  businessId: number;
}

interface ShiftTemplate {
  id: number;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  breaks?: Array<{
    startTime: string;
    endTime: string;
    duration: number;
    type: "lunch" | "short_break" | "other";
  }>;
  type: "regular" | "overtime" | "holiday" | "leave";
  isActive: boolean;
}

interface StaffSkill {
  id: number;
  staffId: number;
  serviceId: number;
  proficiencyLevel: "trainee" | "junior" | "senior" | "expert";
  createdAt: string;
}

interface StaffSkillResponse {
  staff_skills: StaffSkill;
  salon_staff: SalonStaff;
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

  // Fetch staff skills with service details
  const { data: staffSkillsResponse = [], isLoading: isLoadingSkills } = useQuery<StaffSkillResponse[]>({
    queryKey: [`/api/businesses/${businessId}/staff-skills`],
    enabled: !!businessId,
  });

  // Transform the response to get just the staff skills
  const staffSkills = staffSkillsResponse?.map(response => response?.staff_skills) || [];

  const { data: services = [], isLoading: isLoadingServices } = useQuery<SalonService[]>({
    queryKey: [`/api/businesses/${businessId}/services`],
    enabled: !!businessId,
  });

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<SalonStaff[]>({
    queryKey: [`/api/businesses/${businessId}/staff`],
    enabled: !!businessId,
  });

  // Update staff skills mutation with optimistic updates
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
    onMutate: async (newData) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: [`/api/businesses/${businessId}/staff-skills`] });

      // Snapshot the previous value
      const previousSkills = queryClient.getQueryData([`/api/businesses/${businessId}/staff-skills`]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [`/api/businesses/${businessId}/staff-skills`],
        (old: StaffSkillResponse[] = []) => {
          // Remove existing skills for this staff member
          const filtered = old.filter(
            (item) => item.staff_skills.staffId !== newData.staffId
          );

          // Add new skills
          const staffMember = staff.find((s) => s.id === newData.staffId);
          const newSkills = newData.serviceIds.map((serviceId) => ({
            staff_skills: {
              id: Math.random(), // temporary id
              staffId: newData.staffId,
              serviceId,
              proficiencyLevel: "junior",
              createdAt: new Date().toISOString(),
            },
            salon_staff: staffMember || ({} as SalonStaff), // Handle potential null
          }));

          return [...filtered, ...newSkills];
        }
      );

      return { previousSkills };
    },
    onError: (err, newData, context) => {
      // Roll back to the previous value if mutation fails
      if (context?.previousSkills) {
        queryClient.setQueryData(
          [`/api/businesses/${businessId}/staff-skills`],
          context.previousSkills
        );
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to update staff services",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/staff-skills`] });
      toast({
        title: "Success",
        description: "Staff services have been updated successfully.",
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  // Load staff member's current services
  useEffect(() => {
    if (selectedStaff) {
      const currentServiceIds = staffSkills
        .filter(skill => skill && skill.staffId === selectedStaff.id)
        .map(skill => skill?.serviceId)
        .filter(id => id !== undefined);
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
            const memberSkills = staffSkills.filter(skill => skill && skill.staffId === member.id);
            const memberServices = services.filter(service =>
              memberSkills.map(skill => skill?.serviceId).filter(id => id !== undefined).includes(service.id)
            );

            return (
              <Card key={member.id} className="h-full">
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

interface RosterTabProps {
  businessId: number;
  staff: SalonStaff[];
  templates: ShiftTemplate[];
  isLoadingStaff: boolean;
  isLoadingTemplates: boolean;
}

const RosterTabUpdated = ({
  businessId,
  staff,
  templates,
  isLoadingStaff,
  isLoadingTemplates
}: RosterTabProps) => {
  const [viewStartDate, setViewStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedStaff, setSelectedStaff] = useState<number[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate array of 7 days starting from viewStartDate
  const dateRange = Array.from({ length: 7 }, (_, i) => addDays(viewStartDate, i));

  // Fetch roster data
  const { data: rosterShifts = [], isLoading: isLoadingRoster } = useQuery<RosterShift[]>({
    queryKey: [`/api/businesses/${businessId}/roster`],
    enabled: !!businessId && !!staff.length,
  });

  const assignShiftMutation = useMutation({
    mutationFn: async (data: {
      staffId: number;
      templateId: number;
      date: string;
    }) => {
      const response = await fetch(`/api/businesses/${businessId}/roster/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/roster`] });
      toast({
        title: "Success",
        description: "Shift has been assigned successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to assign shift",
      });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async (data: {
      shiftId: number;
      templateId: number;
    }) => {
      const response = await fetch(`/api/businesses/${businessId}/roster/${data.shiftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ templateId: data.templateId }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/roster`] });
      toast({
        title: "Success",
        description: "Shift has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update shift",
      });
    },
  });

  if (isLoadingStaff || isLoadingTemplates || isLoadingRoster) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getShiftForDateAndStaff = (date: Date, staffId: number) => {
    return rosterShifts.find(shift =>
      isSameDay(new Date(shift.date), date) && shift.staffId === staffId
    );
  };

  const getTemplateById = (templateId: number) => {
    return templates.find(t => t.id === templateId);
  };

  const getShiftTypeColor = (type: string) => {
    switch (type) {
      case 'regular':
        return 'bg-blue-100 border-blue-200';
      case 'overtime':
        return 'bg-orange-100 border-orange-200';
      case 'holiday':
        return 'bg-green-100 border-green-200';
      case 'leave':
        return 'bg-red-100 border-red-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Shift Types Legend */}
      <div className="flex flex-wrap gap-4 items-center">
        <span className="text-sm font-medium">Shift Types:</span>
        {['regular', 'overtime', 'holiday', 'leave'].map((type) => (
          <div
            key={type}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${getShiftTypeColor(type)}`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </div>
        ))}
      </div>

      {/* Weekly Roster View */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle>Weekly Roster</CardTitle>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewStartDate(addDays(viewStartDate, -7))}
              >
                Previous Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewStartDate(addDays(viewStartDate, 7))}
              >
                Next Week
              </Button>
            </div>
          </div>
          <CardDescription>
            {format(viewStartDate, "MMMM d, yyyy")} - {format(addDays(viewStartDate, 6), "MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted">Staff</th>
                  {dateRange.map((date) => (
                    <th key={date.toISOString()} className="border p-2 bg-muted min-w-[140px]">
                      {format(date, "EEE, MMM d")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td className="border p-2 font-medium">
                      <div className="flex flex-col">
                        <span>{member.name}</span>
                        <span className="text-xs text-muted-foreground">{member.specialization}</span>
                      </div>
                    </td>
                    {dateRange.map((date) => {
                      const shift = getShiftForDateAndStaff(date, member.id);
                      const template = shift ? getTemplateById(shift.templateId) : null;

                      return (
                        <td key={date.toISOString()} className="border p-2">
                          <div className="min-h-[80px]">
                            {shift && template ? (
                              <div className={`space-y-2 p-2 rounded-md border ${getShiftTypeColor(template.type)}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    {template.name}
                                  </span>
                                  <Select
                                    value={shift.templateId.toString()}
                                    onValueChange={(value) =>
                                      updateShiftMutation.mutate({
                                        shiftId: shift.id,
                                        templateId: parseInt(value),
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-[130px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {templates.map((t) => (
                                        <SelectItem
                                          key={t.id}
                                          value={t.id.toString()}
                                        >
                                          {t.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {template.startTime} - {template.endTime}
                                </div>
                              </div>
                            ) : (
                              <Select
                                onValueChange={(value) =>
                                  assignShiftMutation.mutate({
                                    staffId: member.id,
                                    templateId: parseInt(value),
                                    date: date.toISOString(),
                                  })
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Assign shift" />
                                </SelectTrigger>
                                <SelectContent>
                                  {templates.map((t) => (
                                    <SelectItem
                                      key={t.id}
                                      value={t.id.toString()}
                                    >
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface RosterShift {
  id: number;
  staffId: number;
  templateId: number;
  date: string;
  status: "scheduled" | "working" | "completed" | "leave" | "sick" | "absent";
}


const StaffTab = ({ businessId }: { businessId: number }) => {
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isEditingStaff, setIsEditingStaff] = useState<SalonStaff | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<SalonStaff | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: staff = [], isLoading } = useQuery<SalonStaff[]>({
    queryKey: [`/api/businesses/${businessId}/staff`],
    enabled: !!businessId,
  });

  // Add staff mutation
  const addStaffMutation = useMutation({
    mutationFn: async (data: z.infer<typeof staffFormSchema>) => {
      const response = await fetch(`/api/businesses/${businessId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      setIsAddingStaff(false);
      staffForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/staff`] });
      toast({
        title: "Success",
        description: "Staff member added successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add staff member",
      });
    },
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: number) => {
      const response = await fetch(`/api/businesses/${businessId}/staff/${staffId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      setStaffToDelete(null);
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/staff`] });
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete staff member",
      });
    },
  });

  // Edit staff mutation
  const editStaffMutation = useMutation({
    mutationFn: async (data: z.infer<typeof staffFormSchema> & { id: number }) => {
      const response = await fetch(`/api/businesses/${businessId}/staff/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      setIsEditingStaff(null);
      staffForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/staff`] });
      toast({
        title: "Success",
        description: "Staff member updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update staff member",
      });
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (isEditingStaff) {
      staffForm.reset({
        name: isEditingStaff.name,
        email: isEditingStaff.email,
        phone: isEditingStaff.phone || "",
        specialization: isEditingStaff.specialization || "",
        status: isEditingStaff.status || "active",
      });
    }
  }, [isEditingStaff, staffForm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Staff</h2>
        <Button onClick={() => setIsAddingStaff(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {staff.map((member) => (
          <Card key={member.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{member.name}</CardTitle>
                  <CardDescription>{member.specialization}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditingStaff(member)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setStaffToDelete(member)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span>{member.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{member.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    member.status === "active" && "bg-green-100 text-green-800",
                    member.status === "inactive" && "bg-gray-100 text-gray-800",
                    member.status === "on_leave" && "bg-yellow-100 text-yellow-800"
                  )}>
                    {member.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={isAddingStaff} onOpenChange={setIsAddingStaff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Add a new staff member to your business
            </DialogDescription>
          </DialogHeader>
          <Form {...staffForm}>
            <form onSubmit={staffForm.handleSubmit((data) => addStaffMutation.mutate(data))}>
              <div className="space-y-4">
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
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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
              </div>
              <div className="flex justify-end mt-6">
                <Button type="submit">Add Staff Member</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={!!isEditingStaff} onOpenChange={(open) => !open && setIsEditingStaff(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update the staff member's details
            </DialogDescription>
          </DialogHeader>
          <Form {...staffForm}>
            <form onSubmit={staffForm.handleSubmit((data) => 
              isEditingStaff && editStaffMutation.mutate({ ...data, id: isEditingStaff.id })
            )}>
              <div className="space-y-4">
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
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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
              </div>
              <div className="flex justify-end mt-6">
                <Button type="submit">Update Staff Member</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Staff Confirmation */}
      <AlertDialog open={!!staffToDelete} onOpenChange={(open) => !open && setStaffToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the staff member {staffToDelete?.name}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => staffToDelete && deleteStaffMutation.mutate(staffToDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function ServicesTab({ businessId }: { businessId: number }) {
  const { data: services = [], isLoading } = useQuery<SalonService[]>({
    queryKey: [`/api/businesses/${businessId}/services`],
    enabled: !!businessId,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddingService, setIsAddingService] = useState(false);
  const [isEditingService, setIsEditingService] = useState<SalonService | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<SalonService | null>(null);

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

  // Add service mutation
  const addServiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceFormSchema>) => {
      const response = await fetch(`/api/businesses/${businessId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      setIsAddingService(false);
      serviceForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/services`] });
      toast({
        title: "Success",
        description: "Service added successfully",
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

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const response = await fetch(`/api/businesses/${businessId}/services/${serviceId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      setServiceToDelete(null);
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/services`] });
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Service deletion error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete service",
      });
    },
  });

  // Edit service mutation
  const editServiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceFormSchema> & { id: number }) => {
      const response = await fetch(`/api/businesses/${businessId}/services/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      setIsEditingService(null);
      serviceForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/services`] });
      toast({
        title: "Success",
        description: "Service updated successfully",
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

  // Set form values when editing
  useEffect(() => {
    if (isEditingService) {
      serviceForm.reset({
        name: isEditingService.name,
        description: isEditingService.description || "",
        duration: isEditingService.duration,
        price: isEditingService.price,
        category: isEditingService.category,
        isActive: isEditingService.isActive,
      });
    }
  }, [isEditingService, serviceForm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Services</h2>
        <Button onClick={() => setIsAddingService(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{service.name}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditingService(service)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setServiceToDelete(service)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{service.duration} mins</span>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span>${service.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="capitalize">{service.category}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Service Dialog */}
      <Dialog open={isAddingService} onOpenChange={setIsAddingService}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
            <DialogDescription>
              Add a new service to your business
            </DialogDescription>
          </DialogHeader>
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit((data) => addServiceMutation.mutate(data))}>
              <div className="space-y-4">
                <FormField
                  control={serviceForm.control}
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
                <FormField
                  control={serviceForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hair">Hair</SelectItem>
                          <SelectItem value="spa">Spa</SelectItem>
                          <SelectItem value="nails">Nails</SelectItem>
                          <SelectItem value="beauty">Beauty</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end mt-6">
                <Button type="submit">Add Service</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={!!isEditingService} onOpenChange={() => setIsEditingService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update the service details
            </DialogDescription>
          </DialogHeader>
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit((data) =>
              isEditingService && editServiceMutation.mutate({ ...data, id: isEditingService.id })
            )}>
              <div className="space-y-4">
                <FormField
                  control={serviceForm.control}
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
                <FormField
                  control={serviceForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hair">Hair</SelectItem>
                          <SelectItem value="spa">Spa</SelectItem>
                          <SelectItem value="nails">Nails</SelectItem>
                          <SelectItem value="beauty">Beauty</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end mt-6">
                <Button type="submit">Update Service</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => serviceToDelete && deleteServiceMutation.mutate(serviceToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Update the BusinessDashboard component to use the ServicesTab
function BusinessDashboard({ businessId }: BusinessDashboardProps) {
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

  // Form setup
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

  // Data fetching
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
    enabled: !!businessId && business?.industryType === "salon" && (activeTab === 'shift-templates' || activeTab === 'roster'),
  });

  // Mutations
  const addServiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceFormSchema>) => {
      const response = await fetch(`/api/businesses/${businessId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      setIsAddingService(false);
      serviceForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/services`] });
      toast({
        title: "Success",
        description: "Service added successfully",
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

  const addStaffMutation = useMutation({
    mutationFn: async (data: z.infer<typeof staffFormSchema>) => {
      const response = await fetch(`/api/businesses/${businessId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      setIsAddingStaff(false);
      staffForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/staff`] });
      toast({
        title: "Success",
        description: "Staff member added successfully",
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
      const response = await fetch(`/api/businesses/${businessId}/services/${serviceId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      setServiceToDelete(null);
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/services`] });
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Service deletion error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete service",
      });
    },
  });

  const editServiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceFormSchema> & { id: number }) => {
      const response = await fetch(`/api/businesses/${businessId}/services/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      setIsEditingService(null);
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/services`] });
      toast({
        title: "Success",
        description: "Service updated successfully",
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

  // Add AlertDialog for delete confirmation
  const DeleteServiceDialog = () => (
    <AlertDialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Service</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this service? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => serviceToDelete && deleteServiceMutation.mutate(serviceToDelete.id)}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Add Dialog for editing service
  const EditServiceDialog = () => (
    <Dialog open={!!isEditingService} onOpenChange={() => setIsEditingService(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>
            Update the service details
          </DialogDescription>
        </DialogHeader>
        <Form {...serviceForm}><form onSubmit={serviceForm.handleSubmit((data) =>
            isEditingService && editServiceMutation.mutate({ ...data, id: isEditingService.id })
          )}>
          <div className="space-y-4">
            <FormField
              control={serviceForm.control}
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
            <FormField
              control={serviceForm.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end mt-6">
            <Button type="submit">Update Service</Button>
          </div>
        </form>
      </Form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-[400px]">
          <TabsTrigger value="services">
            <Package className="mr-2 h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="staff">
            <UserPlus className="mr-2 h-4 w-4" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="service-staff">
            <Users className="mr-2 h-4 w-4" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="roster">
            <CalendarDays className="mr-2 h-4 w-4" />
            Roster
          </TabsTrigger>
          <TabsTrigger value="shift-templates">
            <Calendar className="mr-2 h-4 w-4" />
            Shift Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-6">
          <ServicesTab businessId={businessId} />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <StaffTab businessId={businessId}/>
        </TabsContent>

        <TabsContent value="service-staff">
          <ServiceStaffTab
            businessId={businessId}
            industryType={business?.industryType}
          />
        </TabsContent>

        <TabsContent value="roster">
          <RosterTabUpdated
            businessId={businessId}
            staff={staff}
            templates={templates}
            isLoadingStaff={isLoadingStaff}
            isLoadingTemplates={isLoadingTemplates}
          />
        </TabsContent>
        <TabsContent value="shift-templates" className="mt-6">
          {/* Shift Templates Tab Content */}
          <div>
            {/*Existing Shift Templates code here*/}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { ServiceStaffTab, RosterTabUpdated, StaffTab };
export default BusinessDashboard;