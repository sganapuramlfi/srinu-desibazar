/**
 * PlanComparisonModal Component
 * Side-by-side comparison of subscription plans
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  isPopular: boolean;
  maxStaff: number | null;
  maxBookingsPerMonth: number | null;
  maxProducts: number | null;
  storageGb: number | null;
  aiCreditsPerMonth: number | null;
  enabledModules: string[];
  enabledFeatures: string[];
}

interface PlanComparisonModalProps {
  open: boolean;
  onClose: () => void;
  plans: SubscriptionPlan[];
  currentPlanId: number;
  onSelectPlan: (planId: number) => void;
}

export function PlanComparisonModal({
  open,
  onClose,
  plans,
  currentPlanId,
  onSelectPlan,
}: PlanComparisonModalProps) {
  const formatPrice = (monthly: string, yearly: string) => {
    const monthlyNum = parseFloat(monthly);
    const yearlyNum = parseFloat(yearly);

    if (monthlyNum === 0) return 'Free';

    const monthlySavings = yearlyNum > 0 ? ((yearlyNum / 12) / monthlyNum * 100 - 100).toFixed(0) : 0;

    return (
      <div>
        <div className="text-3xl font-bold">${monthly}</div>
        <div className="text-sm text-muted-foreground">per month</div>
        {yearlyNum > 0 && (
          <div className="text-xs text-green-600 mt-1">
            or ${yearly}/year (save {Math.abs(Number(monthlySavings))}%)
          </div>
        )}
      </div>
    );
  };

  const formatLimit = (value: number | null, unit: string = '') => {
    return value === null ? 'Unlimited' : `${value}${unit}`;
  };

  const allFeatures = [
    'Basic booking system',
    'Advanced booking',
    'Analytics dashboard',
    'Promotions & discounts',
    'Customer reviews',
    'Staff scheduling',
    'Inventory management',
    'Email marketing',
    'SMS notifications',
    'Custom branding',
    'API access',
    'White label',
    'Multi-location',
  ];

  const hasFeature = (plan: SubscriptionPlan, feature: string) => {
    const featureMap: Record<string, string[]> = {
      'Basic booking system': ['basic_booking'],
      'Advanced booking': ['advanced_booking'],
      'Analytics dashboard': ['analytics', 'advanced_analytics'],
      'Promotions & discounts': ['promotions'],
      'Customer reviews': ['reviews'],
      'Staff scheduling': ['staff_scheduling', 'advanced_scheduling'],
      'Inventory management': ['inventory_management'],
      'Email marketing': ['email_marketing'],
      'SMS notifications': ['sms_notifications'],
      'Custom branding': ['custom_branding'],
      'API access': ['api_access'],
      'White label': ['white_label'],
      'Multi-location': ['multi_location'],
    };

    const featureKeys = featureMap[feature] || [];
    return featureKeys.some(key => plan.enabledFeatures.includes(key));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Subscription Plans</DialogTitle>
          <DialogDescription>
            Choose the plan that best fits your business needs
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-6 ${
                plan.isPopular ? 'border-primary shadow-lg' : 'border-border'
              } ${plan.id === currentPlanId ? 'bg-muted' : ''}`}
            >
              {/* Plan Header */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  {plan.isPopular && (
                    <Badge variant="default" className="text-xs">
                      Popular
                    </Badge>
                  )}
                  {plan.id === currentPlanId && (
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* Pricing */}
              <div className="text-center mb-6 py-4 border-t border-b">
                {formatPrice(plan.priceMonthly, plan.priceYearly)}
              </div>

              {/* Limits */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Staff:</span>
                  <span className="font-medium">{formatLimit(plan.maxStaff)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bookings/month:</span>
                  <span className="font-medium">{formatLimit(plan.maxBookingsPerMonth)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Products:</span>
                  <span className="font-medium">{formatLimit(plan.maxProducts)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Storage:</span>
                  <span className="font-medium">{formatLimit(plan.storageGb, ' GB')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">AI Credits:</span>
                  <span className="font-medium">{formatLimit(plan.aiCreditsPerMonth)}</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-6">
                <h4 className="text-sm font-semibold mb-3">Features:</h4>
                {allFeatures.map((feature) => {
                  const has = hasFeature(plan, feature);
                  return (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      {has ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={has ? '' : 'text-muted-foreground'}>{feature}</span>
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <Button
                className="w-full"
                variant={plan.id === currentPlanId ? 'secondary' : 'default'}
                disabled={plan.id === currentPlanId}
                onClick={() => onSelectPlan(plan.id)}
              >
                {plan.id === currentPlanId ? 'Current Plan' : 'Select Plan'}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
