import { createClient } from '@supabase/supabase-js';

// TODO: configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env (ver .env.example)
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && anon);

export const supabase = hasSupabase
  ? createClient(url, anon)
  : null;

if (!hasSupabase && import.meta.env.DEV) {
  console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no seteadas — corriendo en modo offline (no persiste sesiones).');
}
