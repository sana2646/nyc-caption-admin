import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'

export const dynamic = 'force-dynamic'

export default async function NotAuthorizedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="center-page">
      <div className="card auth-card">
        <div className="lock">⛔️</div>
        <h1 className="page-title">No admin access</h1>
        <p className="muted" style={{ margin: '8px 0 24px' }}>
          You&apos;re signed in as <strong>{user.email}</strong>, but this account isn&apos;t an
          admin. Ask the site owner to set <code>is_superadmin</code> to true for you.
        </p>
        <SignOutButton className="btn btn-block" />
      </div>
    </main>
  )
}
