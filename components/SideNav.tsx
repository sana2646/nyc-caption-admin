'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RESOURCES } from '@/lib/resources'

const MAIN = [
  { href: '/', label: 'Overview', icon: '📊' },
  { href: '/users', label: 'Users', icon: '👥' },
  { href: '/images', label: 'Images', icon: '🖼️' },
  { href: '/captions', label: 'AI Captions', icon: '✨' },
  { href: '/votes', label: 'Votes', icon: '🗳️' },
]

const GROUPS = [...new Set(RESOURCES.map((r) => r.group))].map((group) => ({
  group,
  links: RESOURCES.filter((r) => r.group === group).map((r) => ({
    href: `/db/${r.key}`,
    label: r.title,
    icon: r.icon,
  })),
}))

export default function SideNav() {
  const pathname = usePathname()

  const link = (l: { href: string; label: string; icon: string }) => {
    const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
    return (
      <Link key={l.href} href={l.href} className={`side-link ${active ? 'active' : ''}`}>
        <span aria-hidden>{l.icon}</span>
        {l.label}
      </Link>
    )
  }

  return (
    <nav className="side-links">
      {MAIN.map(link)}
      {GROUPS.map((g) => (
        <div key={g.group} className="side-group">
          <div className="side-group-title">{g.group}</div>
          {g.links.map(link)}
        </div>
      ))}
    </nav>
  )
}
