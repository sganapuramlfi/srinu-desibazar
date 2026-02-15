/**
 * CancelSubscriptionDialog Component
 * Handles subscription cancellation with feedback collection
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CancelSubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  planName: string;
  endDate?: Date;
}

export function CancelSubscriptionDialog({
  open,
  onClose,
  onConfirm,
  planName,
  endDate,
}: CancelSubscriptionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [immediately, setImmediately] = useState(false);

  const cancellationReasons = [
    'Too expensive',
    'Not using enough features',
    'Found a better alternative',
    'Business closing',
    'Technical issues',
    'Other',
  ];

  const handleConfirm = async () => {
    if (!reason) {
      setError('Please select a reason for cancellation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          immediately,
          reason,
          feedback,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      toast({
        title: 'Subscription Cancelled',
        description: immediately
          ? 'Your subscription has been cancelled immediately'
          : 'Your subscription will cancel at the end of the billing period',
      });

      onConfirm();
      onClose();
    } catch (err: any) {
      console.error('Cancellation error:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: err.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatEndDate = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            We're sorry to see you go. Please help us improve by sharing your reason for
            cancelling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Plan Info */}
          <Alert>
            <AlertDescription>
              <strong>Current Plan:</strong> {planName}
              {endDate && !immediately && (
                <>
                  <br />
                  <strong>Access until:</strong> {formatEndDate(endDate)}
                </>
              )}
            </AlertDescription>
          </Alert>

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label>Why are you cancelling?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {cancellationReasons.map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="font-normal cursor-pointer">
                    {r}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Additional Feedback */}
          <div className="space-y-2">
            <Label htmlFor="feedback">Additional feedback (optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Tell us more about your experience..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>

          {/* Immediate Cancellation Option */}
          <div className="flex items-start space-x-2 p-3 bg-muted rounded-md">
            <input
              type="checkbox"
              id="immediately"
              checked={immediately}
              onChange={(e) => setImmediately(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="immediately" className="font-medium cursor-pointer">
                Cancel immediately
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {immediately ? (
                  <>
                    Your subscription will be cancelled immediately and you'll lose access to all
                    features. No refund will be issued for the remaining period.
                  </>
                ) : (
                  <>
                    Your subscription will remain active until {formatEndDate(endDate)}, then it
                    will be cancelled. You'll continue to have full access until then.
                  </>
                )}
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Keep Subscription
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Processing...' : immediately ? 'Cancel Now' : 'Cancel at Period End'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
