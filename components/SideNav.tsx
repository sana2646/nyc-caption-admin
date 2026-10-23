'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Overview', icon: '📊' },
  { href: '/users', label: 'Users', icon: '👥' },
  { href: '/captions', label: 'AI Captions', icon: '✨' },
  { href: '/votes', label: 'Votes', icon: '🗳️' },
]

export default function SideNav() {
  const pathname = usePathname()

  return (
    <nav className="side-links">
      {LINKS.map((l) => {
        const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
        return (
          <Link key={l.href} href={l.href} className={`side-link ${active ? 'active' : ''}`}>
            <span aria-hidden>{l.icon}</span>
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
