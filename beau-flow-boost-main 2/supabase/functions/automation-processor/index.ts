import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, eventType, eventData } = await req.json();

    if (!userId || !eventType) {
      throw new Error('userId and eventType are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store the analytics event
    const { error: eventError } = await supabase
      .from('analytics_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData || {},
        session_id: eventData?.session_id || null
      });

    if (eventError) {
      throw eventError;
    }

    // Process different automation triggers
    const automationTriggers = await supabase
      .from('automation_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('trigger_type', eventType);

    if (automationTriggers.error) {
      throw automationTriggers.error;
    }

    const executedActions = [];

    for (const rule of automationTriggers.data || []) {
      const { trigger_conditions, actions } = rule;
      
      // Check if conditions match
      let shouldTrigger = true;
      for (const [key, value] of Object.entries(trigger_conditions)) {
        if (eventData[key] !== value) {
          shouldTrigger = false;
          break;
        }
      }

      if (shouldTrigger) {
        // Execute actions
        for (const action of actions) {
          try {
            await executeAction(supabase, userId, action, eventData);
            executedActions.push({
              rule_id: rule.id,
              action_type: action.type,
              status: 'success'
            });
          } catch (actionError) {
            console.error('Action execution failed:', actionError);
            executedActions.push({
              rule_id: rule.id,
              action_type: action.type,
              status: 'failed',
              error: actionError.message
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        triggered_actions: executedActions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in automation processor:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function executeAction(supabase: any, userId: string, action: any, eventData: any) {
  switch (action.type) {
    case 'send_message':
      await sendAutomatedMessage(supabase, userId, action, eventData);
      break;
    case 'update_lead_status':
      await updateLeadStatus(supabase, userId, action, eventData);
      break;
    case 'create_task':
      await createTask(supabase, userId, action, eventData);
      break;
    case 'trigger_cadence':
      await triggerCadence(supabase, userId, action, eventData);
      break;
    default:
      console.log('Unknown action type:', action.type);
  }
}

async function sendAutomatedMessage(supabase: any, userId: string, action: any, eventData: any) {
  const { contact_id, template, channel } = action.params;
  
  const { error } = await supabase
    .from('messages')
    .insert({
      contact_id: contact_id || eventData.contact_id,
      channel: channel || 'email',
      body: template.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => eventData[key] || match),
      status: 'queued',
      direction: 'outbound',
      metadata: {
        automated: true,
        trigger_event: eventData.event_type
      }
    });

  if (error) throw error;
}

async function updateLeadStatus(supabase: any, userId: string, action: any, eventData: any) {
  const { contact_id, bucket, tag } = action.params;
  
  const { error } = await supabase
    .from('lead_status')
    .upsert({
      contact_id: contact_id || eventData.contact_id,
      bucket: bucket,
      tag: tag,
      reason: 'Automated update',
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}

async function createTask(supabase: any, userId: string, action: any, eventData: any) {
  // This could integrate with a tasks system
  console.log('Creating task:', action.params);
}

async function triggerCadence(supabase: any, userId: string, action: any, eventData: any) {
  const { contact_id, cadence_template_id } = action.params;
  
  const { error } = await supabase
    .from('cadence_sequences')
    .insert({
      user_id: userId,
      contact_id: contact_id || eventData.contact_id,
      template_id: cadence_template_id,
      sequence_step: 1,
      scheduled_for: new Date().toISOString(),
      status: 'pending'
    });

  if (error) throw error;
}