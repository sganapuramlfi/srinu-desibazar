import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { breakTimeSchema, shiftTemplateSchema } from "../types/db";

type ShiftTemplateFormData = z.infer<typeof shiftTemplateSchema>;
type Break = z.infer<typeof breakTimeSchema>;

interface ShiftTemplatesTabProps {
  businessId: number;
}

const BREAK_TYPES = ["lunch", "coffee", "rest"] as const;

export function ShiftTemplatesTab({ businessId }: ShiftTemplatesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplateFormData | null>(null);
  const [breaks, setBreaks] = useState<Break[]>([]);

  const { data: templates = [], isLoading } = useQuery<ShiftTemplateFormData[]>({
    queryKey: [`/api/businesses/${businessId}/shift-templates`],
  });

  const form = useForm<ShiftTemplateFormData>({
    resolver: zodResolver(shiftTemplateSchema),
    defaultValues: {
      name: "",
      startTime: "09:00",
      endTime: "17:00",
      breaks: [],
      daysOfWeek: [0, 1, 2, 3, 4], // Monday to Friday
      color: "#000000",
      isActive: true,
    },
  });

  const addBreak = () => {
    setBreaks([
      ...breaks,
      {
        startTime: "12:00",
        endTime: "13:00",
        type: "lunch",
        duration: 60,
      },
    ]);
  };

  const removeBreak = (index: number) => {
    setBreaks(breaks.filter((_, i) => i !== index));
  };

  const updateBreak = (index: number, field: keyof Break, value: string | number) => {
    const updatedBreaks = [...breaks];
    updatedBreaks[index] = {
      ...updatedBreaks[index],
      [field]: value,
    };

    // Auto-calculate duration when start or end time changes
    if (field === 'startTime' || field === 'endTime') {
      const start = parseTime(updatedBreaks[index].startTime);
      const end = parseTime(updatedBreaks[index].endTime);
      if (start && end) {
        const durationInMinutes = (end - start) / (1000 * 60);
        updatedBreaks[index].duration = durationInMinutes;
      }
    }

    setBreaks(updatedBreaks);
  };

  // Helper function to parse time string to Date object
  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const createTemplateMutation = useMutation({
    mutationFn: async (data: ShiftTemplateFormData) => {
      const response = await fetch(
        `/api/businesses/${businessId}/shift-templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, breaks }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/businesses/${businessId}/shift-templates`],
      });
      form.reset();
      setBreaks([]);
      toast({
        title: "Success",
        description: "Shift template created successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create shift template",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: ShiftTemplateFormData;
    }) => {
      const response = await fetch(
        `/api/businesses/${businessId}/shift-templates/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, breaks }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/businesses/${businessId}/shift-templates`],
      });
      setEditingTemplate(null);
      form.reset();
      setBreaks([]);
      toast({
        title: "Success",
        description: "Shift template updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update shift template",
      });
    },
  });

  const handleSubmit = (data: ShiftTemplateFormData) => {
    const formData = { ...data, breaks };
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id!, data: formData });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingTemplate ? "Edit Shift Template" : "Create New Shift Template"}
          </CardTitle>
          <CardDescription>
            Define shift timings and breaks for staff scheduling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Morning Shift" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel>Breaks</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBreak}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Break
                  </Button>
                </div>

                {breaks.map((breakItem, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 items-end">
                    <div>
                      <FormLabel className="text-sm">Start</FormLabel>
                      <Input
                        type="time"
                        value={breakItem.startTime}
                        onChange={(e) =>
                          updateBreak(index, "startTime", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <FormLabel className="text-sm">End</FormLabel>
                      <Input
                        type="time"
                        value={breakItem.endTime}
                        onChange={(e) =>
                          updateBreak(index, "endTime", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <FormLabel className="text-sm">Type</FormLabel>
                      <Select
                        value={breakItem.type}
                        onValueChange={(value) =>
                          updateBreak(index, "type", value as Break["type"])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BREAK_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeBreak(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                {editingTemplate ? "Update Template" : "Create Template"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 border rounded-lg space-y-2"
                style={{ borderLeftColor: template.color, borderLeftWidth: 4 }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{template.name}</h3>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingTemplate(template);
                      setBreaks(template.breaks || []);
                      form.reset({
                        name: template.name,
                        startTime: template.startTime,
                        endTime: template.endTime,
                        daysOfWeek: template.daysOfWeek,
                        color: template.color,
                        isActive: template.isActive,
                      });
                    }}
                  >
                    Edit
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {template.startTime} - {template.endTime}
                </p>
                {template.breaks && template.breaks.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">Breaks:</p>
                    <ul className="list-disc list-inside">
                      {template.breaks.map((breakItem, index) => (
                        <li key={index}>
                          {breakItem.type}: {breakItem.startTime} - {breakItem.endTime} ({breakItem.duration} min)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}