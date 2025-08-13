import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPECIALIST_AGENTS = {
  'appointment_manager': {
    role: 'Appointment and Scheduling Specialist',
    expertise: 'Managing bookings, calendar optimization, client scheduling conflicts',
    prompt: 'You specialize in appointment management and scheduling optimization for beauty professionals.'
  },
  'treatment_manager': {
    role: 'Treatment and Service Coordinator',
    expertise: 'Treatment protocols, service recommendations, aftercare instructions',
    prompt: 'You coordinate treatments and services, ensuring optimal client experience and outcomes.'
  },
  'content_creator': {
    role: 'Brand Content and Marketing Specialist',
    expertise: 'Social media content, marketing campaigns, brand voice consistency',
    prompt: 'You create engaging content that maintains brand voice and drives client engagement.'
  },
  'inventory_manager': {
    role: 'Inventory and Supply Chain Specialist',
    expertise: 'Stock management, supplier relationships, cost optimization',
    prompt: 'You manage inventory levels, supplier relationships, and operational efficiency.'
  },
  'admin_revenue': {
    role: 'Administrative and Revenue Specialist',
    expertise: 'Financial tracking, administrative tasks, business metrics',
    prompt: 'You handle administrative tasks, revenue tracking, and business performance analysis.'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const { specialistType, intent, context, userId } = await req.json();

    console.log(`Routing to specialist: ${specialistType}`, intent);

    // Get user profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Get or create specialist agent record
    const { data: specialist } = await supabase
      .from('agent_specialists')
      .select('*')
      .eq('user_id', userId)
      .eq('specialist_type', specialistType)
      .maybeSingle();

    if (!specialist) {
      // Create new specialist agent
      await supabase
        .from('agent_specialists')
        .insert({
          user_id: userId,
          specialist_type: specialistType,
          status: 'active',
          configuration: SPECIALIST_AGENTS[specialistType] || {}
        });
    }

    // Process with specialist AI
    const response = await processWithSpecialist(
      specialistType, 
      intent, 
      context, 
      profile,
      supabase
    );

    // Update FTSS state for time savings tracking
    await updateFTSSState(userId, specialistType, response, supabase);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Specialist router error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      type: 'specialist_error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processWithSpecialist(
  specialistType: string,
  intent: any,
  context: any,
  profile: any,
  supabase: any
) {
  const specialist = SPECIALIST_AGENTS[specialistType];
  if (!specialist) {
    throw new Error(`Unknown specialist type: ${specialistType}`);
  }

  const systemPrompt = `${specialist.prompt}

SPECIALIST ROLE: ${specialist.role}
EXPERTISE: ${specialist.expertise}

USER CONTEXT:
- Business: ${profile.business_name || 'Beauty Professional'}
- Type: ${profile.business_type || 'General'}
- Monthly Revenue: $${profile.monthly_revenue || 'Unknown'}
- Admin Hours/Week: ${profile.admin_hours_per_week || 'Unknown'}

INTENT: ${JSON.stringify(intent)}
CONTEXT: ${JSON.stringify(context)}

You must:
1. Provide specific, actionable recommendations
2. Focus on time-saving and efficiency gains
3. Maintain brand voice consistency
4. Consider hierarchy and user permissions
5. Suggest concrete next steps

Respond in JSON format:
{
  "specialist": "${specialistType}",
  "recommendation": "specific recommendation",
  "actions": ["action1", "action2"],
  "timeSavingMinutes": estimated_minutes_saved,
  "priority": "high|medium|low",
  "data": {relevant_structured_data}
}`;

  try {
    // Try GPT-5 first
    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5', // GPT-5 for superior specialist reasoning
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Execute specialist agentic task: ${JSON.stringify(intent)}
          
          As a specialized agent, leverage GPT-5's capabilities for:
          - Deep domain expertise and reasoning
          - Complex task decomposition and execution  
          - Tool integration and workflow orchestration
          - Intelligent decision making with context awareness
          - Persistent memory updates for learning
          
          Provide expert-level specialized responses with actionable outcomes.` }
        ],
        temperature: 0.5, // Lower temperature for specialist precision
        max_tokens: 1000, // Increased for detailed specialist responses
        tools: [
          {
            type: "function",
            function: {
              name: "execute_specialist_action",
              description: "Execute domain-specific actions with tools",
              parameters: {
                type: "object", 
                properties: {
                  action_type: { type: "string" },
                  parameters: { type: "object" },
                  tools_used: { type: "array", items: { type: "string" } }
                },
                required: ["action_type"]
              }
            }
          }
        ],
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      // Fallback to GPT-4.1
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Process this specialist request: ${JSON.stringify(intent)}` }
          ],
          temperature: 0.6,
          max_tokens: 800,
        }),
      });
      console.log('Used GPT-4.1 fallback for specialist');
    } else {
      console.log('Used GPT-5 for specialist');
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);

  } catch (error) {
    console.error('Specialist AI error:', error);
    return {
      specialist: specialistType,
      recommendation: 'Unable to process request at this time',
      actions: ['retry_later'],
      timeSavingMinutes: 0,
      priority: 'low',
      data: { error: error.message }
    };
  }
}

async function updateFTSSState(
  userId: string,
  specialistType: string,
  response: any,
  supabase: any
) {
  try {
    await supabase
      .from('ftss_states')
      .upsert({
        user_id: userId,
        specialist_type: specialistType,
        time_saved_minutes: response.timeSavingMinutes || 0,
        sharing_score: calculateSharingScore(response),
        state_data: {
          recommendation: response.recommendation,
          actions: response.actions,
          priority: response.priority,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('Error updating FTSS state:', error);
  }
}

function calculateSharingScore(response: any): number {
  // Calculate sharing potential based on recommendation quality and actionability
  let score = 0;
  
  if (response.actions && response.actions.length > 0) score += 3;
  if (response.priority === 'high') score += 2;
  if (response.timeSavingMinutes > 0) score += Math.min(5, Math.floor(response.timeSavingMinutes / 10));
  
  return Math.min(10, score);
}