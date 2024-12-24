import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Clock,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
  Upload,
  Wifi,
  Car,
  CreditCard,
  Coffee,
} from "lucide-react";

const businessProfileSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  logo: z.string().optional(),
  contactInfo: z.object({
    phone: z.string().min(10, "Phone number must be at least 10 characters"),
    email: z.string().email("Invalid email address"),
    address: z.string().min(5, "Address must be at least 5 characters"),
  }),
  operatingHours: z.object({
    monday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean(),
    }),
    tuesday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean(),
    }),
    wednesday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean(),
    }),
    thursday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean(),
    }),
    friday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean(),
    }),
    saturday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean(),
    }),
    sunday: z.object({
      open: z.string(),
      close: z.string(),
      isOpen: z.boolean(),
    }),
  }),
  amenities: z.array(
    z.object({
      name: z.string(),
      icon: z.string(),
      enabled: z.boolean(),
    })
  ),
});

type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;

const defaultAmenities = [
  { name: "Free Wi-Fi", icon: "Wifi", enabled: false },
  { name: "Free Parking", icon: "Car", enabled: false },
  { name: "Card Payment", icon: "CreditCard", enabled: false },
  { name: "Refreshments", icon: "Coffee", enabled: false },
];

interface BusinessProfileTabProps {
  businessId: number;
}

export function BusinessProfileTab({ businessId }: BusinessProfileTabProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch business profile data
  const { data: business, isLoading } = useQuery({
    queryKey: [`/api/businesses/${businessId}/profile`],
    enabled: !!businessId,
  });

  const form = useForm<BusinessProfileFormData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      name: business?.name || "",
      description: business?.description || "",
      logo: business?.logo || "",
      contactInfo: business?.contactInfo || {
        phone: "",
        email: "",
        address: "",
      },
      operatingHours: business?.operatingHours || {
        monday: { open: "09:00", close: "18:00", isOpen: true },
        tuesday: { open: "09:00", close: "18:00", isOpen: true },
        wednesday: { open: "09:00", close: "18:00", isOpen: true },
        thursday: { open: "09:00", close: "18:00", isOpen: true },
        friday: { open: "09:00", close: "18:00", isOpen: true },
        saturday: { open: "10:00", close: "16:00", isOpen: true },
        sunday: { open: "10:00", close: "16:00", isOpen: false },
      },
      amenities: business?.amenities || defaultAmenities,
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: BusinessProfileFormData) => {
      const response = await fetch(`/api/businesses/${businessId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/profile`] });
      toast({
        title: "Success",
        description: "Business profile updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    },
  });

  // Upload gallery images mutation
  const uploadImagesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));

      const response = await fetch(`/api/businesses/${businessId}/gallery`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      setSelectedImages([]);
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/gallery`] });
      toast({
        title: "Success",
        description: "Images uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to upload images",
      });
    },
  });

  const onSubmit = (data: BusinessProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedImages(files);
  };

  const uploadImages = () => {
    if (selectedImages.length > 0) {
      uploadImagesMutation.mutate(selectedImages);
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
    <div className="p-6 space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your business profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/logo.png" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Update your contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="contactInfo.phone"
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
                control={form.control}
                name="contactInfo.email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactInfo.address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Operating Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Operating Hours</CardTitle>
              <CardDescription>
                Set your business hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(form.watch("operatingHours")).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-24 font-medium capitalize">{day}</div>
                    <FormField
                      control={form.control}
                      name={`operatingHours.${day}.isOpen`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <span className="text-sm text-muted-foreground">
                            {field.value ? "Open" : "Closed"}
                          </span>
                        </FormItem>
                      )}
                    />
                    {form.watch(`operatingHours.${day}.isOpen`) && (
                      <>
                        <FormField
                          control={form.control}
                          name={`operatingHours.${day}.open`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="time"
                                  {...field}
                                  className="w-32"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span>to</span>
                        <FormField
                          control={form.control}
                          name={`operatingHours.${day}.close`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="time"
                                  {...field}
                                  className="w-32"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
              <CardDescription>
                Select the amenities available at your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {form.watch("amenities").map((amenity, index) => (
                  <FormField
                    key={amenity.name}
                    control={form.control}
                    name={`amenities.${index}.enabled`}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="flex items-center gap-2">
                          {amenity.icon === "Wifi" && <Wifi className="h-4 w-4" />}
                          {amenity.icon === "Car" && <Car className="h-4 w-4" />}
                          {amenity.icon === "CreditCard" && (
                            <CreditCard className="h-4 w-4" />
                          )}
                          {amenity.icon === "Coffee" && (
                            <Coffee className="h-4 w-4" />
                          )}
                          <span>{amenity.name}</span>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full"
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </form>
      </Form>

      {/* Gallery Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Gallery</CardTitle>
          <CardDescription>
            Upload images to showcase your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => document.getElementById("gallery-upload")?.click()}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Select Images
            </Button>
            <Input
              id="gallery-upload"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            {selectedImages.length > 0 && (
              <Button
                onClick={uploadImages}
                disabled={uploadImagesMutation.isPending}
              >
                {uploadImagesMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload {selectedImages.length} Images
              </Button>
            )}
          </div>
          {selectedImages.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {selectedImages.map((file, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg border bg-muted"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Selected ${index + 1}`}
                    className="object-cover w-full h-full rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() =>
                      setSelectedImages((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
