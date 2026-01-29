import { createClient } from '@supabase/supabase-js';

// Fallback to the corrected key if env vars fail
const FALLBACK_KEY = "sb_publishable_Tv33OWlJDZFKToVHC5EvIw_Uwiinq3I";
const FALLBACK_URL = "https://sltofduogymtxkayumti.supabase.co";

const SUPABASE_URL = FALLBACK_URL;
const SUPABASE_ANON_KEY = FALLBACK_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
