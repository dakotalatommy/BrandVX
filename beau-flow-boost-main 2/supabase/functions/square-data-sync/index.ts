import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decryptTokenData } from '../_shared/token-encryption.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, user_id, start_date } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user's Square tokens
    const { data: account } = await supabaseClient
      .from('connected_accounts')
      .select('access_token')
      .eq('user_id', user_id)
      .eq('platform', 'square')
      .single()

    if (!account) {
      throw new Error('Square account not connected')
    }

    // Decrypt the access token
    const decryptedAccount = await decryptTokenData(account)

    const isProduction = Deno.env.get('SQUARE_ENVIRONMENT') === 'production'
    const baseUrl = isProduction 
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    if (action === 'get_transactions') {
      const response = await fetch(`${baseUrl}/v2/payments`, {
        headers: {
          'Authorization': `Bearer ${decryptedAccount.access_token}`,
          'Square-Version': '2023-10-18'
        }
      })

      const data = await response.json()
      
      return new Response(JSON.stringify({
        transactions: data.payments || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'get_customers') {
      const response = await fetch(`${baseUrl}/v2/customers`, {
        headers: {
          'Authorization': `Bearer ${decryptedAccount.access_token}`,
          'Square-Version': '2023-10-18'
        }
      })

      const data = await response.json()
      
      return new Response(JSON.stringify({
        customers: data.customers || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})