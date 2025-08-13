import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface MessageRequest {
  contactId: string;
  channel: 'sms' | 'email';
  subject?: string;
  body: string;
  templateId?: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const { contactId, channel, subject, body, templateId, userId }: MessageRequest = await req.json();

    console.log(`Sending ${channel} message to contact ${contactId}`);

    // Get contact information
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .maybeSingle();

    if (contactError || !contact) {
      throw new Error(`Contact not found: ${contactId}`);
    }

    // Check consent
    if (!checkMessageConsent(contact, channel)) {
      throw new Error(`Contact has not consented to ${channel} messages`);
    }

    // Get communication settings for the user
    const { data: commSettings } = await supabase
      .from('communication_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('provider_type', channel === 'sms' ? 'twilio' : 'resend')
      .eq('is_active', true)
      .maybeSingle();

    let messageResult;
    
    if (channel === 'sms') {
      messageResult = await sendSMS(contact, body, commSettings);
    } else if (channel === 'email') {
      messageResult = await sendEmail(contact, subject || 'Follow up', body, commSettings);
    } else {
      throw new Error(`Unsupported channel: ${channel}`);
    }

    // Record the message in database
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        contact_id: contactId,
        channel,
        direction: 'outbound',
        body,
        status: messageResult.success ? 'sent' : 'failed',
        template_id: templateId,
        metadata: {
          provider_response: messageResult.response,
          subject: subject,
          to_address: channel === 'sms' ? contact.phone : contact.email
        }
      });

    if (insertError) {
      console.error('Error recording message:', insertError);
    }

    // Update time saved metrics
    await updateTimeSaved(userId, channel === 'sms' ? 2 : 3, 0.1, supabase);

    return new Response(JSON.stringify({
      success: messageResult.success,
      messageId: messageResult.messageId,
      channel,
      contact: contact.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: messageResult.success ? 200 : 400
    });

  } catch (error) {
    console.error('Send message error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

function checkMessageConsent(contact: any, channel: string): boolean {
  const consentFlags = contact.consent_flags || {};
  
  if (channel === 'sms') {
    return consentFlags.sms_consent !== false;
  } else if (channel === 'email') {
    return consentFlags.email_consent !== false;
  }
  
  return false;
}

async function sendSMS(contact: any, body: string, settings: any): Promise<{success: boolean, messageId?: string, response?: any}> {
  if (!contact.phone) {
    throw new Error('Contact has no phone number');
  }

  if (!settings?.configuration?.account_sid || !settings?.configuration?.auth_token) {
    console.warn('Twilio not configured, simulating SMS send');
    return {
      success: true,
      messageId: `sim_${Date.now()}`,
      response: { status: 'simulated' }
    };
  }

  try {
    // Use Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${settings.configuration.account_sid}/Messages.json`;
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${settings.configuration.account_sid}:${settings.configuration.auth_token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: contact.phone,
        From: settings.configuration.phone_number,
        Body: body
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        messageId: result.sid,
        response: result
      };
    } else {
      return {
        success: false,
        response: result
      };
    }
  } catch (error) {
    return {
      success: false,
      response: { error: error.message }
    };
  }
}

async function sendEmail(contact: any, subject: string, body: string, settings: any): Promise<{success: boolean, messageId?: string, response?: any}> {
  if (!contact.email) {
    throw new Error('Contact has no email address');
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!resendApiKey) {
    console.warn('Resend not configured, simulating email send');
    return {
      success: true,
      messageId: `sim_${Date.now()}`,
      response: { status: 'simulated' }
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: settings?.configuration?.from_email || 'hello@brandvx.app',
        to: [contact.email],
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${subject}</h2>
            <div style="line-height: 1.6; color: #555;">
              ${body.replace(/\n/g, '<br>')}
            </div>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #888;">
              You received this message because you're a valued contact. 
              <a href="#" style="color: #888;">Unsubscribe</a>
            </p>
          </div>
        `
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        messageId: result.id,
        response: result
      };
    } else {
      return {
        success: false,
        response: result
      };
    }
  } catch (error) {
    return {
      success: false,
      response: { error: error.message }
    };
  }
}

async function updateTimeSaved(userId: string, baselineMin: number, autoMin: number, supabase: any): Promise<void> {
  try {
    await supabase
      .from('events')
      .insert({
        user_id: userId,
        type: 'time_saved',
        source: 'message_automation',
        baseline_min: baselineMin,
        auto_min: autoMin,
        metadata: { 
          time_saved_minutes: baselineMin - autoMin,
          task: 'send_message'
        }
      });
  } catch (error) {
    console.error('Error updating time saved:', error);
  }
}