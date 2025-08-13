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

    // Get user's HubSpot tokens or fallback to private token
    const { data: account } = await supabaseClient
      .from('connected_accounts')
      .select('access_token')
      .eq('user_id', user_id)
      .eq('platform', 'hubspot')
      .single()

    const HUBSPOT_PRIVATE_TOKEN = Deno.env.get('HUBSPOT_PRIVATE_TOKEN')
    const hasPrivateToken = !!HUBSPOT_PRIVATE_TOKEN
    if (!account && !hasPrivateToken) {
      throw new Error('HubSpot account not connected')
    }

    const decryptedAccount = account ? await decryptTokenData(account) : null

    const baseUrl = 'https://api.hubapi.com'

    const authHeader = hasPrivateToken
      ? { 'Authorization': `Bearer ${HUBSPOT_PRIVATE_TOKEN}` }
      : { 'Authorization': `Bearer ${decryptedAccount!.access_token}` }

    if (action === 'get_contacts') {
      const response = await fetch(`${baseUrl}/crm/v3/objects/contacts?limit=100`, { headers: authHeader })

      const data = await response.json()
      
      return new Response(JSON.stringify({
        contacts: data.results || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'get_deals') {
      const response = await fetch(`${baseUrl}/crm/v3/objects/deals?limit=100`, { headers: authHeader })

      const data = await response.json()
      
      return new Response(JSON.stringify({
        deals: data.results || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'create_contact') {
      const { contact_data } = await req.json()
      
      const response = await fetch(`${baseUrl}/crm/v3/objects/contacts`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: contact_data })
      })

      const newContact = await response.json()
      
      return new Response(JSON.stringify({
        contact: newContact
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