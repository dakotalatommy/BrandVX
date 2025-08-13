import { supabase } from "@/integrations/supabase/client";

export interface SquareTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  merchant_id: string;
}

export interface SquareTransaction {
  id: string;
  amount: number;
  currency: string;
  created_at: string;
  customer_id?: string;
  source_type: string;
}

export class SquareConnector {
  private static readonly SQUARE_API_BASE = 'https://connect.squareup.com';
  private static readonly SQUARE_SANDBOX_BASE = 'https://connect.squareupsandbox.com';

  /**
   * Generate Square OAuth URL for customer authorization
   */
  static generateAuthUrl(userId: string, isProduction = false): string {
    const baseUrl = isProduction ? this.SQUARE_API_BASE : this.SQUARE_SANDBOX_BASE;
    const clientId = isProduction ? 'SQUARE_PROD_CLIENT_ID' : 'SQUARE_SANDBOX_CLIENT_ID';
    
    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'PAYMENTS_READ CUSTOMERS_READ ORDERS_READ',
      session: 'false',
      state: userId, // Pass user ID to link the authorization
      redirect_uri: `${window.location.origin}/integrations/square/callback`,
    });

    return `${baseUrl}/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, userId: string): Promise<SquareTokens> {
    const response = await supabase.functions.invoke('square-oauth', {
      body: {
        action: 'exchange_code',
        code,
        user_id: userId
      }
    });

    if (response.error) {
      throw new Error(`Square token exchange failed: ${response.error.message}`);
    }

    return response.data;
  }

  /**
   * Get transactions from Square for the last 6 months
   */
  async getTransactions(userId: string, startDate?: Date): Promise<SquareTransaction[]> {
    const sixMonthsAgo = startDate || new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
    
    const response = await supabase.functions.invoke('square-data-sync', {
      body: {
        action: 'get_transactions',
        user_id: userId,
        start_date: sixMonthsAgo.toISOString()
      }
    });

    if (response.error) {
      throw new Error(`Failed to fetch Square transactions: ${response.error.message}`);
    }

    return response.data.transactions || [];
  }

  /**
   * Get customer data from Square
   */
  async getCustomers(userId: string): Promise<any[]> {
    const response = await supabase.functions.invoke('square-data-sync', {
      body: {
        action: 'get_customers',
        user_id: userId
      }
    });

    if (response.error) {
      throw new Error(`Failed to fetch Square customers: ${response.error.message}`);
    }

    return response.data.customers || [];
  }

  /**
   * Sync Square data to our database
   */
  async syncToDatabase(userId: string): Promise<void> {
    const [transactions, customers] = await Promise.all([
      this.getTransactions(userId),
      this.getCustomers(userId)
    ]);

    // Store revenue records
    const revenueRecords = transactions.map(tx => ({
      user_id: userId,
      amount: tx.amount / 100, // Square amounts are in cents
      currency: tx.currency,
      source: 'square',
      pos_ref: tx.id,
      created_at: tx.created_at
    }));

    if (revenueRecords.length > 0) {
      await supabase.from('revenue_records').insert(revenueRecords);
    }

    // Store/update contacts from customers
    for (const customer of customers) {
      if (customer.email_address || customer.phone_number) {
        await supabase.from('contacts').upsert({
          user_id: userId,
          name: `${customer.given_name || ''} ${customer.family_name || ''}`.trim(),
          email: customer.email_address,
          phone: customer.phone_number,
          sources: ['square'],
          status: 'customer'
        }, {
          onConflict: 'user_id,email',
          ignoreDuplicates: false
        });
      }
    }
  }
}