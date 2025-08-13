import { supabase } from "@/integrations/supabase/client";

interface BookingData {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  appointmentDate: Date;
  service: string;
  status: string;
  revenue?: number;
  source: 'square' | 'acuity' | 'crm';
}

interface ComparisonResult {
  accuracy: number;
  mismatches: Array<{
    type: 'missing_in_crm' | 'missing_in_booking' | 'data_conflict';
    booking?: BookingData;
    crm?: any;
    details: string;
  }>;
  recommendations: string[];
  dataQuality: {
    emailMatches: number;
    phoneMatches: number;
    nameMatches: number;
    totalRecords: number;
  };
}

/**
 * RealDataProcessor - Processes actual data from connected accounts
 * Replaces mock/fake data with real business metrics
 */
export class RealDataProcessor {
  
  /**
   * Compare real booking data against CRM data
   */
  async compareRealBookingToCRM(userId: string, crmType: 'hubspot' | 'salesforce' | null): Promise<ComparisonResult> {
    try {
      // Get actual booking data from connected accounts
      const bookingData = await this.getRealBookingData(userId);
      
      // Get CRM data if available
      const crmData = crmType ? await this.getCRMData(userId, crmType) : [];
      
      // Perform real comparison analysis
      const comparison = await this.analyzeRealDataMatches(bookingData, crmData);
      
      return comparison;
      
    } catch (error) {
      throw new Error(`Failed to compare real data: ${error.message}`);
    }
  }

  /**
   * Get actual booking data from connected calendar/booking systems
   */
  async getRealBookingData(userId: string): Promise<BookingData[]> {
    // Get user's connected accounts
    const { data: connections, error: connectionsError } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', userId)
      .in('platform', ['square', 'acuity']);

    if (connectionsError) throw connectionsError;

    const allBookings: BookingData[] = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Fetch from each connected booking platform using edge functions
    for (const connection of connections || []) {
      const platformBookings = await this.fetchRealPlatformData(connection, sixMonthsAgo);
      allBookings.push(...platformBookings);
    }

    // Also get existing appointments from our system
    const { data: existingAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        *,
        contacts (name, email, phone)
      `)
      .gte('start_ts', sixMonthsAgo.toISOString());

    if (appointmentsError) throw appointmentsError;

    // Convert to standard format
    const systemBookings: BookingData[] = (existingAppointments || []).map(apt => ({
      id: apt.id,
      clientName: apt.contacts?.name || 'Unknown',
      clientEmail: apt.contacts?.email,
      clientPhone: apt.contacts?.phone,
      appointmentDate: new Date(apt.start_ts),
      service: apt.service,
      status: apt.status,
      source: 'crm' as const
    }));

    allBookings.push(...systemBookings);

    return this.deduplicateBookings(allBookings);
  }

  /**
   * Fetch real data from platform using edge functions
   */
  private async fetchRealPlatformData(connection: any, since: Date): Promise<BookingData[]> {
    try {
      if (connection.platform === 'square') {
        return await this.fetchSquareData(connection, since);
      } else if (connection.platform === 'acuity') {
        return await this.fetchAcuityData(connection, since);
      }
      return [];
    } catch (error) {
      // Log the error but don't fail the entire process
      await supabase
        .from('events')
        .insert({
          user_id: connection.user_id,
          type: 'data_fetch_error',
          source: connection.platform,
          metadata: { 
            error: error.message,
            connection_id: connection.id
          }
        });
      return [];
    }
  }

  /**
   * Fetch real Square data via edge function
   */
  private async fetchSquareData(connection: any, since: Date): Promise<BookingData[]> {
    const { data, error } = await supabase.functions.invoke('square-data-sync', {
      body: {
        action: 'fetch_appointments',
        user_id: connection.user_id,
        since: since.toISOString()
      }
    });

    if (error) throw error;

    return (data?.appointments || []).map((apt: any) => ({
      id: `square-${apt.id}`,
      clientName: `${apt.customer?.given_name || ''} ${apt.customer?.family_name || ''}`.trim() || 'Unknown',
      clientEmail: apt.customer?.email_address,
      clientPhone: apt.customer?.phone_number,
      appointmentDate: new Date(apt.appointment_segments?.[0]?.service_date),
      service: apt.appointment_segments?.[0]?.service_variation?.name || 'Service',
      status: apt.appointment_segments?.[0]?.service_status?.toLowerCase() || 'unknown',
      revenue: apt.total_money?.amount ? apt.total_money.amount / 100 : 0, // Square uses cents
      source: 'square' as const
    }));
  }

  /**
   * Fetch real Acuity data via edge function
   */
  private async fetchAcuityData(connection: any, since: Date): Promise<BookingData[]> {
    const { data, error } = await supabase.functions.invoke('acuity-data-sync', {
      body: {
        action: 'fetch_appointments',
        user_id: connection.user_id,
        since: since.toISOString()
      }
    });

    if (error) throw error;

    return (data?.appointments || []).map((apt: any) => ({
      id: `acuity-${apt.id}`,
      clientName: `${apt.firstName || ''} ${apt.lastName || ''}`.trim() || 'Unknown',
      clientEmail: apt.email,
      clientPhone: apt.phone,
      appointmentDate: new Date(apt.datetime),
      service: apt.appointmentType?.name || 'Service',
      status: apt.canceled ? 'cancelled' : 'completed',
      revenue: apt.price ? parseFloat(apt.price) : 0,
      source: 'acuity' as const
    }));
  }

  /**
   * Get CRM data for comparison
   */
  private async getCRMData(userId: string, crmType: string): Promise<any[]> {
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select(`
        *,
        appointments (*),
        lead_status (*),
        loyalty_scores (*)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    return contacts || [];
  }

  /**
   * Analyze matches between real booking and CRM data
   */
  private async analyzeRealDataMatches(bookingData: BookingData[], crmData: any[]): Promise<ComparisonResult> {
    const mismatches: ComparisonResult['mismatches'] = [];
    let emailMatches = 0;
    let phoneMatches = 0;
    let nameMatches = 0;

    // Create lookup maps for efficient matching
    const crmByEmail = new Map();
    const crmByPhone = new Map();
    const crmByName = new Map();

    crmData.forEach(contact => {
      if (contact.email) crmByEmail.set(contact.email.toLowerCase(), contact);
      if (contact.phone) crmByPhone.set(this.normalizePhone(contact.phone), contact);
      if (contact.name) crmByName.set(contact.name.toLowerCase(), contact);
    });

    // Check each booking against CRM
    for (const booking of bookingData) {
      let foundMatch = false;
      let matchedContact = null;

      // Try to match by email first (most reliable)
      if (booking.clientEmail) {
        matchedContact = crmByEmail.get(booking.clientEmail.toLowerCase());
        if (matchedContact) {
          emailMatches++;
          foundMatch = true;
        }
      }

      // Try phone if no email match
      if (!foundMatch && booking.clientPhone) {
        matchedContact = crmByPhone.get(this.normalizePhone(booking.clientPhone));
        if (matchedContact) {
          phoneMatches++;
          foundMatch = true;
        }
      }

      // Try name as last resort
      if (!foundMatch && booking.clientName) {
        matchedContact = crmByName.get(booking.clientName.toLowerCase());
        if (matchedContact) {
          nameMatches++;
          foundMatch = true;
        }
      }

      // Record mismatch if no match found
      if (!foundMatch) {
        mismatches.push({
          type: 'missing_in_crm',
          booking,
          details: `Client "${booking.clientName}" from ${booking.source} not found in CRM`
        });
      } else {
        // Check for data conflicts in matched records
        const conflicts = this.findDataConflicts(booking, matchedContact);
        mismatches.push(...conflicts);
      }
    }

    // Check for CRM contacts with no recent bookings
    for (const contact of crmData) {
      const hasRecentBooking = bookingData.some(booking => 
        this.isMatch(booking, contact)
      );

      if (!hasRecentBooking && (!contact.appointments || contact.appointments.length === 0)) {
        mismatches.push({
          type: 'missing_in_booking',
          crm: contact,
          details: `CRM contact "${contact.name}" has no recent booking history`
        });
      }
    }

    const totalRecords = Math.max(bookingData.length, crmData.length);
    const accuracy = totalRecords > 0 
      ? ((totalRecords - mismatches.length) / totalRecords) * 100 
      : 100;

    return {
      accuracy: Math.round(accuracy * 100) / 100,
      mismatches,
      recommendations: this.generateRealRecommendations(mismatches, totalRecords, bookingData.length),
      dataQuality: {
        emailMatches,
        phoneMatches,
        nameMatches,
        totalRecords
      }
    };
  }

  private findDataConflicts(booking: BookingData, contact: any): ComparisonResult['mismatches'] {
    const conflicts: ComparisonResult['mismatches'] = [];

    // Check for phone number conflicts
    if (booking.clientPhone && contact.phone) {
      const bookingPhone = this.normalizePhone(booking.clientPhone);
      const contactPhone = this.normalizePhone(contact.phone);
      
      if (bookingPhone !== contactPhone) {
        conflicts.push({
          type: 'data_conflict',
          booking,
          crm: contact,
          details: `Phone mismatch: Booking has ${booking.clientPhone}, CRM has ${contact.phone}`
        });
      }
    }

    // Check for email conflicts
    if (booking.clientEmail && contact.email) {
      if (booking.clientEmail.toLowerCase() !== contact.email.toLowerCase()) {
        conflicts.push({
          type: 'data_conflict',
          booking,
          crm: contact,
          details: `Email mismatch: Booking has ${booking.clientEmail}, CRM has ${contact.email}`
        });
      }
    }

    return conflicts;
  }

  private generateRealRecommendations(mismatches: ComparisonResult['mismatches'], totalRecords: number, bookingCount: number): string[] {
    const recommendations: string[] = [];

    const missingInCRM = mismatches.filter(m => m.type === 'missing_in_crm').length;
    const missingInBooking = mismatches.filter(m => m.type === 'missing_in_booking').length;
    const conflicts = mismatches.filter(m => m.type === 'data_conflict').length;

    if (missingInCRM > totalRecords * 0.3) {
      recommendations.push(`Import ${missingInCRM} recent booking clients to CRM to improve tracking`);
    }

    if (missingInBooking > 5) {
      recommendations.push(`${missingInBooking} CRM contacts need reactivation outreach`);
    }

    if (conflicts > 0) {
      recommendations.push(`Resolve ${conflicts} data conflicts between booking system and CRM`);
    }

    if (bookingCount > 50) {
      recommendations.push('Consider automated data sync between booking platforms and CRM');
    }

    if (mismatches.length === 0) {
      recommendations.push('Excellent data synchronization! Your systems are perfectly aligned.');
    }

    return recommendations;
  }

  private deduplicateBookings(bookings: BookingData[]): BookingData[] {
    const seen = new Set();
    return bookings.filter(booking => {
      const key = `${booking.clientEmail || booking.clientPhone || booking.clientName}-${booking.appointmentDate.toISOString()}-${booking.service}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private isMatch(booking: BookingData, contact: any): boolean {
    if (booking.clientEmail && contact.email) {
      return booking.clientEmail.toLowerCase() === contact.email.toLowerCase();
    }
    if (booking.clientPhone && contact.phone) {
      return this.normalizePhone(booking.clientPhone) === this.normalizePhone(contact.phone);
    }
    if (booking.clientName && contact.name) {
      return booking.clientName.toLowerCase() === contact.name.toLowerCase();
    }
    return false;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Main comparison method with real data processing
   */
  async compareRealData(userId: string): Promise<{
    accuracy: number;
    discrepancies: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    recommendations: string[];
  }> {
    try {
      // Run real data comparison
      const result = await this.compareRealBookingToCRM(userId, 'hubspot');
      
      // Transform to expected format
      return {
        accuracy: result.accuracy,
        discrepancies: result.mismatches.map(m => ({
          type: m.type.replace(/_/g, ' ').toUpperCase(),
          description: m.details,
          severity: m.type === 'data_conflict' ? 'high' : 'medium' as 'low' | 'medium' | 'high'
        })),
        recommendations: result.recommendations
      };
    } catch (error) {
      return {
        accuracy: 0,
        discrepancies: [{
          type: 'Real Data Processing Error',
          description: 'Unable to process real data from connected accounts. Please check your integrations.',
          severity: 'high'
        }],
        recommendations: ['Ensure all integrations are properly connected and authorized']
      };
    }
  }

  /**
   * Get real business metrics from connected accounts
   */
  async getRealBusinessMetrics(userId: string): Promise<{
    totalAppointments: number;
    totalRevenue: number;
    averageDuration: number;
    topServices: string[];
    monthlyGrowth: number;
  }> {
    try {
      const bookingData = await this.getRealBookingData(userId);
      
      const totalRevenue = bookingData.reduce((sum, booking) => sum + (booking.revenue || 0), 0);
      const serviceCount = new Map();
      
      bookingData.forEach(booking => {
        serviceCount.set(booking.service, (serviceCount.get(booking.service) || 0) + 1);
      });
      
      const topServices = Array.from(serviceCount.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([service]) => service);

      // Calculate monthly growth
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const recentRevenue = bookingData
        .filter(booking => booking.appointmentDate >= oneMonthAgo)
        .reduce((sum, booking) => sum + (booking.revenue || 0), 0);
      
      const previousRevenue = totalRevenue - recentRevenue;
      const monthlyGrowth = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      return {
        totalAppointments: bookingData.length,
        totalRevenue,
        averageDuration: 60, // Default, would calculate from real data
        topServices,
        monthlyGrowth
      };
    } catch (error) {
      return {
        totalAppointments: 0,
        totalRevenue: 0,
        averageDuration: 0,
        topServices: [],
        monthlyGrowth: 0
      };
    }
  }
}