import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kssbshmfxquaqigmbppc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzc2JzaG1meHF1YXFpZ21icHBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTUzODUsImV4cCI6MjA4NDU5MTM4NX0.utUqnF0u5a4UCJ4HRiiND0-EbLSYSp6HhbH9GpNQ8_s'

export const supabase = createClient(supabaseUrl, supabaseKey)