'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const signIn = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <main className="center-page">
      <div className="card auth-card">
        <div className="lock">🔒</div>
        <div className="eyebrow">NYC Caption Club</div>
        <h1 className="page-title">Admin</h1>
        <p className="muted" style={{ margin: '8px 0 24px' }}>
          Staff only. Sign in with the Google account that has admin access.
        </p>
        <button onClick={signIn} disabled={loading} className="btn btn-primary btn-block">
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>
      </div>
    </main>
  )
}
