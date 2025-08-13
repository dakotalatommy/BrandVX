import { supabase } from "@/integrations/supabase/client";

interface CRMSetupConfig {
  userId: string;
  businessName: string;
  businessType: string;
  realBookingData: any[];
  preferences: {
    reminderSettings: Record<string, boolean>;
    enableTimeTracker: boolean;
    enableSharePrompts: boolean;
  };
}

interface HubSpotSetupResult {
  success: boolean;
  hubspotAccountId?: string;
  propertiesCreated: string[];
  contactsImported: number;
  dealsCreated: number;
  workflowsSetup: string[];
  errors?: string[];
}

/**
 * RealCRMSetup - Sets up CRM using actual business data
 * Connects to real HubSpot API for legitimate CRM configuration
 */
export class RealCRMSetup {
  
  /**
   * Setup HubSpot CRM using real business data from connected accounts
   */
  async setupRealHubSpotFromData(config: CRMSetupConfig): Promise<HubSpotSetupResult> {
    try {
      // Validate that we have a real HubSpot connection
      const hubspotConnection = await this.validateHubSpotConnection(config.userId);
      
      if (!hubspotConnection) {
        throw new Error('No valid HubSpot connection found. Please connect HubSpot first.');
      }

      // 1. Create custom properties for BrandVX integration
      const properties = await this.createRealBrandVXProperties(hubspotConnection);
      
      // 2. Import contacts from real booking data
      const importResult = await this.importRealBookingContacts(
        hubspotConnection,
        config.realBookingData,
        config.userId
      );
      
      // 3. Create deals from actual completed appointments
      const deals = await this.createRealDealsFromBookings(
        hubspotConnection,
        config.realBookingData
      );
      
      // 4. Setup automated workflows with real triggers
      const workflows = await this.setupRealBrandVXWorkflows(
        hubspotConnection,
        config.preferences
      );
      
      // 5. Configure dashboard and reporting
      await this.setupRealDashboard(hubspotConnection, config.businessType);

      return {
        success: true,
        hubspotAccountId: hubspotConnection.account_id,
        propertiesCreated: properties,
        contactsImported: importResult.contacts,
        dealsCreated: deals.length,
        workflowsSetup: workflows,
        errors: importResult.errors
      };

    } catch (error) {
      return {
        success: false,
        propertiesCreated: [],
        contactsImported: 0,
        dealsCreated: 0,
        workflowsSetup: [],
        errors: [error.message]
      };
    }
  }

  /**
   * Validate existing HubSpot connection
   */
  private async validateHubSpotConnection(userId: string) {
    const { data: connection, error } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'hubspot')
      .maybeSingle();

    if (error || !connection) {
      return null;
    }

    // Verify connection is still valid by testing API access
    try {
      const { data, error: testError } = await supabase.functions.invoke('hubspot-data-sync', {
        body: {
          action: 'test_connection',
          user_id: userId
        }
      });

      if (testError || !data?.valid) {
        return null;
      }

      return connection;
    } catch {
      return null;
    }
  }

  /**
   * Create BrandVX-specific custom properties in real HubSpot account
   */
  private async createRealBrandVXProperties(connection: any): Promise<string[]> {
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-data-sync', {
        body: {
          action: 'create_properties',
          user_id: connection.user_id,
          properties: [
            {
              name: 'brandvx_bucket',
              label: 'BrandVX Lead Bucket',
              type: 'enumeration',
              options: [
                { label: '1 - New Lead', value: '1' },
                { label: '2 - Never Answered', value: '2' },
                { label: '3 - Retargeting', value: '3' },
                { label: '4 - Engaged', value: '4' },
                { label: '5 - Retention', value: '5' },
                { label: '6 - Loyalty', value: '6' },
                { label: '7 - Dead', value: '7' }
              ]
            },
            {
              name: 'brandvx_tag',
              label: 'BrandVX Tag',
              type: 'string',
              description: 'Automated tag from BrandVX system'
            },
            {
              name: 'brandvx_next_action_at',
              label: 'BrandVX Next Action',
              type: 'datetime',
              description: 'Scheduled next action timestamp'
            },
            {
              name: 'brandvx_loyalty_tier',
              label: 'Loyalty Tier',
              type: 'enumeration',
              options: [
                { label: 'Basic', value: 'basic' },
                { label: 'Silver', value: 'silver' },
                { label: 'Gold', value: 'gold' },
                { label: 'Platinum', value: 'platinum' },
                { label: 'Ambassador', value: 'ambassador' }
              ]
            },
            {
              name: 'service_history',
              label: 'Service History',
              type: 'string',
              description: 'List of services received'
            },
            {
              name: 'last_appointment_date',
              label: 'Last Appointment Date',
              type: 'date'
            },
            {
              name: 'lifetime_value',
              label: 'Lifetime Value',
              type: 'number',
              description: 'Total revenue from this contact'
            }
          ]
        }
      });

      if (error) throw error;

      return data?.properties_created || [];
    } catch (error) {
      throw new Error(`Failed to create HubSpot properties: ${error.message}`);
    }
  }

  /**
   * Import contacts from real booking data into HubSpot
   */
  private async importRealBookingContacts(connection: any, realBookingData: any[], userId: string) {
    const processedContacts = this.processRealBookingDataForImport(realBookingData);
    
    let importedCount = 0;
    const errors: string[] = [];

    // Batch import contacts to HubSpot
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-data-sync', {
        body: {
          action: 'import_contacts',
          user_id: userId,
          contacts: processedContacts
        }
      });

      if (error) throw error;

      importedCount = data?.imported_count || 0;

      // Also create/update in our local CRM for immediate use
      for (const contact of processedContacts) {
        try {
          await this.upsertLocalContact(userId, contact);
        } catch (error) {
          errors.push(`Failed to sync local contact ${contact.email}: ${error.message}`);
        }
      }

    } catch (error) {
      errors.push(`HubSpot import failed: ${error.message}`);
    }
    
    return {
      contacts: importedCount,
      errors
    };
  }

  /**
   * Process real booking data into contact format
   */
  private processRealBookingDataForImport(realBookingData: any[]) {
    const contactMap = new Map();

    // Aggregate real booking data by contact
    realBookingData.forEach(booking => {
      const key = booking.clientEmail || booking.clientPhone || booking.clientName;
      
      if (!contactMap.has(key)) {
        contactMap.set(key, {
          name: booking.clientName,
          email: booking.clientEmail,
          phone: booking.clientPhone,
          firstBooking: booking.appointmentDate,
          lastBooking: booking.appointmentDate,
          totalBookings: 0,
          totalRevenue: 0,
          services: new Set(),
          status: this.determineContactStatus(booking)
        });
      }

      const contact = contactMap.get(key);
      contact.totalBookings++;
      contact.totalRevenue += booking.revenue || 0;
      contact.services.add(booking.service);
      
      if (new Date(booking.appointmentDate) > new Date(contact.lastBooking)) {
        contact.lastBooking = booking.appointmentDate;
      }
      if (new Date(booking.appointmentDate) < new Date(contact.firstBooking)) {
        contact.firstBooking = booking.appointmentDate;
      }
    });

    return Array.from(contactMap.values()).map(contact => ({
      ...contact,
      services: Array.from(contact.services),
      brandvx_bucket: this.determineRealInitialBucket(contact),
      brandvx_loyalty_tier: this.determineRealLoyaltyTier(contact),
      service_history: Array.from(contact.services).join(', '),
      lifetime_value: contact.totalRevenue,
      last_appointment_date: contact.lastBooking
    }));
  }

  private determineContactStatus(booking: any): string {
    const daysSinceBooking = Math.floor(
      (Date.now() - new Date(booking.appointmentDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceBooking <= 30) return 'active';
    if (daysSinceBooking <= 90) return 'engaged';
    if (daysSinceBooking <= 180) return 'dormant';
    return 'inactive';
  }

  private determineRealInitialBucket(contact: any): number {
    const daysSinceLastBooking = Math.floor(
      (Date.now() - new Date(contact.lastBooking).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastBooking <= 30) return 5; // Retention
    if (daysSinceLastBooking <= 90) return 4; // Engaged
    if (daysSinceLastBooking <= 180) return 3; // Retargeting
    if (contact.totalBookings >= 3) return 2; // Never Answered (but has history)
    return 1; // New Lead
  }

  private determineRealLoyaltyTier(contact: any): string {
    if (contact.totalRevenue >= 2000) return 'platinum';
    if (contact.totalRevenue >= 1000) return 'gold';
    if (contact.totalRevenue >= 500) return 'silver';
    if (contact.totalBookings >= 3) return 'silver';
    return 'basic';
  }

  /**
   * Create deals from real completed bookings
   */
  private async createRealDealsFromBookings(connection: any, realBookingData: any[]) {
    const completedBookings = realBookingData.filter(b => 
      b.status === 'completed' && b.revenue > 0
    );

    try {
      const { data, error } = await supabase.functions.invoke('hubspot-data-sync', {
        body: {
          action: 'create_deals',
          user_id: connection.user_id,
          deals: completedBookings.map(booking => ({
            dealname: `${booking.service} - ${booking.clientName}`,
            amount: booking.revenue,
            closedate: booking.appointmentDate,
            dealstage: 'closedwon',
            pipeline: 'default',
            source: booking.source
          }))
        }
      });

      if (error) throw error;

      return data?.deals_created || [];
    } catch (error) {
      throw new Error(`Failed to create HubSpot deals: ${error.message}`);
    }
  }

  /**
   * Setup real BrandVX workflows in HubSpot
   */
  private async setupRealBrandVXWorkflows(connection: any, preferences: any): Promise<string[]> {
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-data-sync', {
        body: {
          action: 'setup_workflows',
          user_id: connection.user_id,
          workflows: [
            {
              name: 'BrandVX Lead Nurturing Sequence',
              triggers: ['contact_created', 'brandvx_bucket_changed'],
              actions: ['send_email', 'update_properties']
            },
            {
              name: 'Appointment Reminder Workflow',
              triggers: ['appointment_scheduled'],
              actions: ['send_reminder_email', 'send_reminder_sms']
            },
            {
              name: 'Post-Service Follow-up',
              triggers: ['appointment_completed'],
              actions: ['send_feedback_request', 'update_loyalty_tier']
            }
          ],
          preferences
        }
      });

      if (error) throw error;

      return data?.workflows_created || [];
    } catch (error) {
      throw new Error(`Failed to setup HubSpot workflows: ${error.message}`);
    }
  }

  private async setupRealDashboard(connection: any, businessType: string) {
    try {
      await supabase.functions.invoke('hubspot-data-sync', {
        body: {
          action: 'setup_dashboard',
          user_id: connection.user_id,
          business_type: businessType,
          dashboard_config: {
            reports: [
              'lead_bucket_distribution',
              'loyalty_tier_breakdown',
              'service_revenue_analysis',
              'appointment_trends'
            ]
          }
        }
      });
    } catch (error) {
      // Non-critical error, log but don't fail setup
      await supabase
        .from('events')
        .insert({
          user_id: connection.user_id,
          type: 'crm_setup_warning',
          source: 'real_crm_setup',
          metadata: { 
            error: `Dashboard setup failed: ${error.message}`,
            step: 'dashboard_configuration'
          }
        });
    }
  }

  private async upsertLocalContact(userId: string, contact: any) {
    // Check if contact already exists
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .or(`email.eq.${contact.email},phone.eq.${contact.phone}`)
      .maybeSingle();

    if (existingContact) {
      // Update existing contact
      const { error } = await supabase
        .from('contacts')
        .update({
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          status: contact.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingContact.id);

      if (error) throw error;
      return existingContact;
    } else {
      // Create new contact
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          status: contact.status,
          sources: ['real_booking_import'],
          consent_flags: {
            marketing: true,
            sms: !!contact.phone,
            email: !!contact.email
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Create lead status
      await supabase
        .from('lead_status')
        .insert({
          contact_id: newContact.id,
          bucket: contact.brandvx_bucket,
          tag: `${contact.brandvx_bucket}.1`,
          reason: 'Imported from real booking data'
        });

      // Create loyalty score
      await supabase
        .from('loyalty_scores')
        .insert({
          contact_id: newContact.id,
          referrals: 0,
          usage_index: contact.totalBookings * 10,
          tier: contact.brandvx_loyalty_tier,
          time_saved_min: 0
        });

      return newContact;
    }
  }

  /**
   * Assess if user needs CRM setup based on real data
   */
  async assessRealCRMNeeds(userId: string): Promise<{ shouldSetup: boolean; reason: string }> {
    // Check if they already have HubSpot connected
    const hubspotConnection = await this.validateHubSpotConnection(userId);

    if (hubspotConnection) {
      return { shouldSetup: false, reason: 'HubSpot already connected and validated' };
    }

    // Check if they have enough real customer data
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .limit(10);

    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('contact_id', userId)
      .limit(5);

    const hasMinimumData = (contacts?.length || 0) >= 5 || (appointments?.length || 0) >= 3;
    
    return {
      shouldSetup: hasMinimumData,
      reason: hasMinimumData 
        ? 'Sufficient real customer data for meaningful CRM setup' 
        : 'Need more customer data before CRM setup will be valuable'
    };
  }

  /**
   * Automatically setup HubSpot CRM with real data
   */
  async setupRealHubSpotCRM(userId: string): Promise<void> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_name, business_type')
      .eq('id', userId)
      .maybeSingle();

    // Get real booking data from processor
    const { RealDataProcessor } = await import('./RealDataProcessor');
    const processor = new RealDataProcessor();
    const realBookingData = await processor.getRealBookingData(userId);

    // Create setup config with real data
    const config: CRMSetupConfig = {
      userId,
      businessName: profile?.business_name || 'Beauty Business',
      businessType: profile?.business_type || 'salon',
      realBookingData,
      preferences: {
        reminderSettings: { email: true, sms: true },
        enableTimeTracker: true,
        enableSharePrompts: true
      }
    };

    // Setup HubSpot CRM with real data
    const result = await this.setupRealHubSpotFromData(config);
    
    if (!result.success) {
      throw new Error(`CRM setup failed: ${result.errors?.join(', ')}`);
    }
  }
}