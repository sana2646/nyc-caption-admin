import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Every admin page and every admin action calls this.
 * 1. No Google login  -> /login
 * 2. Logged in, but profiles.is_superadmin is not TRUE -> /not-authorized
 * The database (RLS) enforces the same rule a second time, so even a bug here
 * can't expose other people's data.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url, is_superadmin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin) redirect('/not-authorized')

  return { supabase, user, profile }
}
