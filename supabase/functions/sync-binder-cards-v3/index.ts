import { createClient } from "https://esm.sh/@supabase/supabase-js@^2.45.0";
import { createSyncHandler } from "./handler.mjs";

Deno.serve(createSyncHandler(createClient, (name) => Deno.env.get(name)));
