// Supabase client setup will be here
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kssbshmfxquaqigmbppc.supabase.co'  // Supabase’te Project Settings → API → URL
const supabaseAnonKey = 'sb_publishable_xMdLsII-ozs1oHYUZuUpew_hd5YMobX'  // Supabase’te Project Settings → API → anon public

export const supabase = createClient(supabaseUrl, supabaseAnonKey)