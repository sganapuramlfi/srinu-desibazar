import React from 'react';
import { TableBookingDialog } from './TableBookingDialog';
import { ServiceBookingDialog } from './ServiceBookingDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, Clock, Users } from 'lucide-react';

interface UniversalBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  business: {
    id: number;
    name: string;
    industryType: string;
    slug?: string;
  };
  initialIntent?: {
    service?: string;
    dateTime?: string;
    partySize?: number;
    preferences?: any;
  };
}

/**
 * Universal Booking Dialog - Routes to appropriate industry-specific booking component
 * 
 * Architecture:
 * - Restaurant → TableBookingDialog (table reservations)
 * - Salon → ServiceBookingDialog (staff appointments) 
 * - Other → Generic service booking
 * 
 * Integrates with:
 * - AbrakadabraAI recommendations
 * - Industry-specific booking schemas
 * - Common UI patterns
 */
export function UniversalBookingDialog({ 
  isOpen, 
  onClose, 
  business, 
  initialIntent = {} 
}: UniversalBookingDialogProps) {

  // Route to industry-specific booking component
  const renderBookingComponent = () => {
    switch (business.industryType) {
      case 'restaurant':
        return (
          <TableBookingDialog
            isOpen={isOpen}
            onClose={onClose}
            businessId={business.id}
            businessName={business.name}
            initialPreferences={{
              partySize: initialIntent.partySize,
              preferredTime: initialIntent.dateTime,
              ...initialIntent.preferences
            }}
          />
        );

      case 'salon':
        return (
          <ServiceBookingDialog
            isOpen={isOpen}
            onClose={onClose}
            businessId={business.id}
            businessName={business.name}
            industryType="salon"
            initialService={initialIntent.service}
            initialDateTime={initialIntent.dateTime}
          />
        );

      case 'spa':
      case 'fitness':
      case 'wellness':
        return (
          <ServiceBookingDialog
            isOpen={isOpen}
            onClose={onClose}
            businessId={business.id}
            businessName={business.name}
            industryType={business.industryType}
            initialService={initialIntent.service}
            initialDateTime={initialIntent.dateTime}
          />
        );

      default:
        // Generic booking for unsupported industries
        return (
          <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Book with {business.name}
                </DialogTitle>
                <DialogDescription>
                  Booking for {business.industryType} businesses is coming soon!
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Coming Soon</p>
                    <p className="text-amber-700">
                      We're working on booking support for {business.industryType} businesses. 
                      Please contact the business directly for now.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                    <div className="text-xs text-gray-600">Quick</div>
                    <div className="text-sm font-medium">Call Direct</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                    <div className="text-xs text-gray-600">Personal</div>
                    <div className="text-sm font-medium">Walk In</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                    <div className="text-xs text-gray-600">Future</div>
                    <div className="text-sm font-medium">Online Soon</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`/storefront/${business.slug}`, '_blank')}
                  >
                    View Business
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={onClose}
                  >
                    Got It
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
    }
  };

  return renderBookingComponent();
}

/**
 * Booking Intent Parser - Converts AbrakadabraAI recommendations to booking intents
 */
export const parseBookingIntent = (aiRecommendation: any, userQuery: string) => {
  const intent: any = {};

  // Extract party size from query
  const partySizeMatch = userQuery.match(/(\d+)\s*(?:people|person|guests?|diners?)/i);
  if (partySizeMatch) {
    intent.partySize = parseInt(partySizeMatch[1]);
  }

  // Extract time preferences
  const timeKeywords = {
    'lunch': '12:30',
    'dinner': '19:00', 
    'breakfast': '09:00',
    'tonight': '19:30',
    'tomorrow': '19:00'
  };

  for (const [keyword, time] of Object.entries(timeKeywords)) {
    if (userQuery.toLowerCase().includes(keyword)) {
      intent.dateTime = time;
      break;
    }
  }

  // Extract service preferences for salons/spas
  const serviceKeywords = {
    'haircut': 'Hair Cut',
    'color': 'Hair Color', 
    'massage': 'Massage',
    'facial': 'Facial',
    'manicure': 'Manicure',
    'pedicure': 'Pedicure'
  };

  for (const [keyword, service] of Object.entries(serviceKeywords)) {
    if (userQuery.toLowerCase().includes(keyword)) {
      intent.service = service;
      break;
    }
  }

  return intent;
};