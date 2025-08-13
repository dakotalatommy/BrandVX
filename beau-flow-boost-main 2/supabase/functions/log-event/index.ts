// Supabase Edge Function: log-event
// Auth required. Logs automation/share events with baseline vs auto minutes.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EventPayload = {
  source: string; // 'square' | 'acuity' | 'ig' | 'system' | ...
  type: string;   // e.g., 'booking_created', 'reminder_sent', 'share_prompted'
  baseline_min?: number | null;
  auto_min?: number | null;
  metadata?: Record<string, unknown> | null;
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as EventPayload;
    console.log("log-event payload", payload);

    if (!payload?.source || !payload?.type) {
      return new Response(JSON.stringify({ error: "Missing source or type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth error", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await supabase.from("events").insert({
      user_id: user.id,
      source: payload.source,
      type: payload.type,
      baseline_min: payload.baseline_min ?? null,
      auto_min: payload.auto_min ?? null,
      metadata: payload.metadata ?? null,
    });

    if (insertError) {
      console.error("Insert error", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unhandled error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
