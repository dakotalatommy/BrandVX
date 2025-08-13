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
      const clientId = Deno.env.get('SQUARE_CLIENT_ID')
      const clientSecret = Deno.env.get('SQUARE_CLIENT_SECRET')
      const isProduction = Deno.env.get('SQUARE_ENVIRONMENT') === 'production'
      
      const tokenUrl = isProduction 
        ? 'https://connect.squareup.com/oauth2/token'
        : 'https://connect.squareupsandbox.com/oauth2/token'

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code'
        })
      })

      const tokenData = await response.json()

      if (!response.ok) {
        throw new Error(`Square OAuth failed: ${tokenData.error_description}`)
      }

      // Store encrypted tokens in database
      const encryptedData = await encryptTokenData({
        user_id,
        platform: 'square',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        merchant_id: tokenData.merchant_id,
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