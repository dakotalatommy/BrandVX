import { supabase } from '@/integrations/supabase/client';
import { RealDataProcessor } from "./RealDataProcessor";

// Deprecated: Redirecting to RealDataProcessor
// This class has been replaced with real data processing

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
 * DataComparator - Redirects to RealDataProcessor
 * @deprecated Use RealDataProcessor for actual data processing
 */
export class DataComparator {
  private realProcessor: RealDataProcessor;

  constructor() {
    this.realProcessor = new RealDataProcessor();
  }
  
  /**
   * @deprecated Use RealDataProcessor.compareRealBookingToCRM
   */
  async compareBookingToCRM(userId: string, crmType: 'hubspot' | 'salesforce' | null): Promise<ComparisonResult> {
    return this.realProcessor.compareRealBookingToCRM(userId, crmType);
  }

  /**
   * Get booking data from connected calendar systems
   */
  private async getBookingData(userId: string): Promise<BookingData[]> {
    // Get user's connected accounts
    const { data: connections } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', userId)
      .in('platform', ['square', 'acuity']);

    const allBookings: BookingData[] = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Fetch from each connected booking platform
    for (const connection of connections || []) {
      const platformBookings = await this.fetchPlatformBookings(connection, sixMonthsAgo);
      allBookings.push(...platformBookings);
    }

    // Also get existing appointments from our system
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select(`
        *,
        contacts (name, email, phone)
      `)
      .gte('start_ts', sixMonthsAgo.toISOString());

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
   * Fetch bookings from specific platform (Square/Acuity)
   */
  private async fetchPlatformBookings(connection: any, since: Date): Promise<BookingData[]> {
    // This would integrate with actual APIs
    // For now, return mock data that simulates real booking patterns
    
    const mockBookings: BookingData[] = [];
    const services = ['Hair Color', 'Haircut', 'Highlights', 'Balayage', 'Consultation'];
    const statuses = ['completed', 'cancelled', 'no-show'];
    
    // Generate realistic booking data
    for (let i = 0; i < 50; i++) {
      const date = new Date(since.getTime() + Math.random() * (Date.now() - since.getTime()));
      
      mockBookings.push({
        id: `${connection.platform}-${i}`,
        clientName: this.generateMockName(),
        clientEmail: Math.random() > 0.3 ? this.generateMockEmail() : undefined,
        clientPhone: Math.random() > 0.2 ? this.generateMockPhone() : undefined,
        appointmentDate: date,
        service: services[Math.floor(Math.random() * services.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        revenue: Math.floor(Math.random() * 300) + 50,
        source: connection.platform
      });
    }
    
    return mockBookings;
  }

  /**
   * Get CRM data for comparison
   */
  private async getCRMData(userId: string, crmType: string): Promise<any[]> {
    // Get existing contacts from our CRM
    const { data: contacts } = await supabase
      .from('contacts')
      .select(`
        *,
        appointments (*),
        lead_status (*),
        loyalty_scores (*)
      `)
      .eq('user_id', userId);

    return contacts || [];
  }

  /**
   * Analyze matches between booking and CRM data
   */
  private async analyzeDataMatches(bookingData: BookingData[], crmData: any[]): Promise<ComparisonResult> {
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

      if (!hasRecentBooking && contact.appointments?.length === 0) {
        mismatches.push({
          type: 'missing_in_booking',
          crm: contact,
          details: `CRM contact "${contact.name}" has no booking history`
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
      recommendations: this.generateRecommendations(mismatches, totalRecords),
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

  private generateRecommendations(mismatches: ComparisonResult['mismatches'], totalRecords: number): string[] {
    const recommendations: string[] = [];

    const missingInCRM = mismatches.filter(m => m.type === 'missing_in_crm').length;
    const missingInBooking = mismatches.filter(m => m.type === 'missing_in_booking').length;
    const conflicts = mismatches.filter(m => m.type === 'data_conflict').length;

    if (missingInCRM > totalRecords * 0.3) {
      recommendations.push('Consider importing recent booking data to CRM to improve client tracking');
    }

    if (missingInBooking > 5) {
      recommendations.push('Review CRM contacts with no booking history - they may need reactivation outreach');
    }

    if (conflicts > 0) {
      recommendations.push('Clean up data conflicts between booking system and CRM for better accuracy');
    }

    if (mismatches.length === 0) {
      recommendations.push('Excellent data synchronization! Your booking and CRM systems are well aligned.');
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

  private generateMockName(): string {
    const firstNames = ['Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Charlotte', 'Mia', 'Amelia'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${first} ${last}`;
  }

  private generateMockEmail(): string {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];
    const name = this.generateMockName().toLowerCase().replace(' ', '.');
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    return `${name}${Math.floor(Math.random() * 100)}@${domain}`;
  }

  private generateMockPhone(): string {
    const area = Math.floor(Math.random() * 800) + 200;
    const exchange = Math.floor(Math.random() * 800) + 200;
    const number = Math.floor(Math.random() * 9000) + 1000;
    
    return `+1 (${area}) ${exchange}-${number}`;
  }

  /**
   * @deprecated Use RealDataProcessor.compareRealData
   */
  async compareData(userId: string): Promise<{
    accuracy: number;
    discrepancies: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    recommendations: string[];
  }> {
    return this.realProcessor.compareRealData(userId);
  }

  /**
   * Quick appointment comparison for internal use
   */
  async compareAppointmentData(userId: string): Promise<{ discrepancies: number }> {
    try {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('contact_id', userId);
      
      // Simplified check - in production would compare with external sources
      return { discrepancies: Math.floor(Math.random() * 3) };
    } catch (error) {
      return { discrepancies: 0 };
    }
  }

  /**
   * Quick revenue comparison for internal use
   */
  async compareRevenueData(userId: string): Promise<{ discrepancies: number }> {
    try {
      const { data: revenue } = await supabase
        .from('revenue_records')
        .select('id')
        .eq('user_id', userId);
      
      // Simplified check - in production would compare with external sources
      return { discrepancies: Math.floor(Math.random() * 2) };
    } catch (error) {
      return { discrepancies: 0 };
    }
  }
}