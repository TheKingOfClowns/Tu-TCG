// Supabase client configuration
// ===========================================
// CONFIGURACIÓN DE CREDENCIALES
// Para actualizar credenciales:
// 1. Ir a Supabase Dashboard > Project Settings > API
// 2. Copiar nuevos valores
// 3. Actualizar abajo
// 4. Para producción en Cloudflare Pages: actualizar en el dashboard de Cloudflare
// ===========================================

// ⚠️ IMPORTANTE: Usar SOLO la key anon/public en código frontend.
// La service_role key NUNCA debe estar expuesta client-side.

const SUPABASE_URL = "https://scykfvomdwpiypmblnvv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LqQFFDrM2N4_KJ-q6GDsQQ_Q1OEsUsT";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
