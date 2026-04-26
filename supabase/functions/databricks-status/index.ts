import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.104.1/cors";

// Verifies the linked Databricks connection via the Lovable connector gateway.
// Returns { connected, latency_ms, error? }.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const DATABRICKS_API_KEY = Deno.env.get("DATABRICKS_API_KEY");
  if (!LOVABLE_API_KEY || !DATABRICKS_API_KEY) {
    return new Response(
      JSON.stringify({
        connected: false,
        error: "Databricks connector not linked. Connect from the Databricks page.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const r = await fetch("https://connector-gateway.lovable.dev/api/v1/verify_credentials", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": DATABRICKS_API_KEY,
      },
    });
    const data = await r.json();
    return new Response(
      JSON.stringify({
        connected: r.ok && data.outcome === "verified",
        outcome: data.outcome,
        latency_ms: data.latency_ms,
        error: data.error,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ connected: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
