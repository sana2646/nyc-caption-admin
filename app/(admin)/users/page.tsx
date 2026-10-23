/* eslint-disable @next/next/no-img-element */
import { requireAdmin } from '@/lib/auth'
import { type Caption, type Profile, type Vote, formatDate, fullName, initials, scoreMap } from '@/lib/data'

export const dynamic = 'force-dynamic'

type Search = Promise<{ q?: string; sort?: string }>

export default async function UsersPage({ searchParams }: { searchParams: Search }) {
  const { q = '', sort = 'votes' } = await searchParams
  const { supabase } = await requireAdmin()

  const [{ data: p }, { data: c }, { data: v }] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, avatar_url, is_superadmin, updated_at'),
    supabase.from('captions').select('id, user_id, image_url, created_at'),
    supabase.from('votes').select('id, caption_id, user_id, value, created_at'),
  ])
  const profiles = (p ?? []) as Profile[]
  const captions = (c ?? []) as Pick<Caption, 'id' | 'user_id' | 'image_url' | 'created_at'>[]
  const votes = (v ?? []) as Vote[]
  const scores = scoreMap(votes)

  let rows = profiles.map((u) => {
    const mine = captions.filter((x) => x.user_id === u.id)
    const myVotes = votes.filter((x) => x.user_id === u.id)
    const lastActive = [...mine.map((x) => x.created_at), ...myVotes.map((x) => x.created_at), u.updated_at ?? '']
      .filter(Boolean)
      .sort()
      .pop() ?? null
    return {
      ...u,
      photos: new Set(mine.map((x) => x.image_url)).size,
      captions: mine.length,
      votesCast: myVotes.length,
      ups: myVotes.filter((x) => x.value > 0).length,
      received: mine.reduce((sum, x) => sum + (scores.get(x.id)?.score ?? 0), 0),
      lastActive,
    }
  })

  const term = q.trim().toLowerCase()
  if (term) rows = rows.filter((r) => fullName(r).toLowerCase().includes(term) || r.id.startsWith(term))

  rows.sort((a, b) => {
    if (sort === 'name') return fullName(a).localeCompare(fullName(b))
    if (sort === 'score') return b.received - a.received
    if (sort === 'recent') return (b.lastActive ?? '').localeCompare(a.lastActive ?? '')
    return b.votesCast - a.votesCast
  })

  const admins = profiles.filter((x) => x.is_superadmin).length
  const noName = profiles.filter((x) => !x.first_name || !x.last_name).length

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Users</div>
          <h1 className="page-title">Members</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {profiles.length} profiles · {admins} admin{admins === 1 ? '' : 's'} · {noName} haven&apos;t finished sign-up
          </p>
        </div>
      </div>

      <form className="toolbar">
        <input name="q" defaultValue={q} placeholder="Search by name…" className="input" />
        <select name="sort" defaultValue={sort} className="select">
          <option value="votes">Most votes cast</option>
          <option value="score">Highest score received</option>
          <option value="recent">Recently active</option>
          <option value="name">Name A–Z</option>
        </select>
        <button className="btn">Apply</button>
      </form>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Photos</th>
              <th>Captions</th>
              <th>Votes cast</th>
              <th>Score received</th>
              <th>Last active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="who">
                    <div className="avatar">
                      {r.avatar_url ? <img src={r.avatar_url} alt="" /> : initials(r)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{fullName(r)}</div>
                      <div className="faint small"><code>{r.id.slice(0, 8)}</code></div>
                    </div>
                  </div>
                </td>
                <td>
                  {r.is_superadmin ? <span className="badge">Admin</span> : <span className="badge badge-muted">Member</span>}
                </td>
                <td className="num">{r.photos}</td>
                <td className="num">{r.captions}</td>
                <td className="num">
                  {r.votesCast}
                  {r.votesCast > 0 && (
                    <span className="faint small"> · {Math.round((r.ups / r.votesCast) * 100)}% up</span>
                  )}
                </td>
                <td>
                  <span className={`pill ${r.received > 0 ? 'up' : r.received < 0 ? 'down' : 'neutral'}`}>
                    {r.received > 0 ? '+' : ''}
                    {r.received}
                  </span>
                </td>
                <td className="muted">{formatDate(r.lastActive)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">No members match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="faint small" style={{ marginTop: 12 }}>
        Read-only. Profiles are created automatically when someone signs in with Google.
      </p>
    </>
  )
}
