// Supabase client configuration
// IMPORTANT: Use only the anon/public key in frontend code.
// The service_role key must NEVER be exposed client-side.

const SUPABASE_URL = "https://hvgmaqdmveuwyztbjvse.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_m2ARuDmZMqTjQYbVmAw8aw_BGPiDSJL";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
