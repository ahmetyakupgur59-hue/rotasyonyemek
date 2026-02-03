import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kssbshmfxquaqigmbppc.supabase.co'
const supabaseKey = 'sb_publishable_xMdLsII-ozs1oHYUZuUpew_hd5YMobX'
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: undefined
  }
});