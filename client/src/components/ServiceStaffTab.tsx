import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { SalonStaff, SalonService, StaffSkill, StaffSkillResponse } from "@/types/salon";

interface Props {
  businessId: number;
  industryType?: string;
}

export const ServiceStaffTab = ({ businessId, industryType }: Props) => {
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

  const { data: services = [], isLoading: isLoadingServices } = useQuery<SalonService[]>({
    queryKey: [`/api/businesses/${businessId}/services`],
    enabled: !!businessId,
  });

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<SalonStaff[]>({
    queryKey: [`/api/businesses/${businessId}/staff`],
    enabled: !!businessId,
  });

  // Update selected services when staff is selected
  useEffect(() => {
    if (selectedStaff) {
      const staffSkills = staffSkillsResponse
        .filter(response => response.salon_staff.id === selectedStaff.id)
        .map(response => response.staff_skills.serviceId);
      setSelectedServiceIds(staffSkills);
    } else {
      setSelectedServiceIds([]);
    }
  }, [selectedStaff, staffSkillsResponse]);

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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update staff services');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/staff-skills`] });
      toast({
        title: "Success",
        description: "Staff services have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update staff services",
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleSaveAssignments = async () => {
    if (!selectedStaff) return;

    setIsUpdating(true);
    try {
      // Validate service IDs exist
      const validServiceIds = selectedServiceIds.filter(id => 
        services.some(service => service.id === id)
      );

      await updateSkillsMutation.mutateAsync({
        staffId: selectedStaff.id,
        serviceIds: validServiceIds,
      });
    } catch (error) {
      console.error('Error updating staff skills:', error);
    }
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
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedStaff?.id === member.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                )}
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
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-colors",
                      selectedServiceIds.includes(service.id)
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    )}
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
    </div>
  );
};