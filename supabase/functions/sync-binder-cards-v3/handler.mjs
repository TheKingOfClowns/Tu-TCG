const LOCAL_ORIGINS = new Set([
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "http://localhost:5500",
  "http://localhost:5501",
]);

function getAllowedOrigin(origin) {
  if (!origin) return null;
  if (LOCAL_ORIGINS.has(origin) || origin === "https://tutcg.pages.dev") return origin;

  try {
    const parsed = new URL(origin);
    if (parsed.protocol === "https:" && parsed.hostname.endsWith(".tutcg.pages.dev")) return origin;
  } catch {
    // Invalid Origin headers receive no CORS permission.
  }
  return null;
}

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function createSyncHandler(createClient, getEnv) {
  return async (req) => {
    const origin = getAllowedOrigin(req.headers.get("Origin"));
    const corsHeaders = {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Vary": "Origin",
    };
    if (origin) corsHeaders["Access-Control-Allow-Origin"] = origin;

    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);

    const authorization = req.headers.get("Authorization") || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Server configuration error" }, 500, corsHeaders);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(tokenMatch[1]);
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid input" }, 400, corsHeaders);
    }
    if (!body || typeof body !== "object" || typeof body.binder_id !== "string" || !body.binder_id || !Array.isArray(body.cards)) {
      return jsonResponse({ error: "Invalid input" }, 400, corsHeaders);
    }

    const { error } = await supabase.rpc("sync_binder_cards_atomic", {
      p_binder_id: body.binder_id,
      p_cards: body.cards,
    });
    if (error) return jsonResponse({ error: "Unable to sync binder cards" }, 500, corsHeaders);

    return jsonResponse({ success: true, count: body.cards.length }, 200, corsHeaders);
  };
}
