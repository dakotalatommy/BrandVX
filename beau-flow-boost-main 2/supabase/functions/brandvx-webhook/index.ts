import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface WebhookPayload {
  source: 'square' | 'acuity' | 'hubspot' | 'twilio' | 'manual';
  event_type: string;
  data: Record<string, any>;
  contact_id?: string;
  user_id?: string;
}

interface BrandVXIntent {
  type: string;
  userId: string;
  contactId?: string;
  payload: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const payload: WebhookPayload = await req.json();
    
    console.log('Webhook received:', { source: payload.source, event_type: payload.event_type });

    let response;

    switch (payload.source) {
      case 'square':
        response = await handleSquareWebhook(payload, supabase);
        break;
      
      case 'acuity':
        response = await handleAcuityWebhook(payload, supabase);
        break;
      
      case 'hubspot':
        response = await handleHubSpotWebhook(payload, supabase);
        break;
      
      case 'twilio':
        response = await handleTwilioWebhook(payload, supabase);
        break;
      
      case 'manual':
        response = await handleManualEvent(payload, supabase);
        break;
      
      default:
        throw new Error(`Unsupported webhook source: ${payload.source}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: response }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function processEvent(eventData: any, supabase: any) {
  try {
    const { error } = await supabase
      .from('events')
      .insert({
        type: eventData.type,
        user_id: eventData.user_id,
        metadata: eventData.metadata || {},
        source: eventData.source
      });

    if (error) {
      console.error('Error inserting event:', error);
    }
  } catch (error) {
    console.error('Event processing error:', error);
  }
}

async function processAgentIntent(intent: BrandVXIntent, supabase: any) {
  try {
    // Route to master agent orchestrator
    const response = await supabase.functions.invoke('master-agent-orchestrator', {
      body: {
        intent,
        temporalContext: { timestamp: new Date().toISOString() }
      }
    });

    if (response.error) {
      console.error('Agent processing error:', response.error);
      return { processed: false, error: response.error };
    }

    return response.data;
  } catch (error) {
    console.error('Error calling agent:', error);
    return { processed: false, error: error.message };
  }
}

async function handleSquareWebhook(payload: WebhookPayload, supabase: any) {
  const { event_type, data } = payload;

  switch (event_type) {
    case 'payment.created':
      // Process new payment event
      await processEvent({
        type: 'payment_received',
        contact_id: data.customer_id,
        user_id: data.merchant_id || 'system',
        metadata: {
          amount: data.amount_money?.amount,
          currency: data.amount_money?.currency,
          transaction_id: data.id,
          payment_method: data.source_type
        },
        source: 'square'
      }, supabase);

      // Trigger post-purchase sequence
      return await processAgentIntent({
        type: 'admin',
        userId: data.merchant_id || 'system',
        contactId: data.customer_id,
        payload: {
          action: 'post_purchase_sequence',
          payment_data: data
        }
      }, supabase);

    case 'booking.created':
      // New appointment booked
      await processEvent({
        type: 'appointment_booked',
        contact_id: data.customer_id,
        user_id: data.merchant_id || 'system',
        metadata: {
          service_type: data.service_variation_name,
          appointment_time: data.start_at,
          location_id: data.location_id
        },
        source: 'square'
      }, supabase);

      return await processAgentIntent({
        type: 'book',
        userId: data.merchant_id || 'system',
        contactId: data.customer_id,
        payload: {
          action: 'confirmation_sequence',
          booking_data: data
        }
      }, supabase);

    default:
      console.log(`Unhandled Square event: ${event_type}`);
      return { processed: false, reason: 'unhandled_event_type' };
  }
}

async function handleAcuityWebhook(payload: WebhookPayload, supabase: any) {
  const { event_type, data } = payload;

  switch (event_type) {
    case 'appointment.scheduled':
      await processEvent({
        type: 'appointment_booked',
        contact_id: data.email, // Acuity uses email as identifier
        user_id: payload.user_id || 'system',
        metadata: {
          appointment_id: data.id,
          service_type: data.appointmentType,
          datetime: data.datetime,
          duration: data.duration,
          price: data.price
        },
        source: 'acuity'
      }, supabase);

      return await processAgentIntent({
        type: 'book',
        userId: payload.user_id || 'system',
        payload: {
          action: 'sync_appointment',
          acuity_data: data
        }
      }, supabase);

    case 'appointment.cancelled':
      await processEvent({
        type: 'appointment_cancelled',
        contact_id: data.email,
        user_id: payload.user_id || 'system',
        metadata: {
          appointment_id: data.id,
          cancellation_reason: data.cancelReason,
          cancelled_by: data.cancelledBy
        },
        source: 'acuity'
      }, supabase);

      return await processAgentIntent({
        type: 'retarget',
        userId: payload.user_id || 'system',
        payload: {
          action: 'cancellation_recovery',
          appointment_data: data
        }
      }, supabase);

    case 'appointment.rescheduled':
      await processEvent({
        type: 'appointment_rescheduled',
        contact_id: data.email,
        user_id: payload.user_id || 'system',
        metadata: {
          appointment_id: data.id,
          old_datetime: data.oldDatetime,
          new_datetime: data.datetime
        },
        source: 'acuity'
      }, supabase);

      return { processed: true, action: 'appointment_updated' };

    default:
      console.log(`Unhandled Acuity event: ${event_type}`);
      return { processed: false, reason: 'unhandled_event_type' };
  }
}

async function handleHubSpotWebhook(payload: WebhookPayload, supabase: any) {
  const { event_type, data } = payload;

  switch (event_type) {
    case 'contact.propertyChange':
      const { propertyName, newValue, objectId } = data;

      await processEvent({
        type: 'contact_updated',
        contact_id: objectId,
        user_id: payload.user_id || 'system',
        metadata: {
          property: propertyName,
          new_value: newValue,
          updated_in: 'hubspot'
        },
        source: 'hubspot'
      }, supabase);

      // Trigger specific actions based on property changes
      if (propertyName === 'lifecyclestage' && newValue === 'customer') {
        return await processAgentIntent({
          type: 'admin',
          userId: payload.user_id || 'system',
          contactId: objectId,
          payload: {
            action: 'welcome_customer_sequence'
          }
        }, supabase);
      }

      return { processed: true, property_updated: propertyName };

    case 'deal.propertyChange':
      await processEvent({
        type: 'deal_updated',
        user_id: payload.user_id || 'system',
        metadata: {
          deal_id: data.objectId,
          property: data.propertyName,
          new_value: data.newValue
        },
        source: 'hubspot'
      }, supabase);

      return { processed: true, deal_updated: data.objectId };

    default:
      console.log(`Unhandled HubSpot event: ${event_type}`);
      return { processed: false, reason: 'unhandled_event_type' };
  }
}

async function handleTwilioWebhook(payload: WebhookPayload, supabase: any) {
  const { event_type, data } = payload;

  switch (event_type) {
    case 'message.received':
      // Incoming SMS/WhatsApp message
      await processEvent({
        type: 'message_received',
        user_id: payload.user_id || 'system',
        metadata: {
          from: data.From,
          body: data.Body,
          message_sid: data.MessageSid,
          media_urls: data.MediaUrl0 ? [data.MediaUrl0] : []
        },
        source: 'twilio'
      }, supabase);

      // Find contact by phone number
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, user_id')
        .eq('phone', data.From)
        .maybeSingle();

      if (contact) {
        return await processAgentIntent({
          type: 'consultation',
          userId: contact.user_id,
          contactId: contact.id,
          payload: {
            message_type: 'inbound_reply',
            message: data.Body,
            channel: 'sms'
          }
        }, supabase);
      }

      return { processed: false, reason: 'contact_not_found' };

    case 'message.status':
      // Message delivery status
      await processEvent({
        type: `message_${data.MessageStatus}`,
        user_id: payload.user_id || 'system',
        metadata: {
          message_sid: data.MessageSid,
          status: data.MessageStatus,
          error_code: data.ErrorCode
        },
        source: 'twilio'
      }, supabase);

      return { processed: true, status_updated: data.MessageStatus };

    default:
      console.log(`Unhandled Twilio event: ${event_type}`);
      return { processed: false, reason: 'unhandled_event_type' };
  }
}

async function handleManualEvent(payload: WebhookPayload, supabase: any) {
  const { event_type, data, contact_id, user_id } = payload;

  // Process the manual event
  await processEvent({
    type: event_type,
    user_id,
    contact_id,
    metadata: data,
    source: 'manual'
  }, supabase);

  // Determine if agent action is needed
  if (data.trigger_agent && contact_id) {
    return await processAgentIntent({
      type: data.intent_type || 'consultation',
      userId: user_id || 'system',
      contactId: contact_id,
      payload: data
    }, supabase);
  }

  return { processed: true, manual_event: event_type };
}