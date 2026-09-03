import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabaseProjectRef = isSupabaseConfigured
  ? new URL(supabaseUrl).hostname.replace(/\.supabase\.co$/, '')
  : null

export const supabaseStatusLabel = isSupabaseConfigured
  ? `Supabase project detected: ${supabaseProjectRef ?? 'live project'}`
  : 'Supabase is not configured yet.'

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
