/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { type Caption, type Profile, type Vote, fullName, scoreMap } from '@/lib/data'

export const dynamic = 'force-dynamic'

const NY = 'America/New_York'

function nyDay(date: string | Date) {
  return new Date(date).toLocaleDateString('en-CA', { timeZone: NY }) // YYYY-MM-DD
}
function nyHour(date: string) {
  return Number(
    new Date(date).toLocaleString('en-US', { timeZone: NY, hour: 'numeric', hour12: false })
  ) % 24
}

function lastDays(n: number) {
  const now = Date.now()
  const days: { key: string; label: string; count: number }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000)
    days.push({
      key: nyDay(d),
      label: d.toLocaleDateString('en-US', { timeZone: NY, month: 'numeric', day: 'numeric' }),
      count: 0,
    })
  }
  return days
}

export default async function OverviewPage() {
  const { supabase } = await requireAdmin()

  const [{ data: p }, { data: c }, { data: v }] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, avatar_url, is_superadmin, updated_at'),
    supabase.from('captions').select('id, user_id, image_url, prompt, caption, theme, created_at'),
    supabase.from('votes').select('id, caption_id, user_id, value, created_at'),
  ])
  const profiles = (p ?? []) as Profile[]
  const captions = (c ?? []) as Caption[]
  const votes = (v ?? []) as Vote[]

  const byId = new Map(profiles.map((x) => [x.id, x]))
  const scores = scoreMap(votes)
  const scored = captions.map((cap) => ({
    ...cap,
    ...(scores.get(cap.id) ?? { score: 0, up: 0, down: 0 }),
  }))

  // ---------- Headline numbers ----------
  const photos = new Set(captions.map((x) => x.image_url)).size
  const ups = votes.filter((x) => x.value > 0).length
  const downs = votes.length - ups
  const upPct = votes.length ? Math.round((ups / votes.length) * 100) : 0
  const activeVoters = new Set(votes.map((x) => x.user_id)).size
  const unseen = scored.filter((x) => x.up + x.down === 0).length
  const hits = scored.filter((x) => x.score > 0).length
  const hitRate = captions.length ? Math.round((hits / captions.length) * 100) : 0

  // ---------- Votes per day (last 14 days) ----------
  const days = lastDays(14)
  const dayIndex = new Map(days.map((d, i) => [d.key, i]))
  for (const x of votes) {
    const i = dayIndex.get(nyDay(x.created_at))
    if (i !== undefined) days[i].count++
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count))

  // ---------- When is Sam online? (posts + votes by hour) ----------
  const hours = Array(24).fill(0) as number[]
  for (const x of votes) hours[nyHour(x.created_at)]++
  for (const x of captions) hours[nyHour(x.created_at)]++
  const maxHour = Math.max(1, ...hours)
  const peakHour = hours.indexOf(Math.max(...hours))
  const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`

  // ---------- Theme leaderboard ----------
  const themeStats = new Map<string, { captions: number; score: number; votes: number }>()
  for (const x of scored) {
    const t = x.theme ?? 'No theme'
    const s = themeStats.get(t) ?? { captions: 0, score: 0, votes: 0 }
    s.captions++
    s.score += x.score
    s.votes += x.up + x.down
    themeStats.set(t, s)
  }
  const themes = [...themeStats.entries()]
    .map(([name, s]) => ({ name, ...s, avg: s.score / s.captions }))
    .sort((a, b) => b.avg - a.avg)
  const maxAbsAvg = Math.max(0.01, ...themes.map((t) => Math.abs(t.avg)))

  // ---------- Hall of fame & most divisive ----------
  const top = [...scored].sort((a, b) => b.score - a.score || b.up - a.up).slice(0, 5)
  const divisive = scored
    .filter((x) => x.up > 0 && x.down > 0)
    .sort((a, b) => b.up + b.down - (a.up + a.down) || Math.abs(a.score) - Math.abs(b.score))
    .slice(0, 3)
  const flops = [...scored].filter((x) => x.score < 0).sort((a, b) => a.score - b.score).slice(0, 3)

  // ---------- People ----------
  const voterCounts = new Map<string, number>()
  for (const x of votes) voterCounts.set(x.user_id, (voterCounts.get(x.user_id) ?? 0) + 1)
  const topVoters = [...voterCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  const creatorScore = new Map<string, number>()
  for (const x of scored) creatorScore.set(x.user_id, (creatorScore.get(x.user_id) ?? 0) + x.score)
  const topCreators = [...creatorScore.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  const todayKey = nyDay(new Date())
  const votesToday = votes.filter((x) => nyDay(x.created_at) === todayKey).length
  const postsToday = new Set(
    captions.filter((x) => nyDay(x.created_at) === todayKey).map((x) => x.image_url)
  ).size

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Overview</div>
          <h1 className="page-title">How&apos;s the club doing?</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Today: <strong>{postsToday}</strong> new photos · <strong>{votesToday}</strong> votes
          </p>
        </div>
        <Link href="/captions#new" className="btn btn-primary">+ Add caption</Link>
      </div>

      <div className="grid kpis">
        <div className="card kpi">
          <div className="kpi-label">Members</div>
          <div className="kpi-value num">{profiles.length}</div>
          <div className="kpi-sub">{activeVoters} have voted</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Photos posted</div>
          <div className="kpi-value num">{photos}</div>
          <div className="kpi-sub">{captions.length} AI captions</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Votes cast</div>
          <div className="kpi-value num">{votes.length}</div>
          <div className="split" title={`${ups} up · ${downs} down`}>
            <div className="u" style={{ width: `${upPct}%` }} />
            <div className="d" style={{ width: `${votes.length ? 100 - upPct : 0}%` }} />
          </div>
          <div className="kpi-sub">{upPct}% upvotes</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">AI hit rate</div>
          <div className="kpi-value num">{hitRate}%</div>
          <div className="kpi-sub">of captions have a positive score · {unseen} never voted on</div>
        </div>
      </div>

      <div className="grid two">
        <section className="card panel">
          <div className="section-title">Votes per day</div>
          <div className="muted small">Last 14 days</div>
          <div className="bars">
            {days.map((d) => (
              <div key={d.key} className="bar-col" title={`${d.label}: ${d.count} votes`}>
                <span className="small faint num">{d.count || ''}</span>
                <div
                  className={`bar ${d.count ? '' : 'zero'}`}
                  style={{ height: `${(d.count / maxDay) * 100}%` }}
                />
                <span className="bar-label">{d.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card panel">
          <div className="section-title">When is Sam online?</div>
          <div className="muted small">
            Posts + votes by hour (NYC time) · busiest at <strong>{hourLabel(peakHour)}</strong>
          </div>
          <div className="hours">
            {hours.map((n, h) => (
              <div
                key={h}
                className="hour"
                title={`${hourLabel(h)}: ${n} actions`}
                style={{ opacity: n ? 0.18 + (n / maxHour) * 0.82 : 0.06 }}
              />
            ))}
          </div>
          <div className="hour-labels">
            {hours.map((_, h) => (
              <span key={h}>{h % 6 === 0 ? hourLabel(h) : ''}</span>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 14 }}>
            Tip: post the daily theme reminder right before peak hour.
          </p>
        </section>
      </div>

      <div className="grid two">
        <section className="card panel">
          <div className="section-title">Funniest themes</div>
          <div className="muted small" style={{ marginBottom: 10 }}>Average score per caption</div>
          {themes.length === 0 && <div className="empty">No captions yet</div>}
          {themes.map((t) => (
            <div key={t.name} className="hbar-row" title={`${t.captions} captions · ${t.votes} votes`}>
              <span className="hbar-name">{t.name}</span>
              <div className="hbar-track">
                <div
                  className="hbar-fill"
                  style={{
                    width: `${(Math.max(0, t.avg) / maxAbsAvg) * 100}%`,
                  }}
                />
              </div>
              <span className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
                {t.avg > 0 ? '+' : ''}
                {t.avg.toFixed(1)}
              </span>
            </div>
          ))}
        </section>

        <section className="card panel">
          <div className="section-title">👑 Hall of fame</div>
          <div className="muted small" style={{ marginBottom: 6 }}>Highest-scoring AI captions</div>
          {top.length === 0 && <div className="empty">No captions yet</div>}
          {top.map((x, i) => (
            <div key={x.id} className="rank">
              <span className="rank-n">{i + 1}</span>
              <img src={x.image_url} alt="" className="thumb" />
              <div className="grow">
                <div className="clamp">{x.caption}</div>
                <div className="faint small">by {fullName(byId.get(x.user_id))}</div>
              </div>
              <span className={`pill ${x.score > 0 ? 'up' : x.score < 0 ? 'down' : 'neutral'}`}>
                {x.score > 0 ? '+' : ''}
                {x.score}
              </span>
            </div>
          ))}
        </section>
      </div>

      <div className="grid two">
        <section className="card panel">
          <div className="section-title">🌶️ Most divisive</div>
          <div className="muted small" style={{ marginBottom: 6 }}>People can&apos;t agree on these</div>
          {divisive.length === 0 && <div className="empty">Nothing controversial yet</div>}
          {divisive.map((x) => (
            <div key={x.id} className="rank">
              <img src={x.image_url} alt="" className="thumb" />
              <div className="grow clamp">{x.caption}</div>
              <span className="pill up">▲ {x.up}</span>
              <span className="pill down">▼ {x.down}</span>
            </div>
          ))}
          {flops.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: 18 }}>💀 Biggest flops</div>
              {flops.map((x) => (
                <div key={x.id} className="rank">
                  <img src={x.image_url} alt="" className="thumb" />
                  <div className="grow clamp">{x.caption}</div>
                  <span className="pill down">{x.score}</span>
                </div>
              ))}
            </>
          )}
        </section>

        <section className="card panel">
          <div className="section-title">Top creators</div>
          <div className="muted small" style={{ marginBottom: 6 }}>Total score on their posts</div>
          {topCreators.length === 0 && <div className="empty">No posts yet</div>}
          {topCreators.map(([id, s], i) => (
            <div key={id} className="rank">
              <span className="rank-n">{i + 1}</span>
              <div className="grow">{fullName(byId.get(id))}</div>
              <span className="num" style={{ fontWeight: 700 }}>{s > 0 ? '+' : ''}{s}</span>
            </div>
          ))}
          <div className="section-title" style={{ marginTop: 18 }}>Most active voters</div>
          {topVoters.length === 0 && <div className="empty">No votes yet</div>}
          {topVoters.map(([id, n], i) => (
            <div key={id} className="rank">
              <span className="rank-n">{i + 1}</span>
              <div className="grow">{fullName(byId.get(id))}</div>
              <span className="num" style={{ fontWeight: 700 }}>{n} votes</span>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}
