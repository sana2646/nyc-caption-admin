import { requireAdmin } from '@/lib/auth'
import { fullName, initials } from '@/lib/data'
import SideNav from '@/components/SideNav'
import SignOutButton from '@/components/SignOutButton'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Second lock (the proxy is the first): no admin flag, no page.
  const { profile } = await requireAdmin()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          NYC Caption <span>Club</span>
          <div className="brand-sub">Admin</div>
        </div>
        <SideNav />
        <div className="me">
          <div className="avatar">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" />
            ) : (
              initials(profile)
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="me-name">{fullName(profile)}</div>
            <div className="badge">superadmin</div>
          </div>
        </div>
        <SignOutButton className="btn btn-ghost btn-block" />
      </aside>
      <main className="content">{children}</main>
    </div>
  )
}
