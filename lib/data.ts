// Shared types and helpers for the admin pages.

export type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  is_superadmin: boolean | null
  updated_at: string | null
}

export type Caption = {
  id: string
  user_id: string
  image_url: string
  prompt: string
  caption: string
  theme: string | null
  created_at: string
}

export type Vote = {
  id: string
  caption_id: string
  user_id: string
  value: number
  created_at: string
}

export const THEMES = [
  'Subway Chaos',
  'Bodega Cat Energy',
  'Overpriced Coffee',
  'Midwest Kid vs. NYC',
  'Dorm Life',
  'Weekend Adventures',
  'Rats & Pigeons',
  'Columbia Campus Life',
  'Only in New York',
  'Rent Is How Much?!',
  'Tourist Traps',
  'Late-Night Food',
]

export function fullName(p?: Pick<Profile, 'first_name' | 'last_name'> | null) {
  if (!p) return 'Unknown user'
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
  return name || 'No name yet'
}

export function initials(p?: Pick<Profile, 'first_name' | 'last_name'> | null) {
  if (!p) return '?'
  return (
    ((p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')).toUpperCase() || '?'
  )
}

export function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
}

export function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function scoreMap(votes: Vote[]) {
  const map = new Map<string, { score: number; up: number; down: number }>()
  for (const v of votes) {
    const s = map.get(v.caption_id) ?? { score: 0, up: 0, down: 0 }
    s.score += v.value
    if (v.value > 0) s.up++
    else s.down++
    map.set(v.caption_id, s)
  }
  return map
}
