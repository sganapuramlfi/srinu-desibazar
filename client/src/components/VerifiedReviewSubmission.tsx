import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/use-user';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Star, Shield, Calendar, Clock, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EligibleConsumption {
  bookings: Array<{
    id: number;
    bookingDate: string;
    status: string;
  }>;
  orders: Array<{
    id: number;
    orderedAt: string;
    status: string;
  }>;
}

interface ReviewEligibility {
  canReview: boolean;
  eligibleConsumptions: EligibleConsumption;
  message: string;
}

interface VerifiedReviewSubmissionProps {
  businessId: number;
  businessName: string;
  onReviewSubmitted?: () => void;
}

export function VerifiedReviewSubmission({ 
  businessId, 
  businessName, 
  onReviewSubmitted 
}: VerifiedReviewSubmissionProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [selectedConsumption, setSelectedConsumption] = useState<{
    type: 'booking' | 'order';
    id: number;
  } | null>(null);

  // Check review eligibility
  const { 
    data: eligibility, 
    isLoading: isCheckingEligibility 
  } = useQuery<ReviewEligibility>({
    queryKey: [`/api/businesses/${businessId}/reviews/eligibility`],
    enabled: !!user && !!businessId,
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      const response = await fetch(`/api/businesses/${businessId}/reviews/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit review');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review Submitted Successfully!",
        description: "Thank you for your verified review. It helps other customers make informed decisions.",
      });
      
      // Reset form
      setRating(0);
      setTitle('');
      setComment('');
      setSelectedConsumption(null);
      setIsOpen(false);
      
      // Refresh reviews
      queryClient.invalidateQueries({ 
        queryKey: [`/api/businesses/${businessId}/reviews/public`] 
      });
      
      onReviewSubmitted?.();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Submit Review",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedConsumption) {
      toast({
        variant: "destructive",
        title: "Selection Required",
        description: "Please select which booking or order you're reviewing.",
      });
      return;
    }

    if (rating === 0) {
      toast({
        variant: "destructive",
        title: "Rating Required",
        description: "Please select a rating from 1 to 5 stars.",
      });
      return;
    }

    const reviewData = {
      rating,
      title: title.trim() || undefined,
      comment: comment.trim() || undefined,
      [selectedConsumption.type === 'booking' ? 'bookingId' : 'orderId']: selectedConsumption.id,
    };

    submitReviewMutation.mutate(reviewData);
  };

  // Don't render if user is not logged in
  if (!user) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-800">Verified Reviews Only</h3>
            <p className="text-sm text-amber-700">
              Please log in to leave a review. Only customers who have used our services can submit reviews.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isCheckingEligibility) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">Checking review eligibility...</span>
        </div>
      </div>
    );
  }

  // Show ineligible state
  if (!eligibility?.canReview) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-800">Complete a Service First</h3>
            <p className="text-sm text-blue-700">
              {eligibility?.message || "You need to complete a booking or order before you can leave a review."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-green-50 border-green-200 hover:bg-green-100">
          <MessageCircle className="w-4 h-4 mr-2" />
          Leave Verified Review
          <Shield className="w-4 h-4 ml-2 text-green-600" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span>Leave Verified Review</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Review your experience at {businessName}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Consumption Selection */}
          <div className="space-y-2">
            <Label>Which service are you reviewing? *</Label>
            <Select 
              value={selectedConsumption ? `${selectedConsumption.type}-${selectedConsumption.id}` : ""} 
              onValueChange={(value) => {
                const [type, id] = value.split('-');
                setSelectedConsumption({ 
                  type: type as 'booking' | 'order', 
                  id: parseInt(id) 
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a booking or order..." />
              </SelectTrigger>
              <SelectContent>
                {eligibility.eligibleConsumptions.bookings.map((booking) => (
                  <SelectItem key={`booking-${booking.id}`} value={`booking-${booking.id}`}>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Booking - {new Date(booking.bookingDate).toLocaleDateString()}</span>
                    </div>
                  </SelectItem>
                ))}
                {eligibility.eligibleConsumptions.orders.map((order) => (
                  <SelectItem key={`order-${order.id}`} value={`order-${order.id}`}>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Order - {new Date(order.orderedAt).toLocaleDateString()}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rating Selection */}
          <div className="space-y-2">
            <Label>Your Rating *</Label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating} star{rating !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Review Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Review Title (Optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience..."
              maxLength={255}
            />
          </div>

          {/* Review Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Review (Optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about your experience..."
              rows={4}
              maxLength={2000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {comment.length}/2000 characters
            </div>
          </div>

          {/* Verification Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-xs text-green-800">
                <p className="font-medium">Verified Review</p>
                <p>This review will be marked as verified because you have completed a service with this business.</p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={rating === 0 || !selectedConsumption || submitReviewMutation.isPending}
              className="flex-1"
            >
              {submitReviewMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}