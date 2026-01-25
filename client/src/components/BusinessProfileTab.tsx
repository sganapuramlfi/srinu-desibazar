import { useState, useEffect } from "react";
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
import { type Business, businessProfileSchema } from "../types/db";
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
  Facebook,
  Instagram,
  Twitter,
  Globe,
} from "lucide-react";

type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;

const defaultAmenities = [
  { name: "Free Wi-Fi", icon: "Wifi", enabled: false },
  { name: "Free Parking", icon: "Car", enabled: false },
  { name: "Card Payment", icon: "CreditCard", enabled: false },
  { name: "Refreshments", icon: "Coffee", enabled: false },
];

const defaultOperatingHours = {
  monday: { open: "09:00", close: "18:00", isOpen: true },
  tuesday: { open: "09:00", close: "18:00", isOpen: true },
  wednesday: { open: "09:00", close: "18:00", isOpen: true },
  thursday: { open: "09:00", close: "18:00", isOpen: true },
  friday: { open: "09:00", close: "18:00", isOpen: true },
  saturday: { open: "10:00", close: "16:00", isOpen: true },
  sunday: { open: "10:00", close: "16:00", isOpen: false },
};

interface BusinessProfileTabProps {
  businessId: number;
}

export function BusinessProfileTab({ businessId }: BusinessProfileTabProps) {
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: business, isLoading } = useQuery<Business>({
    queryKey: [`/api/businesses/${businessId}/profile`],
    enabled: !!businessId,
  });

  const form = useForm<BusinessProfileFormData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      name: "",
      description: "",
      logo: "",
      socialMedia: {
        facebook: "",
        instagram: "",
        twitter: "",
        website: "",
      },
      contactInfo: {
        phone: "",
        email: "",
        address: "",
      },
      operatingHours: defaultOperatingHours,
      amenities: defaultAmenities,
    },
  });

  useEffect(() => {
    if (business) {
      form.reset({
        name: business.name || "",
        description: business.description || "",
        socialMedia: business.socialMedia || {
          facebook: "",
          instagram: "",
          twitter: "",
          website: "",
        },
        contactInfo: business.contactInfo || {
          phone: "",
          email: "",
          address: "",
        },
        operatingHours: business.operatingHours || defaultOperatingHours,
        amenities: business.amenities || defaultAmenities,
      });
    }
  }, [business, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/api/businesses/${businessId}/profile`, {
        method: "PUT",
        body: data,
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

  const onSubmit = async (data: BusinessProfileFormData) => {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));

    if (selectedLogo) {
      formData.append("logo", selectedLogo);
    }

    selectedGalleryImages.forEach((file) => {
      formData.append("gallery", file);
    });

    updateProfileMutation.mutate(formData);
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedLogo(file);
    }
  };

  const handleGalleryImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedGalleryImages((prev) => [...prev, ...files]);
  };

  const removeGalleryImage = (index: number) => {
    setSelectedGalleryImages((prev) => prev.filter((_, i) => i !== index));
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
                      <Input {...field} value={field.value || ""} />
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
                      <Textarea {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Logo</FormLabel>
                <div className="mt-2 flex items-center gap-4">
                  {business?.logo && !selectedLogo && (
                    <img
                      src={business.logo}
                      alt="Business logo"
                      className="h-16 w-16 object-contain rounded-lg border"
                    />
                  )}
                  {selectedLogo && (
                    <img
                      src={URL.createObjectURL(selectedLogo)}
                      alt="Selected logo"
                      className="h-16 w-16 object-contain rounded-lg border"
                    />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("logo-upload")?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    {selectedLogo ? "Change Logo" : "Upload Logo"}
                  </Button>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
              <CardDescription>
                Add your social media links (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="socialMedia.facebook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Facebook className="h-4 w-4" />
                      Facebook
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://facebook.com/your-page" value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialMedia.instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://instagram.com/your-profile" value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialMedia.twitter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" />
                      Twitter
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://twitter.com/your-profile" value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialMedia.website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://your-website.com" value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

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
                      <Input {...field} value={field.value || ""} />
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
                      <Input {...field} type="email" value={field.value || ""} />
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
                      <Textarea {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

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
                                  value={field.value || ""}
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
                                  value={field.value || ""}
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
              type="button"
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
              onChange={handleGalleryImagesChange}
            />
            {selectedGalleryImages.length > 0 && (
              <div className="flex items-center gap-2">
                <Button type="button" onClick={() => {}}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {selectedGalleryImages.length} Images
                </Button>
                <div className="grid grid-cols-3 gap-4">
                  {selectedGalleryImages.map((file, index) => (
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
                        onClick={() => removeGalleryImage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}