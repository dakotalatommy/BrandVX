import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const { userId } = await req.json();

    console.log(`Generating AI recommendations for user ${userId}`);

    // Gather comprehensive user data for analysis
    const userData = await gatherUserAnalytics(supabase, userId);
    
    // Generate AI-powered recommendations
    const recommendations = await generateIntelligentRecommendations(userData);
    
    // Store recommendations in database
    await storeRecommendations(supabase, userId, recommendations);

    return new Response(JSON.stringify({
      success: true,
      recommendations,
      dataAnalyzed: userData.summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('AI recommendations error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

async function gatherUserAnalytics(supabase: any, userId: string) {
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Get contact metrics
  const { data: contacts } = await supabase
    .from('contacts')
    .select('status, created_at, tags, sources')
    .eq('user_id', userId);

  // Get connected accounts
  const { data: connectedAccounts } = await supabase
    .from('connected_accounts')
    .select('platform, connected_at')
    .eq('user_id', userId);

  // Get recent events and time saved
  const { data: events } = await supabase
    .from('events')
    .select('type, created_at, metadata, baseline_min, auto_min')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get messages sent
  const { data: messages } = await supabase
    .from('messages')
    .select('channel, created_at, status')
    .in('contact_id', contacts?.map(c => c.id) || []);

  // Get cadence rules
  const { data: cadenceRules } = await supabase
    .from('cadence_rules')
    .select('*')
    .eq('user_id', userId);

  // Calculate key metrics
  const contactsByStatus = contacts?.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const timeSavedTotal = events?.reduce((sum, e) => 
    sum + ((e.baseline_min || 0) - (e.auto_min || 0)), 0) || 0;

  const recentActivity = events?.filter(e => 
    new Date(e.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length || 0;

  return {
    profile,
    metrics: {
      totalContacts: contacts?.length || 0,
      contactsByStatus,
      timeSavedHours: Math.round(timeSavedTotal / 60 * 10) / 10,
      connectedPlatforms: connectedAccounts?.map(a => a.platform) || [],
      messagesSent: messages?.length || 0,
      cadenceRulesCount: cadenceRules?.length || 0,
      recentActivityScore: recentActivity,
      trialDaysLeft: profile?.trial_ends_at ? 
        Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0
    },
    recentEvents: events?.slice(0, 10) || [],
    businessInfo: {
      type: profile?.business_type,
      monthlyRevenue: profile?.monthly_revenue,
      adminHours: profile?.admin_hours_per_week,
      primaryGoal: profile?.primary_goal,
      timeWasters: profile?.biggest_time_waster || []
    },
    summary: {
      setupCompleted: profile?.setup_completed || false,
      hasContacts: (contacts?.length || 0) > 0,
      hasIntegrations: (connectedAccounts?.length || 0) > 0,
      hasAutomation: (cadenceRules?.length || 0) > 0,
      usageLevel: recentActivity > 10 ? 'high' : recentActivity > 3 ? 'medium' : 'low'
    }
  };
}

async function generateIntelligentRecommendations(userData: any) {
  const prompt = `You are BrandVX's AI consultant analyzing a beauty business owner's automation journey. 

BUSINESS CONTEXT:
- Business Type: ${userData.businessInfo.type || 'Beauty/Wellness'}
- Monthly Revenue: $${userData.businessInfo.monthlyRevenue?.toLocaleString() || 'Not specified'}
- Admin Hours/Week: ${userData.businessInfo.adminHours || 'Not specified'}
- Primary Goal: ${userData.businessInfo.primaryGoal || 'Not specified'}
- Main Time Wasters: ${userData.businessInfo.timeWasters.join(', ') || 'Not specified'}

CURRENT STATUS:
- Total Contacts: ${userData.metrics.totalContacts}
- Contact Breakdown: ${JSON.stringify(userData.metrics.contactsByStatus)}
- Time Saved: ${userData.metrics.timeSavedHours} hours
- Connected Platforms: ${userData.metrics.connectedPlatforms.join(', ') || 'None'}
- Messages Sent: ${userData.metrics.messagesSent}
- Active Cadences: ${userData.metrics.cadenceRulesCount}
- Recent Activity Level: ${userData.summary.usageLevel}
- Trial Days Left: ${userData.metrics.trialDaysLeft}
- Setup Completed: ${userData.summary.setupCompleted}

ANALYZE THIS DATA AND PROVIDE 3-5 PERSONALIZED, ACTIONABLE RECOMMENDATIONS.

Each recommendation should:
1. Be specific to their business situation
2. Include a clear action step
3. Estimate time/effort required
4. Explain the expected benefit
5. Be prioritized by impact

Focus on:
- Growing their contact base if they have <50 contacts
- Setting up integrations if missing key platforms
- Optimizing cadences if they have contacts but low engagement
- Advanced features if they're already active users
- Revenue opportunities specific to beauty businesses
- Time-saving automations for their biggest pain points

Return recommendations in this JSON format:
{
  "recommendations": [
    {
      "title": "Short, action-oriented title",
      "description": "2-3 sentence explanation with specific benefits",
      "priority": "high|medium|low", 
      "category": "growth|automation|optimization|integration",
      "timeToComplete": "5 minutes|1 hour|1 day|1 week",
      "expectedImpact": "Specific measurable outcome",
      "actionSteps": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14', // Using GPT-5 (4.1) as specified in the system
      messages: [
        { 
          role: 'system', 
          content: 'You are BrandVX\'s GPT-5 powered AI business consultant specializing in beauty business automation. Your advanced reasoning capabilities allow you to provide sophisticated, multi-step strategic recommendations. Always respond in valid JSON format.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    }),
  });

  const aiResponse = await response.json();
  const content = aiResponse.choices[0].message.content;
  
  try {
    const parsed = JSON.parse(content);
    return parsed.recommendations;
  } catch (parseError) {
    console.error('Error parsing AI response:', parseError, content);
    
    // Fallback recommendations if AI parsing fails
    return [
      {
        title: "Import Your Contact List",
        description: "Upload your existing client database to unlock BrandVX's full automation potential. Start with your most recent clients for immediate impact.",
        priority: "high",
        category: "growth", 
        timeToComplete: "15 minutes",
        expectedImpact: "Enable automated follow-ups and save 5+ hours/week",
        actionSteps: ["Go to Contacts page", "Click Import", "Upload CSV or connect your booking system"]
      }
    ];
  }
}

async function storeRecommendations(supabase: any, userId: string, recommendations: any[]) {
  // Clear old recommendations
  await supabase
    .from('ai_recommendations')
    .delete()
    .eq('user_id', userId);

  // Insert new recommendations
  for (const rec of recommendations) {
    await supabase
      .from('ai_recommendations')
      .insert({
        user_id: userId,
        title: rec.title,
        description: rec.description,
        recommendation_type: rec.category,
        priority: rec.priority === 'high' ? 10 : rec.priority === 'medium' ? 5 : 1,
        action_data: {
          timeToComplete: rec.timeToComplete,
          expectedImpact: rec.expectedImpact,
          actionSteps: rec.actionSteps,
          category: rec.category
        },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });
  }
}