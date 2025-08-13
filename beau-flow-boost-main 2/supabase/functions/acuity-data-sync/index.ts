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

    // Get user's Acuity tokens
    const { data: account } = await supabaseClient
      .from('connected_accounts')
      .select('access_token')
      .eq('user_id', user_id)
      .eq('platform', 'acuity')
      .single()

    if (!account) {
      throw new Error('Acuity account not connected')
    }

    // Decrypt the access token
    const decryptedAccount = await decryptTokenData(account)

    const baseUrl = 'https://acuityscheduling.com/api/v1'

    if (action === 'get_appointments') {
      const params = new URLSearchParams({
        minDate: start_date || new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })

      const response = await fetch(`${baseUrl}/appointments?${params}`, {
        headers: {
          'Authorization': `Bearer ${decryptedAccount.access_token}`
        }
      })

      const appointments = await response.json()
      
      return new Response(JSON.stringify({
        appointments: appointments || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'get_appointment_types') {
      const response = await fetch(`${baseUrl}/appointment-types`, {
        headers: {
          'Authorization': `Bearer ${decryptedAccount.access_token}`
        }
      })

      const appointmentTypes = await response.json()
      
      return new Response(JSON.stringify({
        appointmentTypes: appointmentTypes || []
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