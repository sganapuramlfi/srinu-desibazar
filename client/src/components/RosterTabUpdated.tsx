import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Clock, Coffee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Add ShiftTemplateLegend component
const ShiftTemplateLegend = ({ templates }) => {
  return (
    <div className="flex flex-wrap gap-4 items-start mb-6">
      <span className="text-sm font-medium">Shift Templates:</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
        {templates.map((template) => (
          <div
            key={template.id}
            className={cn(
              "p-3 rounded-lg border",
              template.type === "regular" && "bg-blue-50 border-blue-200",
              template.type === "overtime" && "bg-orange-50 border-orange-200",
              template.type === "holiday" && "bg-green-50 border-green-200",
              template.type === "leave" && "bg-red-50 border-red-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{template.name}</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>Time:</span>
                <span>{template.startTime} - {template.endTime}</span>
              </div>
              {template.breaks && template.breaks.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Coffee className="h-3 w-3" />
                  <span>Breaks:</span>
                  {template.breaks.map((breakTime, idx) => (
                    <span key={idx} className="text-xs">
                      {breakTime.startTime}-{breakTime.endTime}
                      {idx < template.breaks.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
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

export const RosterTabUpdated = ({
  businessId,
  staff,
  templates,
  isLoadingStaff,
  isLoadingTemplates
}: RosterTabProps) => {
  const [viewStartDate, setViewStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
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
      {/* Shift Template Legend */}
      <ShiftTemplateLegend templates={templates} />

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
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{template.startTime} - {template.endTime}</span>
                                </div>
                                {template.breaks && template.breaks.length > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Coffee className="h-3 w-3" />
                                    <span>
                                      {template.breaks.map((breakTime, idx) => (
                                        <span key={idx}>
                                          {breakTime.startTime}-{breakTime.endTime}
                                          {idx < template.breaks.length - 1 ? ", " : ""}
                                        </span>
                                      ))}
                                    </span>
                                  </div>
                                )}
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

interface SalonStaff {
  id: number;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  status: "active" | "inactive" | "on_leave";
}

interface ShiftTemplate {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  type: string;
  breaks?: { startTime: string; endTime: string }[];
}

interface RosterShift {
  id: number;
  staffId: number;
  templateId: number;
  date: string;
  status: "scheduled" | "working" | "completed" | "leave" | "sick" | "absent";
}