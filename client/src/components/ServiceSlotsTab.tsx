import { useState, useMemo } from "react";
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
import { format, startOfDay, endOfDay } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";

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

interface Slot {
  id: number;
  startTime: string;
  endTime: string;
  displayTime: string;
  status: "available" | "booked" | "blocked";
  service: {
    id: number;
    name: string;
    duration: number;
    price: number;
  };
  staff: {
    id: number;
    name: string;
  };
  shift: {
    startTime: string;
    endTime: string;
    type: string;
    displayTime: string;
  };
  generatedFor: string;
  conflictingSlotIds?: number[];
}

export function ServiceSlotsTab({
  businessId,
  staff,
  services,
}: ServiceSlotsTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper function to safely format dates
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "HH:mm");
    } catch (error) {
      console.error("Error formatting date:", dateString);
      return "--:--";
    }
  };

  // Get slots query with proper error handling
  const { data: slots = [], isLoading: isLoadingSlots, error: slotsError } = useQuery({
    queryKey: [
      `/api/businesses/${businessId}/slots`,
      {
        startDate: format(startOfDay(selectedDate), "yyyy-MM-dd"),
        endDate: format(endOfDay(selectedDate), "yyyy-MM-dd"),
        staffId: selectedStaff === "all" ? undefined : selectedStaff,
        serviceId: selectedService === "all" ? undefined : selectedService,
      },
    ],
    enabled: !!businessId,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1,
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error loading slots",
        description: error.message || "Failed to load service slots",
      });
    }
  });

  // Auto-generate slots mutation
  const generateSlotsMutation = useMutation({
    mutationFn: async () => {
      const startDate = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/businesses/${businessId}/slots/auto-generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            startDate,
            endDate: startDate,
          }),
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
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate slots",
      });
    },
  });

  // Memoize grouped slots to avoid unnecessary recalculations
  const groupedSlots = useMemo(() => {
    if (!Array.isArray(slots)) return {};

    return slots.reduce((acc: Record<number, { staff: Slot['staff']; slots: Slot[] }>, slot) => {
      const staffId = slot.staff.id;
      if (!acc[staffId]) {
        acc[staffId] = {
          staff: slot.staff,
          slots: [],
        };
      }
      acc[staffId].slots.push(slot);
      return acc;
    }, {});
  }, [slots]);

  if (isLoadingSlots) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (slotsError) {
    return (
      <div className="p-6">
        <Card className="bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-center text-destructive">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span>Failed to load service slots</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Slots Management</CardTitle>
          <CardDescription>
            View and manage service slots based on your staff roster and service mappings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Calendar and filters section */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Select a date to view available slots
                </p>
              </div>
              <div className="flex-1 space-y-4">
                <Button
                  onClick={() => generateSlotsMutation.mutate()}
                  disabled={generateSlotsMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {generateSlotsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Auto-generate Slots for Selected Date
                </Button>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Filter Slots</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Staff Member</label>
                      <Select
                        value={selectedStaff}
                        onValueChange={setSelectedStaff}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All staff members</SelectItem>
                          {staff.map((member) => (
                            <SelectItem
                              key={member.id}
                              value={member.id.toString()}
                            >
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Service</label>
                      <Select
                        value={selectedService}
                        onValueChange={setSelectedService}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All services</SelectItem>
                          {services.map((service) => (
                            <SelectItem
                              key={service.id}
                              value={service.id.toString()}
                            >
                              {service.name} ({service.duration} min)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Available slots section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Available Slots</h3>
                <div className="text-sm text-muted-foreground">
                  {format(selectedDate, "MMMM d, yyyy")}
                </div>
              </div>

              {Object.keys(groupedSlots).length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center text-muted-foreground">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      <span>No slots available for the selected date</span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[600px] rounded-md border">
                  {Object.values(groupedSlots).map(({ staff, slots }) => (
                    <div key={staff.id} className="p-4 border-b last:border-b-0">
                      <h4 className="text-lg font-semibold mb-4">{staff.name}</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Shift</TableHead>
                            <TableHead>Generated For</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Conflicts</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {slots.map((slot) => (
                            <TableRow key={slot.id}>
                              <TableCell>{slot.displayTime}</TableCell>
                              <TableCell>{slot.service.name}</TableCell>
                              <TableCell>{slot.service.duration} min</TableCell>
                              <TableCell>{slot.shift.displayTime}</TableCell>
                              <TableCell>
                                {new Date(slot.generatedFor).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    slot.status === "available"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {slot.status}
                                </span>
                              </TableCell>
                              <TableCell>
                                {slot.conflictingSlotIds?.length ? (
                                  <span className="text-amber-600 text-sm">
                                    {slot.conflictingSlotIds.length} conflicts
                                  </span>
                                ) : (
                                  <span className="text-green-600 text-sm">
                                    None
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}