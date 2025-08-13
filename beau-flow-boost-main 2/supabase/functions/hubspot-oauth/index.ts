import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encryptTokenData } from '../_shared/token-encryption.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, code, user_id } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'exchange_code') {
      // Exchange code for tokens
      const clientId = Deno.env.get('HUBSPOT_CLIENT_ID')
      const clientSecret = Deno.env.get('HUBSPOT_CLIENT_SECRET')
      
      const tokenUrl = 'https://api.hubapi.com/oauth/v1/token'

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId!,
          client_secret: clientSecret!,
          code: code,
          redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/hubspot-oauth`
        })
      })

      const tokenData = await response.json()

      if (!response.ok) {
        throw new Error(`HubSpot OAuth failed: ${tokenData.message}`)
      }

      // Store encrypted tokens in database
      const encryptedData = await encryptTokenData({
        user_id,
        platform: 'hubspot',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        connected_at: new Date().toISOString()
      });

      await supabaseClient.from('connected_accounts').upsert(encryptedData)

      return new Response(JSON.stringify(tokenData), {
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