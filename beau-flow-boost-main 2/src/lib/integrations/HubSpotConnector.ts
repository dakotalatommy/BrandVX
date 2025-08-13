import { supabase } from "@/integrations/supabase/client";

export interface HubSpotTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  hub_id: string;
}

export interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    lifecyclestage?: string;
    createdate?: string;
  };
}

export class HubSpotConnector {
  private static readonly HUBSPOT_API_BASE = 'https://api.hubapi.com';

  /**
   * Generate HubSpot OAuth URL for customer authorization
   */
  static generateAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: 'HUBSPOT_CLIENT_ID',
      redirect_uri: `${window.location.origin}/integrations/hubspot/callback`,
      scope: 'contacts',
      state: userId,
    });

    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, userId: string): Promise<HubSpotTokens> {
    const response = await supabase.functions.invoke('hubspot-oauth', {
      body: {
        action: 'exchange_code',
        code,
        user_id: userId
      }
    });

    if (response.error) {
      throw new Error(`HubSpot token exchange failed: ${response.error.message}`);
    }

    return response.data;
  }

  /**
   * Get contacts from HubSpot
   */
  async getContacts(userId: string): Promise<HubSpotContact[]> {
    const response = await supabase.functions.invoke('hubspot-data-sync', {
      body: {
        action: 'get_contacts',
        user_id: userId
      }
    });

    if (response.error) {
      throw new Error(`Failed to fetch HubSpot contacts: ${response.error.message}`);
    }

    return response.data.contacts || [];
  }

  /**
   * Create a contact in HubSpot
   */
  async createContact(userId: string, contactData: {
    email: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    lifecyclestage?: string;
  }): Promise<string> {
    const response = await supabase.functions.invoke('hubspot-data-sync', {
      body: {
        action: 'create_contact',
        user_id: userId,
        contact_data: contactData
      }
    });

    if (response.error) {
      throw new Error(`Failed to create HubSpot contact: ${response.error.message}`);
    }

    return response.data.contact_id;
  }

  /**
   * Auto-setup HubSpot CRM based on existing booking data
   */
  async autoSetupCRM(userId: string): Promise<void> {
    // Get existing contacts from our database
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId);

    if (!existingContacts?.length) return;

    // Create contacts in HubSpot
    for (const contact of existingContacts) {
      if (contact.email) {
        try {
          const hubspotContactId = await this.createContact(userId, {
            email: contact.email,
            firstname: contact.name?.split(' ')[0],
            lastname: contact.name?.split(' ').slice(1).join(' '),
            phone: contact.phone,
            lifecyclestage: contact.status === 'customer' ? 'customer' : 'lead'
          });

          // Update our contact with HubSpot reference
          await supabase
            .from('contacts')
            .update({
              sources: [...(contact.sources || []), 'hubspot']
            })
            .eq('id', contact.id);

        } catch (error) {
          console.error(`Failed to create HubSpot contact for ${contact.email}:`, error);
        }
      }
    }
  }

  /**
   * Sync HubSpot data to our database
   */
  async syncToDatabase(userId: string): Promise<void> {
    const hubspotContacts = await this.getContacts(userId);

    const contactRecords = hubspotContacts.map(contact => ({
      user_id: userId,
      name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
      email: contact.properties.email,
      phone: contact.properties.phone,
      sources: ['hubspot'],
      status: contact.properties.lifecyclestage === 'customer' ? 'customer' : 'lead'
    }));

    // Upsert contacts
    for (const contact of contactRecords) {
      if (contact.email) {
        await supabase.from('contacts').upsert(contact, {
          onConflict: 'user_id,email',
          ignoreDuplicates: false
        });
      }
    }
  }
}