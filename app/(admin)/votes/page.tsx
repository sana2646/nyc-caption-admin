/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { type Caption, type Profile, type Vote, formatDate, fullName, initials, timeAgo } from '@/lib/data'

export const dynamic = 'force-dynamic'

type Search = Promise<{ type?: string }>

export default async function VotesPage({ searchParams }: { searchParams: Search }) {
  const { type = 'all' } = await searchParams
  const { supabase } = await requireAdmin()

  const [{ data: v }, { data: c }, { data: p }] = await Promise.all([
    supabase
      .from('votes')
      .select('id, caption_id, user_id, value, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('captions').select('id, caption, image_url, theme'),
    supabase.from('profiles').select('id, first_name, last_name, avatar_url'),
  ])
  const all = (v ?? []) as Vote[]
  const captions = new Map(((c ?? []) as Caption[]).map((x) => [x.id, x]))
  const people = new Map(((p ?? []) as Profile[]).map((x) => [x.id, x]))

  const ups = all.filter((x) => x.value > 0).length
  const downs = all.length - ups
  const rows = all.filter((x) => (type === 'up' ? x.value > 0 : type === 'down' ? x.value < 0 : true))

  const chip = (key: string, label: string) => (
    <Link href={key === 'all' ? '/votes' : `/votes?type=${key}`} className={`chip ${type === key ? 'active' : ''}`}>
      {label}
    </Link>
  )

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Ratings</div>
          <h1 className="page-title">Votes</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Every upvote and downvote, newest first. Read-only.
          </p>
        </div>
      </div>

      <div className="toolbar">
        <div className="chips">
          {chip('all', `All · ${all.length}`)}
          {chip('up', `▲ Upvotes · ${ups}`)}
          {chip('down', `▼ Downvotes · ${downs}`)}
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vote</th>
              <th>Voter</th>
              <th>Caption</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const cap = captions.get(x.caption_id)
              const who = people.get(x.user_id)
              return (
                <tr key={x.id}>
                  <td>
                    {x.value > 0 ? <span className="pill up">▲ Up</span> : <span className="pill down">▼ Down</span>}
                  </td>
                  <td>
                    <div className="who">
                      <div className="avatar">
                        {who?.avatar_url ? <img src={who.avatar_url} alt="" /> : initials(who)}
                      </div>
                      <span>{fullName(who)}</span>
                    </div>
                  </td>
                  <td>
                    {cap ? (
                      <div className="who">
                        <img src={cap.image_url} alt="" className="thumb" />
                        <div className="clamp" style={{ maxWidth: 420 }}>{cap.caption}</div>
                      </div>
                    ) : (
                      <span className="faint">Deleted caption</span>
                    )}
                  </td>
                  <td className="muted" title={formatDate(x.created_at)} style={{ whiteSpace: 'nowrap' }}>
                    {timeAgo(x.created_at)}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">No votes yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
