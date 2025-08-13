import { supabase } from "@/integrations/supabase/client";

export interface AcuityTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user_id: string;
}

export interface AcuityAppointment {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  datetime: string;
  endTime: string;
  appointmentTypeID: number;
  calendar: string;
  price: string;
  amountPaid: string;
  canceled: boolean;
}

export class AcuityConnector {
  private static readonly ACUITY_API_BASE = 'https://acuityscheduling.com/api/v1';

  /**
   * Generate Acuity OAuth URL for customer authorization
   */
  static generateAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'ACUITY_CLIENT_ID',
      redirect_uri: `${window.location.origin}/integrations/acuity/callback`,
      scope: 'api-v1',
      state: userId,
    });

    return `https://acuityscheduling.com/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, userId: string): Promise<AcuityTokens> {
    const response = await supabase.functions.invoke('acuity-oauth', {
      body: {
        action: 'exchange_code',
        code,
        user_id: userId
      }
    });

    if (response.error) {
      throw new Error(`Acuity token exchange failed: ${response.error.message}`);
    }

    return response.data;
  }

  /**
   * Get appointments from Acuity for the last 6 months
   */
  async getAppointments(userId: string, startDate?: Date): Promise<AcuityAppointment[]> {
    const sixMonthsAgo = startDate || new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
    
    const response = await supabase.functions.invoke('acuity-data-sync', {
      body: {
        action: 'get_appointments',
        user_id: userId,
        start_date: sixMonthsAgo.toISOString()
      }
    });

    if (response.error) {
      throw new Error(`Failed to fetch Acuity appointments: ${response.error.message}`);
    }

    return response.data.appointments || [];
  }

  /**
   * Get appointment types from Acuity
   */
  async getAppointmentTypes(userId: string): Promise<any[]> {
    const response = await supabase.functions.invoke('acuity-data-sync', {
      body: {
        action: 'get_appointment_types',
        user_id: userId
      }
    });

    if (response.error) {
      throw new Error(`Failed to fetch Acuity appointment types: ${response.error.message}`);
    }

    return response.data.appointmentTypes || [];
  }

  /**
   * Sync Acuity data to our database
   */
  async syncToDatabase(userId: string): Promise<void> {
    const [appointments, appointmentTypes] = await Promise.all([
      this.getAppointments(userId),
      this.getAppointmentTypes(userId)
    ]);

    // Create lookup for appointment type names
    const typeMap = new Map(appointmentTypes.map(type => [type.id, type.name]));

    // Store appointments
    const appointmentRecords = appointments.map(apt => ({
      contact_id: '', // Will be filled in below
      external_ref: apt.id.toString(),
      service: typeMap.get(apt.appointmentTypeID) || 'Unknown Service',
      start_ts: apt.datetime,
      end_ts: apt.endTime,
      status: apt.canceled ? 'cancelled' : 'completed',
      source: 'acuity',
      staff: apt.calendar
    }));

    // Store contacts from appointments
    const contactRecords = appointments
      .filter(apt => apt.email)
      .map(apt => ({
        user_id: userId,
        name: `${apt.firstName} ${apt.lastName}`.trim(),
        email: apt.email,
        phone: apt.phone,
        sources: ['acuity'],
        status: apt.canceled ? 'lead' : 'customer'
      }));

    // Bulk insert appointments
    if (appointmentRecords.length > 0) {
      // First get or create contacts
      for (const contact of contactRecords) {
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('user_id', userId)
          .eq('email', contact.email)
          .single();

        let contactId;
        if (existingContact) {
          contactId = existingContact.id;
          // Update existing contact
          await supabase
            .from('contacts')
            .update({
              sources: ['acuity'],
              status: contact.status
            })
            .eq('id', contactId);
        } else {
          // Create new contact
          const { data: newContact } = await supabase
            .from('contacts')
            .insert(contact)
            .select('id')
            .single();
          contactId = newContact?.id;
        }

        // Link appointment to contact
        const appointmentIndex = appointments.findIndex(apt => apt.email === contact.email);
        if (appointmentIndex >= 0 && contactId) {
          appointmentRecords[appointmentIndex].contact_id = contactId;
        }
      }

      // Filter out appointments without contact_id and insert
      const validAppointments = appointmentRecords.filter(apt => apt.contact_id);
      if (validAppointments.length > 0) {
        await supabase.from('appointments').insert(validAppointments);
      }
    }

    // Store revenue records from paid appointments
    const revenueRecords = appointments
      .filter(apt => parseFloat(apt.amountPaid) > 0)
      .map(apt => ({
        user_id: userId,
        amount: parseFloat(apt.amountPaid),
        currency: 'USD',
        source: 'acuity',
        pos_ref: apt.id.toString(),
        created_at: apt.datetime
      }));

    if (revenueRecords.length > 0) {
      await supabase.from('revenue_records').insert(revenueRecords);
    }
  }
}