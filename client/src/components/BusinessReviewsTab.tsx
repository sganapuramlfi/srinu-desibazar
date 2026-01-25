import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, 
  MessageCircle, 
  Flag, 
  Reply, 
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BusinessReview {
  id: number;
  businessId: number;
  customerId?: number;
  rating: number;
  title?: string;
  comment?: string;
  customerName?: string;
  customerEmail?: string;
  businessResponse?: string;
  respondedAt?: string;
  respondedBy?: number;
  source: string;
  isVerified: boolean;
  isPublished: boolean;
  responseStatus: "pending" | "responded" | "flagged" | "ignored";
  flagReason?: string;
  reviewDate: string;
  customer?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface ReviewTemplate {
  id: number;
  businessId: number;
  name: string;
  category: "positive" | "negative" | "neutral" | "complaint" | "compliment";
  template: string;
  description?: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

interface ReviewStats {
  overview: {
    totalReviews: number;
    averageRating: string;
    responseRate: number;
    pendingResponses: number;
    recentReviews: number;
  };
  ratingDistribution: {
    [key: string]: number;
  };
  responseStats: {
    total: number;
    pending: number;
    rate: number;
  };
}

interface BusinessReviewsTabProps {
  businessId: number;
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500", variant: "default" as const },
  responded: { label: "Responded", color: "bg-green-500", variant: "secondary" as const },
  flagged: { label: "Flagged", color: "bg-red-500", variant: "destructive" as const },
  ignored: { label: "Ignored", color: "bg-gray-500", variant: "outline" as const },
};

export function BusinessReviewsTab({ businessId }: BusinessReviewsTabProps) {
  const [activeTab, setActiveTab] = useState("reviews");
  const [selectedReview, setSelectedReview] = useState<BusinessReview | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [filters, setFilters] = useState({
    status: "all",
    rating: "all",
    responded: "all"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch reviews with filters
  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: [`/api/businesses/${businessId}/reviews`, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "all") params.append(key, value);
      });
      params.append("limit", "20");
      
      const response = await fetch(`/api/businesses/${businessId}/reviews?${params}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
    enabled: !!businessId,
  });

  // Fetch review statistics
  const { data: reviewStats } = useQuery<ReviewStats>({
    queryKey: [`/api/businesses/${businessId}/reviews/stats`],
    enabled: !!businessId,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Fetch review templates
  const { data: templates = [] } = useQuery<ReviewTemplate[]>({
    queryKey: [`/api/businesses/${businessId}/review-templates`],
    enabled: !!businessId && activeTab === "templates",
  });

  // Respond to review mutation
  const respondToReviewMutation = useMutation({
    mutationFn: async ({ reviewId, response, templateId }: { reviewId: number; response: string; templateId?: number }) => {
      const responseData = await fetch(`/api/businesses/${businessId}/reviews/${reviewId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, templateId }),
      });
      if (!responseData.ok) throw new Error('Failed to respond to review');
      return responseData.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/reviews`] });
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/reviews/stats`] });
      setIsResponseDialogOpen(false);
      setResponseText("");
      setSelectedTemplate("");
      toast({ title: "Success", description: "Review response submitted successfully" });
    },
  });

  // Flag review mutation
  const flagReviewMutation = useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: number; reason: string }) => {
      const response = await fetch(`/api/businesses/${businessId}/reviews/${reviewId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to flag review');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/reviews`] });
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/reviews/stats`] });
      setIsFlagDialogOpen(false);
      toast({ title: "Success", description: "Review flagged successfully" });
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: Partial<ReviewTemplate>) => {
      const response = await fetch(`/api/businesses/${businessId}/review-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/review-templates`] });
      setIsTemplateDialogOpen(false);
      toast({ title: "Success", description: "Template created successfully" });
    },
  });

  const handleRespondToReview = (review: BusinessReview) => {
    setSelectedReview(review);
    setResponseText("");
    setSelectedTemplate("");
    setIsResponseDialogOpen(true);
  };

  const handleFlagReview = (review: BusinessReview) => {
    setSelectedReview(review);
    setIsFlagDialogOpen(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id.toString() === templateId);
    if (template) {
      setResponseText(template.template);
      setSelectedTemplate(templateId);
    }
  };

  const submitResponse = () => {
    if (selectedReview && responseText.trim()) {
      respondToReviewMutation.mutate({
        reviewId: selectedReview.id,
        response: responseText.trim(),
        templateId: selectedTemplate ? parseInt(selectedTemplate) : undefined
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Review Statistics Dashboard */}
      {reviewStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Reviews</p>
                  <p className="text-2xl font-bold">{reviewStats.overview.totalReviews}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <div className="flex items-center gap-1">
                    <p className="text-2xl font-bold">{reviewStats.overview.averageRating}</p>
                    <div className="flex">
                      {renderStars(Math.round(parseFloat(reviewStats.overview.averageRating)))}
                    </div>
                  </div>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
                  <p className="text-2xl font-bold">{reviewStats.overview.responseRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Responses</p>
                  <p className="text-2xl font-bold">{reviewStats.overview.pendingResponses}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recent Reviews</p>
                  <p className="text-2xl font-bold">{reviewStats.overview.recentReviews}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Review Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Review Management
              </CardTitle>
              <CardDescription>Manage customer reviews and build your online reputation</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reviews">Reviews ({reviewStats?.overview.totalReviews || 0})</TabsTrigger>
              <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reviews" className="mt-4">
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({...prev, status: value}))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.rating} onValueChange={(value) => setFilters(prev => ({...prev, rating: value}))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.responded} onValueChange={(value) => setFilters(prev => ({...prev, responded: value}))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Response status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reviews</SelectItem>
                    <SelectItem value="true">Responded</SelectItem>
                    <SelectItem value="false">Not Responded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reviews Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewsData?.reviews?.map((review: BusinessReview) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {review.customer?.fullName || review.customerName || "Anonymous"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {review.source} • {review.isVerified && "Verified"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                          <span className="ml-1 text-sm font-medium">{review.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div>
                          {review.title && (
                            <div className="font-medium text-sm mb-1">{review.title}</div>
                          )}
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {review.comment || "No comment provided"}
                          </div>
                          {review.businessResponse && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                              <strong>Your response:</strong> {review.businessResponse}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(review.reviewDate)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={statusConfig[review.responseStatus]?.variant || "default"}
                          className={`${statusConfig[review.responseStatus]?.color || "bg-gray-500"} text-white`}
                        >
                          {statusConfig[review.responseStatus]?.label || review.responseStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!review.businessResponse && (
                            <Button
                              size="sm"
                              onClick={() => handleRespondToReview(review)}
                              className="bg-blue-500 hover:bg-blue-600"
                            >
                              <Reply className="h-4 w-4 mr-1" />
                              Respond
                            </Button>
                          )}
                          {review.responseStatus !== "flagged" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFlagReview(review)}
                            >
                              <Flag className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="templates" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Response Templates</h3>
                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Response Template</DialogTitle>
                      <DialogDescription>Create a reusable template for responding to reviews</DialogDescription>
                    </DialogHeader>
                    <TemplateForm businessId={businessId} onSubmit={createTemplateMutation.mutate} />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <Badge variant="outline" className="mt-1">
                            {template.category}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Used {template.usageCount} times
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                      <div className="bg-muted p-3 rounded text-sm">
                        {template.template}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              {reviewStats && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Rating Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = reviewStats.ratingDistribution[rating.toString()] || 0;
                          const percentage = reviewStats.overview.totalReviews > 0 
                            ? (count / reviewStats.overview.totalReviews) * 100 
                            : 0;
                          
                          return (
                            <div key={rating} className="flex items-center gap-3">
                              <div className="flex items-center gap-1 w-20">
                                <span className="text-sm font-medium">{rating}</span>
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              </div>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-yellow-400 h-2 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="text-sm text-muted-foreground w-16 text-right">
                                {count} ({percentage.toFixed(1)}%)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
            <DialogDescription>
              Respond to {selectedReview?.customer?.fullName || selectedReview?.customerName || "this customer"}'s review
            </DialogDescription>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedReview.rating)}
                  <span className="font-medium">{selectedReview.rating}/5</span>
                </div>
                {selectedReview.title && (
                  <h4 className="font-medium mb-2">{selectedReview.title}</h4>
                )}
                <p className="text-sm">{selectedReview.comment}</p>
              </div>

              <div>
                <Label htmlFor="template-select">Use Template (Optional)</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a response template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name} ({template.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="response">Your Response</Label>
                <Textarea
                  id="response"
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write your response to this review..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResponseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitResponse}
              disabled={!responseText.trim() || respondToReviewMutation.isPending}
            >
              {respondToReviewMutation.isPending ? "Submitting..." : "Submit Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Review</DialogTitle>
            <DialogDescription>
              Flag this review for inappropriate content or spam
            </DialogDescription>
          </DialogHeader>
          
          <FlagForm 
            onSubmit={(reason) => {
              if (selectedReview) {
                flagReviewMutation.mutate({ reviewId: selectedReview.id, reason });
              }
            }}
            isLoading={flagReviewMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Template creation form component
interface TemplateFormProps {
  businessId: number;
  onSubmit: (data: any) => void;
}

function TemplateForm({ businessId, onSubmit }: TemplateFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit({
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      template: formData.get('template') as string,
      description: formData.get('description') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Template Name</Label>
        <Input id="name" name="name" placeholder="e.g., Positive Response" required />
      </div>
      
      <div>
        <Label htmlFor="category">Category</Label>
        <Select name="category" required>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="complaint">Complaint</SelectItem>
            <SelectItem value="compliment">Compliment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder="Brief description of when to use this template" />
      </div>
      
      <div>
        <Label htmlFor="template">Template Content</Label>
        <Textarea 
          id="template" 
          name="template" 
          placeholder="Thank you for your feedback! We appreciate..."
          rows={4}
          required 
        />
      </div>
      
      <DialogFooter>
        <Button type="submit">Create Template</Button>
      </DialogFooter>
    </form>
  );
}

// Flag form component
interface FlagFormProps {
  onSubmit: (reason: string) => void;
  isLoading: boolean;
}

function FlagForm({ onSubmit, isLoading }: FlagFormProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      onSubmit(reason.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="flag-reason">Reason for flagging</Label>
        <Textarea
          id="flag-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please explain why this review should be flagged..."
          rows={3}
          required
        />
      </div>
      
      <DialogFooter>
        <Button type="submit" disabled={!reason.trim() || isLoading}>
          {isLoading ? "Flagging..." : "Flag Review"}
        </Button>
      </DialogFooter>
    </form>
  );
}