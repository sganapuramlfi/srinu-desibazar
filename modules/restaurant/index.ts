import { BaseModule } from '../core/types.js';
import { RestaurantBookingService } from './services/RestaurantBookingService.js';

// Restaurant module configuration
const restaurantModule: BaseModule = {
  config: {
    id: 'restaurant',
    name: 'Restaurant & Dining Management',
    description: 'Complete restaurant management system with table reservations, menu management, and dining analytics',
    version: '1.0.0',
    enabled: false, // Disabled by default
    industry: 'restaurant',
    dependencies: [], // No dependencies
    features: [
      'table-management',
      'reservation-system',
      'menu-management',
      'waitlist-management',
      'staff-scheduling',
      'dining-analytics',
      'walk-in-support',
      'peak-hour-pricing'
    ]
  },

  // Module API endpoints
  api: {
    endpoints: [
      {
        method: 'GET',
        path: '/tables',
        handler: async (req: any, res: any) => {
          try {
            const { businessId } = req.params;
            // Get restaurant tables
            res.json([]);
          } catch (error) {
            res.status(500).json({ error: 'Failed to fetch tables' });
          }
        },
        auth: true
      },
      {
        method: 'POST',
        path: '/tables',
        handler: async (req: any, res: any) => {
          try {
            const tableData = req.body;
            // Create restaurant table
            res.json({ success: true });
          } catch (error) {
            res.status(500).json({ error: 'Failed to create table' });
          }
        },
        auth: true
      },
      {
        method: 'GET',
        path: '/menu',
        handler: async (req: any, res: any) => {
          try {
            const { businessId } = req.params;
            // Get restaurant menu
            res.json([]);
          } catch (error) {
            res.status(500).json({ error: 'Failed to fetch menu' });
          }
        }
      },
      {
        method: 'POST',
        path: '/reservation/availability',
        handler: async (req: any, res: any) => {
          try {
            const { businessId, partySize, date, seatingPreference } = req.body;
            const bookingService = new RestaurantBookingService(businessId);
            
            // This would integrate with the actual database
            const slots = []; // bookingService.generateRestaurantBookingSlots(...)
            
            res.json({ slots });
          } catch (error) {
            res.status(500).json({ error: 'Failed to get availability' });
          }
        }
      },
      {
        method: 'POST',
        path: '/reservation',
        handler: async (req: any, res: any) => {
          try {
            const reservationData = req.body;
            const bookingService = new RestaurantBookingService(reservationData.businessId);
            
            // Validate reservation
            const validation = bookingService.validateBooking(reservationData);
            if (!validation.isValid) {
              return res.status(400).json({ 
                error: 'Invalid reservation request',
                details: validation.errors 
              });
            }
            
            // Create reservation (would integrate with database)
            res.json({ success: true, reservationId: Date.now() });
          } catch (error) {
            res.status(500).json({ error: 'Failed to create reservation' });
          }
        },
        auth: true
      },
      {
        method: 'POST',
        path: '/waitlist',
        handler: async (req: any, res: any) => {
          try {
            const { businessId, customerName, contactPhone, partySize, seatingPreference } = req.body;
            const bookingService = new RestaurantBookingService(businessId);
            
            const waitlistEntry = await bookingService.addToWaitlist(
              businessId,
              customerName,
              contactPhone,
              partySize,
              seatingPreference
            );
            
            res.json(waitlistEntry);
          } catch (error) {
            res.status(500).json({ error: 'Failed to add to waitlist' });
          }
        }
      },
      {
        method: 'GET',
        path: '/analytics/:date',
        handler: async (req: any, res: any) => {
          try {
            const { businessId } = req.params;
            const { date } = req.params;
            
            // Get restaurant analytics for date
            const analytics = {
              date,
              totalReservations: 25,
              walkIns: 8,
              cancellations: 2,
              noShows: 1,
              averagePartySize: 3.2,
              turnoverRate: 1.8,
              revenue: 1250.50,
              peakHours: [
                { hour: 12, reservations: 8, occupancy: 0.8 },
                { hour: 19, reservations: 12, occupancy: 0.95 }
              ],
              popularTables: [
                { tableId: 1, tableNumber: 'T1', bookings: 4 },
                { tableId: 5, tableNumber: 'T5', bookings: 3 }
              ]
            };
            
            res.json(analytics);
          } catch (error) {
            res.status(500).json({ error: 'Failed to fetch analytics' });
          }
        },
        auth: true
      },
      {
        method: 'GET',
        path: '/staff',
        handler: async (req: any, res: any) => {
          try {
            const { businessId } = req.params;
            // Get restaurant staff
            res.json([]);
          } catch (error) {
            res.status(500).json({ error: 'Failed to fetch staff' });
          }
        },
        auth: true
      }
    ]
  },

  // Module initialization
  onInit: async () => {
    console.log('🍽️ Restaurant module initialized');
    
    // Initialize restaurant-specific services
    // Set up table management
    // Initialize menu systems
    // Set up reservation notifications
  },

  // Module cleanup
  onDestroy: async () => {
    console.log('🍽️ Restaurant module destroyed');
    // Clean up restaurant resources
  }
};

export default restaurantModule;