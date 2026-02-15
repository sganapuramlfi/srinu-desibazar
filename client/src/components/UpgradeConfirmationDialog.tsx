/**
 * UpgradeConfirmationDialog Component
 * Confirms subscription plan changes with prorated pricing
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
}

interface UpgradeConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  currentPlan: SubscriptionPlan;
  newPlan: SubscriptionPlan;
  onConfirm: () => void;
}

export function UpgradeConfirmationDialog({
  open,
  onClose,
  currentPlan,
  newPlan,
  onConfirm,
}: UpgradeConfirmationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUpgrade = parseFloat(newPlan.priceMonthly) > parseFloat(currentPlan.priceMonthly);
  const priceDifference = Math.abs(
    parseFloat(newPlan.priceMonthly) - parseFloat(currentPlan.priceMonthly)
  );

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: newPlan.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update subscription');
      }

      toast({
        title: 'Success',
        description: `Your subscription has been ${isUpgrade ? 'upgraded' : 'downgraded'} to ${newPlan.name}`,
      });

      onConfirm();
      onClose();
    } catch (err: any) {
      console.error('Subscription update error:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: err.message || 'Failed to update subscription',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpgrade ? (
              <>
                <TrendingUp className="h-5 w-5 text-green-500" />
                Upgrade Subscription
              </>
            ) : (
              <>
                <TrendingDown className="h-5 w-5 text-blue-500" />
                Downgrade Subscription
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isUpgrade
              ? 'Upgrade your subscription to unlock more features'
              : 'Downgrade your subscription to a lower tier'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Plan */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Current Plan</h4>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{currentPlan.name}</div>
              <div className="text-sm text-muted-foreground">
                ${currentPlan.priceMonthly}/month
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="text-2xl text-muted-foreground">↓</div>
          </div>

          {/* New Plan */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">New Plan</h4>
            <div className="p-3 bg-primary/10 border border-primary rounded-md">
              <div className="font-medium">{newPlan.name}</div>
              <div className="text-sm text-muted-foreground">
                ${newPlan.priceMonthly}/month
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <Alert>
            <AlertDescription>
              {isUpgrade ? (
                <>
                  You'll be charged a prorated amount of approximately{' '}
                  <strong>${(priceDifference * 0.5).toFixed(2)}</strong> today for the
                  remainder of this billing period. Your next full charge will be{' '}
                  <strong>${newPlan.priceMonthly}</strong> on your next billing date.
                </>
              ) : (
                <>
                  Your subscription will be downgraded to <strong>{newPlan.name}</strong>{' '}
                  at the end of your current billing period. You'll continue to have access
                  to <strong>{currentPlan.name}</strong> features until then.
                </>
              )}
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading
              ? 'Processing...'
              : isUpgrade
              ? `Upgrade to ${newPlan.name}`
              : `Downgrade to ${newPlan.name}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
