/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { type Caption, type Profile, type Vote, THEMES, formatDate, fullName, scoreMap } from '@/lib/data'
import ConfirmButton from '@/components/ConfirmButton'
import { createCaption, deleteCaption, updateCaption } from './actions'

export const dynamic = 'force-dynamic'

type Search = Promise<{ q?: string; theme?: string; sort?: string; msg?: string; error?: string }>

export default async function CaptionsPage({ searchParams }: { searchParams: Search }) {
  const { q = '', theme = '', sort = 'new', msg, error } = await searchParams
  const { supabase } = await requireAdmin()

  const [{ data: c }, { data: v }, { data: p }] = await Promise.all([
    supabase
      .from('captions')
      .select('id, user_id, image_url, prompt, caption, theme, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('votes').select('id, caption_id, user_id, value, created_at'),
    supabase.from('profiles').select('id, first_name, last_name'),
  ])
  const all = (c ?? []) as Caption[]
  const scores = scoreMap((v ?? []) as Vote[])
  const people = new Map(((p ?? []) as Profile[]).map((x) => [x.id, x]))

  let rows = all.map((x) => ({ ...x, ...(scores.get(x.id) ?? { score: 0, up: 0, down: 0 }) }))
  const term = q.trim().toLowerCase()
  if (term) rows = rows.filter((r) => r.caption.toLowerCase().includes(term) || r.prompt.toLowerCase().includes(term))
  if (theme) rows = rows.filter((r) => (r.theme ?? '') === theme)
  if (sort === 'top') rows.sort((a, b) => b.score - a.score)
  if (sort === 'worst') rows.sort((a, b) => a.score - b.score)
  if (sort === 'votes') rows.sort((a, b) => b.up + b.down - (a.up + a.down))

  const photos = [...new Set(all.map((x) => x.image_url))]
  const usedThemes = [...new Set(all.map((x) => x.theme).filter(Boolean))] as string[]
  const themeOptions = [...new Set([...THEMES, ...usedThemes])]

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">AI-generated media</div>
          <h1 className="page-title">Captions</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {all.length} captions on {photos.length} photos. Create, edit, or remove any of them.
          </p>
        </div>
      </div>

      {msg && <div className="flash">✓ {msg}</div>}
      {error && <div className="flash err">⚠ {error}</div>}

      {/* CREATE */}
      <details className="card panel" id="new" style={{ marginBottom: 16 }}>
        <summary className="section-title" style={{ margin: 0 }}>
          ＋ Add a caption
        </summary>
        <form action={createCaption} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          <div className="field">
            <label>Caption</label>
            <textarea name="caption" required className="textarea" placeholder="Write something funny…" />
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Use an existing photo</label>
              <select name="existing_image" className="select" defaultValue="">
                <option value="">— choose a photo —</option>
                {photos.map((url, i) => (
                  <option key={url} value={url}>
                    Photo {i + 1} · {all.find((x) => x.image_url === url)?.theme ?? 'no theme'}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>…or paste an image URL</label>
              <input name="image_url" type="url" className="input" placeholder="https://…" />
            </div>
            <div className="field">
              <label>Theme</label>
              <select name="theme" className="select" defaultValue="">
                <option value="">No theme</option>
                {themeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Prompt / source note</label>
            <input name="prompt" className="input" placeholder="Added manually by an admin" />
          </div>
          <div>
            <button className="btn btn-primary">Create caption</button>
          </div>
        </form>
      </details>

      {/* FILTERS */}
      <form className="toolbar">
        <input name="q" defaultValue={q} placeholder="Search captions or prompts…" className="input" />
        <select name="theme" defaultValue={theme} className="select">
          <option value="">All themes</option>
          {usedThemes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className="select">
          <option value="new">Newest</option>
          <option value="top">Highest score</option>
          <option value="worst">Lowest score</option>
          <option value="votes">Most votes</option>
        </select>
        <button className="btn">Apply</button>
        {(q || theme || sort !== 'new') && (
          <Link href="/captions" className="btn btn-ghost">Clear</Link>
        )}
      </form>

      {/* READ / UPDATE / DELETE */}
      <div className="card">
        {rows.length === 0 && <div className="empty">No captions match.</div>}
        {rows.map((r) => (
          <div key={r.id} className="cap">
            <a href={r.image_url} target="_blank" rel="noreferrer">
              <img src={r.image_url} alt="" className="thumb thumb-lg" />
            </a>
            <div style={{ minWidth: 0 }}>
              <div className="cap-text">{r.caption}</div>
              <div className="cap-meta">
                {r.theme && <span className="tag">#{r.theme}</span>}
                <span>by {fullName(people.get(r.user_id))}</span>
                <span>{formatDate(r.created_at)}</span>
                <span className={`pill ${r.score > 0 ? 'up' : r.score < 0 ? 'down' : 'neutral'}`}>
                  {r.score > 0 ? '+' : ''}{r.score}
                </span>
                <span>▲{r.up} ▼{r.down}</span>
              </div>
              <details style={{ marginTop: 8 }}>
                <summary className="faint small">View prompt</summary>
                <p className="small muted" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{r.prompt}</p>
              </details>
            </div>
            <div className="cap-actions">
              <details>
                <summary className="btn btn-sm">Edit</summary>
                <form action={updateCaption} className="cap-edit" style={{ position: 'absolute', right: 'clamp(16px, 4vw, 48px)', width: 'min(460px, 85vw)', zIndex: 5, display: 'grid', gap: 10, marginTop: 8, boxShadow: '0 20px 50px rgba(0,0,0,.5)' }}>
                  <input type="hidden" name="id" value={r.id} />
                  <div className="field">
                    <label>Caption</label>
                    <textarea name="caption" defaultValue={r.caption} required className="textarea" />
                  </div>
                  <div className="field">
                    <label>Theme</label>
                    <select name="theme" defaultValue={r.theme ?? ''} className="select">
                      <option value="">No theme</option>
                      {themeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Prompt</label>
                    <textarea name="prompt" defaultValue={r.prompt} className="textarea" />
                  </div>
                  <div>
                    <button className="btn btn-primary btn-sm">Save changes</button>
                  </div>
                </form>
              </details>
              <form action={deleteCaption}>
                <input type="hidden" name="id" value={r.id} />
                <ConfirmButton message={`Delete this caption and its ${r.up + r.down} votes?`}>
                  Delete
                </ConfirmButton>
              </form>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
