import { createClient } from "https://esm.sh/@supabase/supabase-js@^2.45.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  const corsOrigins = [
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://localhost:5500',
    'http://localhost:5501'
  ];

  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = corsOrigins.includes(origin) ? origin : corsOrigins[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[sync-binder-cards-v2] Starting sync...");

  try {
    const { binder_id, cards, user_id } = await req.json();

    if (!binder_id || !cards || !Array.isArray(cards)) {
      console.error("[sync-binder-cards-v2] Invalid input:", { binder_id, cards });
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    console.log(`[sync-binder-cards-v2] Syncing binder ${binder_id} with ${cards.length} cards for user ${user_id}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: rpcError } = await supabase.rpc("sync_binder_cards_atomic", {
      p_binder_id: binder_id,
      p_cards: cards,
      p_user_id: user_id
    });

    if (rpcError) {
      console.error("[sync-binder-cards-v2] RPC error:", rpcError);
      return new Response(JSON.stringify({ error: rpcError.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    console.log(`[sync-binder-cards-v2] Successfully synced binder ${binder_id}`);
    return new Response(JSON.stringify({ success: true, count: cards.length }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (err) {
    console.error("[sync-binder-cards-v2] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
