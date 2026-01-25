/**
 * Industry Booking Router Service
 * 
 * Routes booking requests to appropriate industry-specific endpoints
 * while maintaining consistent interface for the frontend.
 * 
 * Architecture:
 * - Universal booking interface for all industries
 * - Industry-specific routing and data transformation  
 * - Integration with existing backend booking schemas
 */

interface BookingRequest {
  businessId: number;
  industryType: string;
  customerId: number;
  bookingData: any;
}

interface BookingResponse {
  success: boolean;
  bookingId: number;
  confirmationCode?: string;
  message: string;
  industrySpecificData?: any;
}

class BookingService {
  
  /**
   * Main booking router - directs to industry-specific handlers
   */
  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    switch (request.industryType) {
      case 'restaurant':
        return this.createRestaurantBooking(request);
      
      case 'salon':
        return this.createSalonBooking(request);
      
      case 'spa':
      case 'wellness':
      case 'fitness':
        return this.createServiceBooking(request);
      
      default:
        throw new Error(`Booking not yet supported for ${request.industryType} businesses`);
    }
  }

  /**
   * Restaurant booking handler
   * Creates universal booking + restaurant reservation
   */
  private async createRestaurantBooking(request: BookingRequest): Promise<BookingResponse> {
    const { businessId, customerId, bookingData } = request;
    
    // Restaurant-specific data transformation
    const reservationData = {
      businessId,
      customerId,
      
      // Universal booking fields
      serviceType: 'table_reservation',
      startTime: new Date(`${bookingData.date}T${bookingData.time}`).toISOString(),
      endTime: this.calculateEndTime(`${bookingData.date}T${bookingData.time}`, 120), // 2 hour default
      partySize: bookingData.partySize,
      notes: bookingData.specialRequests,
      
      // Restaurant-specific fields
      tableId: bookingData.tableId,
      occasion: bookingData.occasion,
      seatingPreference: bookingData.seatingPreference,
      dietaryRequirements: bookingData.dietaryRequirements || []
    };

    const response = await fetch(`/api/businesses/${businessId}/restaurant/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservationData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Restaurant booking failed: ${error}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      bookingId: result.bookingId,
      confirmationCode: result.confirmationCode,
      message: `Table reservation confirmed for ${bookingData.partySize} guests`,
      industrySpecificData: {
        tableNumber: result.tableNumber,
        checkinTime: reservationData.startTime
      }
    };
  }

  /**
   * Salon booking handler
   * Creates universal booking + salon appointment
   */
  private async createSalonBooking(request: BookingRequest): Promise<BookingResponse> {
    const { businessId, customerId, bookingData } = request;
    
    // Salon-specific data transformation  
    const appointmentData = {
      businessId,
      customerId,
      
      // Universal booking fields
      serviceId: bookingData.serviceId,
      startTime: new Date(`${bookingData.date}T${bookingData.time}`).toISOString(),
      endTime: this.calculateEndTime(`${bookingData.date}T${bookingData.time}`, bookingData.durationMinutes),
      notes: bookingData.notes,
      
      // Salon-specific fields
      staffId: bookingData.staffId,
      serviceId: bookingData.serviceId,
      colorFormula: bookingData.colorFormula,
      patchTestRequired: bookingData.requiresPatchTest,
      previousAppointmentId: bookingData.previousAppointmentId
    };

    const response = await fetch(`/api/businesses/${businessId}/salon/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Salon booking failed: ${error}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      bookingId: result.bookingId,
      confirmationCode: result.confirmationCode,
      message: `${bookingData.serviceName} appointment confirmed`,
      industrySpecificData: {
        staffName: result.staffName,
        serviceDuration: bookingData.durationMinutes,
        preparationNotes: result.preparationNotes
      }
    };
  }

  /**
   * Generic service booking handler
   * For spa, wellness, fitness, and other service-based businesses
   */
  private async createServiceBooking(request: BookingRequest): Promise<BookingResponse> {
    const { businessId, customerId, bookingData, industryType } = request;
    
    const serviceBookingData = {
      businessId,
      customerId,
      industryType,
      
      // Universal booking fields
      serviceId: bookingData.serviceId,
      startTime: new Date(`${bookingData.date}T${bookingData.time}`).toISOString(),
      endTime: this.calculateEndTime(`${bookingData.date}T${bookingData.time}`, bookingData.durationMinutes),
      notes: bookingData.notes,
      
      // Service-specific fields
      staffId: bookingData.staffId,
      equipmentIds: bookingData.equipmentIds || [],
      packageId: bookingData.packageId
    };

    const response = await fetch(`/api/businesses/${businessId}/services/bookings`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serviceBookingData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Service booking failed: ${error}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      bookingId: result.bookingId,
      confirmationCode: result.confirmationCode,
      message: `${bookingData.serviceName} session confirmed`,
      industrySpecificData: {
        staffName: result.staffName,
        equipmentReserved: result.equipmentNames
      }
    };
  }

  /**
   * Get available time slots for a business/service/staff combination
   */
  async getAvailableSlots(params: {
    businessId: number;
    industryType: string;
    serviceId?: number;
    staffId?: number;
    date: string;
  }): Promise<Array<{ time: string; available: boolean; staffId?: number; staffName?: string }>> {
    
    const queryParams = new URLSearchParams();
    queryParams.append('date', params.date);
    if (params.serviceId) queryParams.append('serviceId', params.serviceId.toString());
    if (params.staffId) queryParams.append('staffId', params.staffId.toString());

    // Route to industry-specific availability endpoint
    let endpoint: string;
    switch (params.industryType) {
      case 'restaurant':
        endpoint = `/api/businesses/${params.businessId}/restaurant/availability?${queryParams}`;
        break;
      case 'salon':
        endpoint = `/api/businesses/${params.businessId}/salon/availability?${queryParams}`;
        break;
      default:
        endpoint = `/api/businesses/${params.businessId}/services/availability?${queryParams}`;
    }

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error('Failed to fetch availability');
    }
    
    return response.json();
  }

  /**
   * Get services for a business with industry-specific formatting
   */
  async getBusinessServices(businessId: number, industryType: string) {
    let endpoint: string;
    
    switch (industryType) {
      case 'restaurant':
        endpoint = `/api/businesses/${businessId}/restaurant/tables`;
        break;
      case 'salon':
        endpoint = `/api/businesses/${businessId}/salon/services`;
        break;
      default:
        endpoint = `/api/businesses/${businessId}/services`;
    }

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error('Failed to fetch business services');
    }
    
    return response.json();
  }

  /**
   * Get staff members for a business
   */
  async getBusinessStaff(businessId: number, industryType: string, serviceId?: number) {
    let endpoint = `/api/businesses/${businessId}/${industryType}/staff`;
    if (serviceId) {
      endpoint += `?serviceId=${serviceId}`;
    }

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error('Failed to fetch business staff');
    }
    
    return response.json();
  }

  /**
   * Utility: Calculate end time based on start time and duration
   */
  private calculateEndTime(startDateTime: string, durationMinutes: number): string {
    const startTime = new Date(startDateTime);
    const endTime = new Date(startTime.getTime() + (durationMinutes * 60 * 1000));
    return endTime.toISOString();
  }

  /**
   * Cancel booking (universal across all industries)
   */
  async cancelBooking(bookingId: number, reason?: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      throw new Error('Failed to cancel booking');
    }

    const result = await response.json();
    return {
      success: true,
      message: result.message || 'Booking cancelled successfully'
    };
  }

  /**
   * Get booking details (universal across all industries)
   */
  async getBookingDetails(bookingId: number) {
    const response = await fetch(`/api/bookings/${bookingId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch booking details');
    }
    
    return response.json();
  }
}

// Export singleton instance
export const bookingService = new BookingService();

// Export types for use in components
export type { BookingRequest, BookingResponse };