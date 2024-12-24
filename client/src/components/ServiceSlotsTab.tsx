import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock } from "lucide-react";

interface ServiceSlotsTabProps {
  businessId: number;
  staff: Array<{
    id: number;
    name: string;
    specialization?: string;
  }>;
  services: Array<{
    id: number;
    name: string;
    duration: number;
  }>;
}

export const ServiceSlotsTab = ({
  businessId,
  staff,
  services,
}: ServiceSlotsTabProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch slots for the selected date
  const { data: slots = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: [
      `/api/businesses/${businessId}/slots`,
      {
        startDate: format(selectedDate, 'yyyy-MM-dd'),
        endDate: format(selectedDate, 'yyyy-MM-dd'),
      },
    ],
    enabled: !!businessId && !!selectedDate,
  });

  // Auto-generate slots mutation
  const generateSlotsMutation = useMutation({
    mutationFn: async (data: { startDate: string; endDate: string }) => {
      const response = await fetch(
        `/api/businesses/${businessId}/slots/auto-generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/businesses/${businessId}/slots`],
      });
      toast({
        title: "Success",
        description: "Slots have been generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate slots",
      });
    },
  });

  // Manual slot creation mutation
  const createManualSlotMutation = useMutation({
    mutationFn: async (data: {
      serviceId: number;
      staffId: number;
      startTime: string;
      endTime: string;
    }) => {
      const response = await fetch(
        `/api/businesses/${businessId}/slots/manual`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/businesses/${businessId}/slots`],
      });
      toast({
        title: "Success",
        description: "Slot has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create slot",
      });
    },
  });

  const handleAutoGenerate = () => {
    const startDate = format(selectedDate, 'yyyy-MM-dd');
    generateSlotsMutation.mutate({
      startDate,
      endDate: startDate,
    });
  };

  if (isLoadingSlots) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Slots Management</CardTitle>
          <CardDescription>
            Manage service slots for your staff based on roster and service mappings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Date Selection and Auto-generate */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </div>
              <div className="flex-1 space-y-4">
                <Button
                  onClick={handleAutoGenerate}
                  disabled={generateSlotsMutation.isPending}
                  className="w-full"
                >
                  {generateSlotsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Auto-generate Slots for Selected Date
                </Button>
                
                {/* Manual Slot Creation Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Create Manual Slot</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Staff</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            {staff.map((member) => (
                              <SelectItem key={member.id} value={member.id.toString()}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Service</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map((service) => (
                              <SelectItem key={service.id} value={service.id.toString()}>
                                {service.name} ({service.duration} min)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="submit"
                        disabled={createManualSlotMutation.isPending}
                        className="w-full"
                      >
                        {createManualSlotMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Slot
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Slots Display */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Available Slots</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map((slot) => (
                  <Card key={slot.id} className="bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{slot.service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {slot.staff.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            {format(new Date(slot.startTime), "HH:mm")} -{" "}
                            {format(new Date(slot.endTime), "HH:mm")}
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              slot.status === "available"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {slot.status}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
