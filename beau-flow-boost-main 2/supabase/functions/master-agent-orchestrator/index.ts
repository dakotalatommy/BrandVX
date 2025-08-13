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

interface AgentIntent {
  type: string;
  userId: string;
  contactId?: string;
  payload: any;
  hierarchyLevel: string;
  adminRole?: string;
}

interface AgentResponse {
  type: string;
  text: string;
  data?: any;
  nextActions?: string[];
  events?: any[];
  sovereigntyHash?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const { intent, temporalContext } = await req.json();

    console.log('Master Agent processing intent:', intent);

    // Validate sovereignty and authorization
    const { data: profile } = await supabase
      .from('profiles')
      .select('hierarchy_level, admin_role, tenant_id')
      .eq('id', intent.userId)
      .single();

    if (!profile) {
      throw new Error('Unauthorized: No valid profile found');
    }

    // Check master agent shell authorization
    const { data: masterShell } = await supabase
      .from('master_agent_shell')
      .select('*')
      .eq('authorized_by', intent.userId)
      .eq('status', 'active')
      .maybeSingle();

    let sovereigntyHash = masterShell?.sovereignty_hash;
    
    if (!masterShell && profile.hierarchy_level === 'owner') {
      // Initialize master agent shell for owner
      const newShell = {
        authorized_by: intent.userId,
        status: 'active',
        sovereignty_hash: `sovereignty_${Date.now()}_${intent.userId}`
      };
      
      const { data: createdShell } = await supabase
        .from('master_agent_shell')
        .insert(newShell)
        .select()
        .single();
      
      sovereigntyHash = createdShell.sovereignty_hash;
    }

    // Route to appropriate specialist based on intent type and hierarchy
    const response = await routeToSpecialist(intent, profile, temporalContext, supabase);
    
    // Update temporal synthesis state
    await updateTemporalState(intent, response, supabase);

    return new Response(JSON.stringify({
      ...response,
      sovereigntyHash,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Master Agent error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      type: 'system_error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function routeToSpecialist(
  intent: AgentIntent, 
  profile: any, 
  temporalContext: any,
  supabase: any
): Promise<AgentResponse> {
  
  const systemPrompt = `You are the Master Agent of the BrandVX AI hierarchy system. 
  
  HIERARCHY CONTEXT:
  - User Level: ${profile.hierarchy_level}
  - Admin Role: ${profile.admin_role || 'none'}
  - Tenant: ${profile.tenant_id}
  
  INTENT: ${intent.type}
  PAYLOAD: ${JSON.stringify(intent.payload)}
  
  TEMPORAL CONTEXT: ${JSON.stringify(temporalContext)}
  
  You must orchestrate specialist agents based on the BrandVX framework:
  - Appointment Management
  - Treatment Coordination  
  - Content Creation
  - Inventory Control
  - Revenue Administration
  
  Respond with a structured JSON containing:
  - type: response type
  - text: human readable response
  - data: structured data if needed
  - nextActions: array of follow-up actions
  - events: array of events to log
  
  Keep responses concise and actionable. Route complex tasks to appropriate specialists.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5', // GPT-5 for best agentic execution
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Execute this agentic workflow: ${JSON.stringify(intent)}
          
          Use your advanced reasoning and planning capabilities to:
          1. Understand the complex intent and context
          2. Plan multi-step execution if needed
          3. Leverage appropriate tools and specialists
          4. Provide intelligent recommendations
          5. Update memory for future context
          
          Apply agentic principles for optimal task accomplishment.` }
        ],
        temperature: 0.6, // Slightly lower for more consistent agentic behavior
        max_tokens: 1200, // Increased for complex agentic responses
        tools: [
          {
            type: "function",
            function: {
              name: "route_to_specialist",
              description: "Route complex tasks to specialized agents",
              parameters: {
                type: "object",
                properties: {
                  specialist: { type: "string", enum: ["appointment_manager", "treatment_manager", "content_creator", "inventory_manager", "admin_revenue"] },
                  task_context: { type: "object" },
                  priority: { type: "string", enum: ["high", "medium", "low"] }
                },
                required: ["specialist", "task_context"]
              }
            }
          },
          {
            type: "function", 
            function: {
              name: "execute_workflow",
              description: "Execute multi-step agentic workflows",
              parameters: {
                type: "object",
                properties: {
                  workflow_steps: { type: "array", items: { type: "string" } },
                  tools_needed: { type: "array", items: { type: "string" } },
                  expected_outcome: { type: "string" }
                },
                required: ["workflow_steps"]
              }
            }
          }
        ],
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      // Fallback to GPT-4.1 if GPT-5 is not available
      const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Process this intent: ${JSON.stringify(intent)}` }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });
      
      const fallbackData = await fallbackResponse.json();
      console.log('Used GPT-4.1 fallback');
      return JSON.parse(fallbackData.choices[0].message.content);
    }

    const data = await response.json();
    console.log('Used GPT-5 successfully');
    return JSON.parse(data.choices[0].message.content);

  } catch (error) {
    console.error('AI processing error:', error);
    return {
      type: 'error',
      text: 'Unable to process request at this time',
      nextActions: ['retry_later'],
      events: [{ type: 'ai_error', error: error.message }]
    };
  }
}

async function updateTemporalState(
  intent: AgentIntent,
  response: AgentResponse,
  supabase: any
) {
  try {
    await supabase
      .from('temporal_synthesis_states')
      .upsert({
        user_id: intent.userId,
        intent_type: intent.type,
        response_type: response.type,
        synthesis_data: {
          intent: intent.payload,
          response: response.data,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('Error updating temporal state:', error);
  }
}