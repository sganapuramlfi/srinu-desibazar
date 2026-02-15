/**
 * PaymentMethodForm Component
 * Stripe Elements integration for payment method collection
 */

import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethodFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
  setAsDefault?: boolean;
}

export function PaymentMethodForm({ onSuccess, onCancel, setAsDefault = true }: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create setup intent
      const setupIntentResponse = await fetch('/api/billing/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!setupIntentResponse.ok) {
        throw new Error('Failed to create setup intent');
      }

      const { clientSecret } = await setupIntentResponse.json();

      // Confirm card setup
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Save payment method to database
      const saveResponse = await fetch('/api/billing/payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: setupIntent.payment_method,
          isDefault: setAsDefault,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save payment method');
      }

      toast({
        title: 'Success',
        description: 'Payment method added successfully',
      });

      onSuccess();
    } catch (err: any) {
      console.error('Payment method error:', err);
      setError(err.message || 'Failed to add payment method');
      toast({
        title: 'Error',
        description: err.message || 'Failed to add payment method',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Add Payment Method
        </CardTitle>
        <CardDescription>
          Your payment information is securely processed by Stripe
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 border rounded-md">
            <CardElement options={cardElementOptions} />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={!stripe || loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Processing...' : 'Add Payment Method'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
