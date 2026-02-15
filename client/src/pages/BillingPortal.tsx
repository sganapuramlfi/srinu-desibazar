/**
 * BillingPortal Page
 * Main subscription and billing management page
 */

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  FileText,
  TrendingUp,
  Settings,
  Loader2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { UsageStatistics } from '@/components/UsageStatistics';
import { PlanComparisonModal } from '@/components/PlanComparisonModal';
import { PaymentMethodForm } from '@/components/PaymentMethodForm';
import { UpgradeConfirmationDialog } from '@/components/UpgradeConfirmationDialog';
import { CancelSubscriptionDialog } from '@/components/CancelSubscriptionDialog';
import { useToast } from '@/hooks/use-toast';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default function BillingPortal() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);

  // Modal states
  const [showPlanComparison, setShowPlanComparison] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      // Load subscription and plans
      const [subRes, plansRes, methodsRes, invoicesRes] = await Promise.all([
        fetch('/api/billing/subscription'),
        fetch('/api/billing/plans'),
        fetch('/api/billing/payment-methods'),
        fetch('/api/billing/invoices'),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData);

        // Mock usage data - replace with actual API call
        setUsage({
          staff: { current: 5, max: subData.plan.maxStaff, percentage: 33 },
          bookings: { current: 120, max: subData.plan.maxBookingsPerMonth, percentage: 24, resetDate: subData.currentPeriodEnd },
          storage: { current: 1.2, max: subData.plan.storageGb, percentage: 12 },
          aiCredits: { current: 45, max: subData.plan.aiCreditsPerMonth, percentage: 9, resetDate: subData.currentPeriodEnd },
        });
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }

      if (methodsRes.ok) {
        const methodsData = await methodsRes.json();
        setPaymentMethods(methodsData);
      }

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData);
      }
    } catch (error) {
      console.error('Failed to load billing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load billing information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: number) => {
    setSelectedPlanId(planId);
    setShowPlanComparison(false);
    setShowUpgradeDialog(true);
  };

  const handleUpgradeConfirm = () => {
    loadBillingData();
  };

  const handleCancelConfirm = () => {
    loadBillingData();
  };

  const handleDeletePaymentMethod = async (methodId: number) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      const response = await fetch(`/api/billing/payment-method/${methodId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }

      toast({
        title: 'Success',
        description: 'Payment method removed',
      });

      loadBillingData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove payment method',
        variant: 'destructive',
      });
    }
  };

  const openCustomerPortal = async () => {
    try {
      const response = await fetch('/api/billing/portal');
      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open customer portal',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      trial: 'secondary',
      active: 'default',
      past_due: 'destructive',
      cancelled: 'outline',
      suspended: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>No active subscription found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription, payment methods, and billing history
        </p>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Your active subscription plan</CardDescription>
            </div>
            {getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{subscription.plan.name}</div>
              <div className="text-muted-foreground">{subscription.plan.description}</div>
              <div className="text-sm text-muted-foreground mt-2">
                ${subscription.plan.priceMonthly}/month • Renews on {formatDate(subscription.currentPeriodEnd)}
              </div>
            </div>
            <div className="space-x-2">
              <Button onClick={() => setShowPlanComparison(true)}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Change Plan
              </Button>
              <Button variant="outline" onClick={() => setShowCancelDialog(true)}>
                Cancel Subscription
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {usage && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Usage Statistics</h2>
          <UsageStatistics usage={usage} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="payment-methods" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payment-methods">
            <CreditCard className="mr-2 h-4 w-4" />
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="mr-2 h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Manage your payment methods</CardDescription>
                </div>
                <Button onClick={() => setShowPaymentForm(!showPaymentForm)}>
                  Add Payment Method
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showPaymentForm && (
                <Elements stripe={stripePromise}>
                  <PaymentMethodForm
                    onSuccess={() => {
                      setShowPaymentForm(false);
                      loadBillingData();
                    }}
                    onCancel={() => setShowPaymentForm(false)}
                  />
                </Elements>
              )}

              {paymentMethods.length === 0 && !showPaymentForm ? (
                <Alert>
                  <AlertDescription>No payment methods added yet</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {formatCardBrand(method.cardBrand)} •••• {method.cardLast4}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Expires {method.cardExpMonth}/{method.cardExpYear}
                          </div>
                        </div>
                        {method.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePaymentMethod(method.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Your billing history</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <Alert>
                  <AlertDescription>No invoices yet</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">Invoice #{invoice.invoiceNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(invoice.invoiceDate)} • ${invoice.total}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(invoice.status)}
                        {invoice.hostedInvoiceUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
              <CardDescription>Manage your billing preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Billing Email</h3>
                <p className="text-sm text-muted-foreground">{subscription.billingEmail}</p>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Stripe Customer Portal</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Access the Stripe customer portal to manage your subscription, update payment
                  methods, and view invoices.
                </p>
                <Button onClick={openCustomerPortal}>
                  Open Customer Portal
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <PlanComparisonModal
        open={showPlanComparison}
        onClose={() => setShowPlanComparison(false)}
        plans={plans}
        currentPlanId={subscription.planId}
        onSelectPlan={handleSelectPlan}
      />

      {showUpgradeDialog && selectedPlan && (
        <UpgradeConfirmationDialog
          open={showUpgradeDialog}
          onClose={() => setShowUpgradeDialog(false)}
          currentPlan={subscription.plan}
          newPlan={selectedPlan}
          onConfirm={handleUpgradeConfirm}
        />
      )}

      <CancelSubscriptionDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelConfirm}
        planName={subscription.plan.name}
        endDate={subscription.currentPeriodEnd}
      />
    </div>
  );
}
