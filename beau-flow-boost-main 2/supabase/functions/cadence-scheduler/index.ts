import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface CadenceStep {
  id: string;
  bucket: number;
  tag: string;
  step: number;
  delay_hours: number;
  channel: 'sms' | 'email' | 'call';
  template_id: string;
  conditions?: {
    min_engagement_score?: number;
    max_attempts?: number;
    exclude_tags?: string[];
  };
}

interface CadenceTemplate {
  id: string;
  name: string;
  subject?: string;
  body: string;
  variables: string[];
  tone: 'professional' | 'casual' | 'urgent' | 'empathetic';
  industry_specific?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    console.log('Starting cadence scheduler process...');
    
    // Process all scheduled cadences
    const processedCount = await processScheduledCadences(supabase);
    
    const now = new Date().toISOString();
    console.log(`Cadence scheduler processed ${processedCount} items at ${now}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed_count: processedCount,
        timestamp: now 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Cadence scheduler error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function processScheduledCadences(supabase: any): Promise<number> {
  const now = new Date().toISOString();
  
  // Get all contacts with pending actions
  const { data: pendingContacts, error } = await supabase
    .from('lead_status')
    .select('contact_id, bucket, tag, next_action_at')
    .lte('next_action_at', now);

  if (error) {
    console.error('Error fetching pending contacts:', error);
    return 0;
  }

  if (!pendingContacts?.length) {
    console.log('No pending cadence contacts found');
    return 0;
  }

  console.log(`Found ${pendingContacts.length} contacts with pending cadence actions`);

  let processedCount = 0;

  // Process each contact
  for (const contactData of pendingContacts) {
    try {
      await executeNextCadenceStep(contactData, supabase);
      processedCount++;
    } catch (error) {
      console.error(`Failed to process cadence for contact ${contactData.contact_id}:`, error);
      await logCadenceError(contactData.contact_id, error, supabase);
    }
  }

  return processedCount;
}

async function executeNextCadenceStep(contactData: any, supabase: any): Promise<void> {
  const { contact_id, bucket, tag } = contactData;

  // Get contact data
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contact_id)
    .maybeSingle();

  if (contactError || !contact) {
    console.error(`Contact not found: ${contact_id}`);
    return;
  }

  // Get next cadence step
  const cadenceStep = await getNextCadenceStep(bucket, tag, contact_id, supabase);
  if (!cadenceStep) {
    await completeCadence(contact_id, 'no_more_steps', supabase);
    return;
  }

  // Check step conditions
  if (!checkStepConditions(cadenceStep, contact)) {
    await skipCadenceStep(contact_id, cadenceStep.id, 'conditions_not_met', supabase);
    return;
  }

  // Get personalized template
  const template = await getPersonalizedTemplate(cadenceStep.template_id, contact, supabase);
  
  // Execute the cadence step via master agent
  const response = await processAgentIntent({
    type: 'cadence',
    userId: contact.user_id || 'system',
    contactId: contact_id,
    payload: {
      step: cadenceStep.step,
      campaign: `${bucket}.${tag}`,
      channel: cadenceStep.channel,
      template,
      contact_data: contact
    }
  }, supabase);

  // Schedule next step if cadence continues
  if (response?.nextActions?.includes('continue_cadence')) {
    await scheduleNextStep(contact_id, bucket, tag, cadenceStep.step + 1, supabase);
  } else {
    await completeCadence(contact_id, response?.data?.completion_reason || 'sequence_complete', supabase);
  }

  // Track cadence performance
  await trackCadenceMetrics(contact_id, cadenceStep, response, supabase);
}

async function getNextCadenceStep(bucket: number, tag: string, contactId: string, supabase: any): Promise<CadenceStep | null> {
  // Get current cadence step from lead_status
  const { data: leadStatus } = await supabase
    .from('lead_status')
    .select('cadence_step, contact_id')
    .eq('contact_id', contactId)
    .maybeSingle();

  if (!leadStatus) return null;

  const nextStepNumber = leadStatus.cadence_step || 1;

  // Get user_id from contact
  const { data: contact } = await supabase
    .from('contacts')
    .select('user_id')
    .eq('id', contactId)
    .maybeSingle();

  if (!contact?.user_id) return null;

  // Get next cadence rule from new table
  const { data: cadenceRule } = await supabase
    .from('cadence_rules')
    .select('*')
    .eq('user_id', contact.user_id)
    .eq('bucket', bucket)
    .eq('tag', tag)
    .eq('step_number', nextStepNumber)
    .eq('is_active', true)
    .maybeSingle();

  if (!cadenceRule) return null;

  return {
    id: cadenceRule.id,
    bucket: cadenceRule.bucket,
    tag: cadenceRule.tag,
    step: cadenceRule.step_number,
    delay_hours: cadenceRule.delay_hours,
    channel: cadenceRule.channel as 'sms' | 'email' | 'call',
    template_id: `template_${cadenceRule.id}`,
    conditions: {
      max_attempts: 5
    }
  };
}

function checkStepConditions(step: CadenceStep, contact: any): boolean {
  if (step.conditions) {
    // Check excluded tags
    if (step.conditions.exclude_tags?.some(tag => contact.tags?.includes(tag))) {
      return false;
    }
  }

  return true;
}

async function getPersonalizedTemplate(templateId: string, contact: any, supabase: any): Promise<CadenceTemplate> {
  // Get the template content from cadence_rules via templateId (which is the rule id)
  const { data: cadenceRule } = await supabase
    .from('cadence_rules')
    .select('template_content, channel')
    .eq('id', templateId.replace('template_', ''))
    .maybeSingle();

  const templateContent = cadenceRule?.template_content || 'Hi {first_name}, just wanted to follow up with you!';

  const template: CadenceTemplate = {
    id: templateId,
    name: 'Cadence Template',
    subject: `Follow up from ${contact.business_name || 'Beauty Services'}`,
    body: templateContent,
    variables: ['first_name', 'name', 'business_name', 'service'],
    tone: 'professional'
  };

  // Personalize template with contact data
  let personalizedBody = template.body;
  let personalizedSubject = template.subject || '';
  
  // Replace common variables
  const variables = {
    '{name}': contact.name || 'there',
    '{first_name}': contact.name?.split(' ')[0] || 'there',
    '{business_name}': contact.business_name || 'your business',
    '{service}': contact.preferred_service || 'our services',
    '{appointment_type}': contact.last_appointment_type || 'appointment'
  };

  Object.entries(variables).forEach(([placeholder, value]) => {
    personalizedBody = personalizedBody.replace(new RegExp(placeholder, 'g'), value);
    personalizedSubject = personalizedSubject.replace(new RegExp(placeholder, 'g'), value);
  });

  return {
    ...template,
    body: personalizedBody,
    subject: personalizedSubject
  };
}

async function scheduleNextStep(contactId: string, bucket: number, tag: string, nextStep: number, supabase: any): Promise<void> {
  // Use default delay since table doesn't exist yet
  const defaultDelayHours = 24;

  const nextActionAt = new Date();
  nextActionAt.setHours(nextActionAt.getHours() + defaultDelayHours);

  await supabase
    .from('lead_status')
    .update({ 
      next_action_at: nextActionAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('contact_id', contactId);
}

async function completeCadence(contactId: string, reason: string, supabase: any): Promise<void> {
  await supabase
    .from('lead_status')
    .update({ 
      next_action_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('contact_id', contactId);

  // Log completion event
  await supabase
    .from('events')
    .insert({
      user_id: contactId,
      type: 'cadence_completed',
      source: 'cadence_engine',
      metadata: { reason }
    });
}

async function skipCadenceStep(contactId: string, stepId: string, reason: string, supabase: any): Promise<void> {
  await supabase
    .from('events')
    .insert({
      user_id: contactId,
      type: 'cadence_step_skipped',
      source: 'cadence_engine',
      metadata: { step_id: stepId, reason }
    });
}

async function trackCadenceMetrics(contactId: string, step: CadenceStep, response: any, supabase: any): Promise<void> {
  // Track metrics in events table
  await supabase
    .from('events')
    .insert({
      user_id: contactId,
      type: 'cadence_metrics_tracked',
      source: 'cadence_engine',
      metadata: {
        step_id: step.id,
        channel: step.channel,
        template_id: step.template_id,
        response_type: response?.type,
        engagement_generated: response?.data?.engagement_score || 0,
        conversion_event: response?.data?.conversion_event || null
      }
    });
}

async function logCadenceError(contactId: string, error: any, supabase: any): Promise<void> {
  await supabase
    .from('events')
    .insert({
      user_id: contactId,
      type: 'cadence_error',
      source: 'cadence_engine',
      metadata: { 
        error: error.message,
        stack: error.stack?.substring(0, 1000)
      }
    });
}

async function processAgentIntent(intent: any, supabase: any) {
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