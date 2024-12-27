import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ShiftTemplate } from "@db/schema";

const shiftTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  breakDuration: z.coerce.number().min(0, "Break duration must be positive"),
  daysOfWeek: z.array(z.string()).min(1, "Select at least one day"),
  color: z.string(),
});

type ShiftTemplateFormData = z.infer<typeof shiftTemplateSchema>;

interface ShiftTemplatesTabProps {
  businessId: number;
}

export function ShiftTemplatesTab({ businessId }: ShiftTemplatesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery<ShiftTemplate[]>({
    queryKey: [`/api/businesses/${businessId}/shift-templates`],
  });

  const form = useForm<ShiftTemplateFormData>({
    resolver: zodResolver(shiftTemplateSchema),
    defaultValues: {
      name: "",
      startTime: "09:00",
      endTime: "17:00",
      breakDuration: 60,
      daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      color: "#000000",
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: ShiftTemplateFormData) => {
      const response = await fetch(
        `/api/businesses/${businessId}/shift-templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        queryKey: [`/api/businesses/${businessId}/shift-templates`],
      });
      form.reset();
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
        queryKey: [`/api/businesses/${businessId}/shift-templates`],
      });
      setEditingTemplate(null);
      form.reset();
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
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
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

              <FormField
                control={form.control}
                name="breakDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Break Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                className="p-4 border rounded-lg flex items-center justify-between"
                style={{ borderLeftColor: template.color, borderLeftWidth: 4 }}
              >
                <div>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {template.startTime} - {template.endTime} ({template.breakDuration}
                    min break)
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingTemplate(template);
                    form.reset({
                      name: template.name,
                      startTime: template.startTime,
                      endTime: template.endTime,
                      breakDuration: template.breakDuration,
                      daysOfWeek: template.daysOfWeek as string[],
                      color: template.color,
                    });
                  }}
                >
                  Edit
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
