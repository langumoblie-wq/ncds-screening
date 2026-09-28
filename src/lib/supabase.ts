import { createClient } from "@supabase/supabase-js";

// Make sure to use import.meta.env for Vite environment variables with fallback for static/GitHub Pages deployment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://chxeqrwbjohvckozovcl.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_BDze2N9Z11PiKtNanYmBGw_XlTZ6hus";

export const supabase = createClient(supabaseUrl, supabaseKey);
