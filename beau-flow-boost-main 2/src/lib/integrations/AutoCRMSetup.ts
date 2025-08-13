import { supabase } from '@/integrations/supabase/client';
import { RealCRMSetup } from './RealCRMSetup';

// Deprecated: Redirecting to RealCRMSetup
// This class has been replaced with real CRM integration

interface CRMSetupConfig {
  userId: string;
  businessName: string;
  businessType: string;
  bookingData: any[];
  realBookingData?: any; // Make optional to fix type error
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
 * AutoCRMSetup - Redirects to RealCRMSetup
 * @deprecated Use RealCRMSetup for actual CRM configuration
 */
export class AutoCRMSetup {
  private realSetup: RealCRMSetup;

  constructor() {
    this.realSetup = new RealCRMSetup();
  }
  
  /**
   * @deprecated Use RealCRMSetup.setupRealHubSpotFromData
   */
  async setupHubSpotFromBookings(config: CRMSetupConfig): Promise<HubSpotSetupResult> {
    // Add the required property before passing to real setup
    const configWithRealData = { ...config, realBookingData: config.bookingData };
    return this.realSetup.setupRealHubSpotFromData(configWithRealData);
  }

  private async createLocalContact(userId: string, contact: any) {
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        status: contact.status,
        sources: ['booking_import'],
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
        reason: 'Imported from booking data'
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

  private async saveHubSpotConnection(userId: string, hubspotAccount: any) {
    // Note: In production, these tokens would be encrypted via edge functions
    // This is demo data for the auto-setup flow
    await supabase
      .from('connected_accounts')
      .insert({
        user_id: userId,
        platform: 'hubspot',
        account_id: hubspotAccount.accountId,
        account_label: 'Auto-Generated CRM',
        access_token: hubspotAccount.accessToken, // This would be encrypted in production
        permissions: ['contacts', 'deals', 'workflows'],
        scopes: ['crm.objects.contacts.write', 'crm.objects.deals.write'],
        connected_at: new Date().toISOString(),
        account_data: {
          portal_id: hubspotAccount.portalId,
          auto_created: true,
          brandvx_integrated: true
        }
      });
  }

  /**
   * @deprecated Use RealCRMSetup.assessRealCRMNeeds
   */
  async assessCRMNeeds(userId: string): Promise<{ shouldSetup: boolean; reason: string }> {
    return this.realSetup.assessRealCRMNeeds(userId);
  }

  /**
   * @deprecated Use RealCRMSetup.setupRealHubSpotCRM
   */
  async setupHubSpotCRM(userId: string): Promise<void> {
    return this.realSetup.setupRealHubSpotCRM(userId);
  }
}