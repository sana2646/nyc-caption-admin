/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { formatDate } from '@/lib/data'
import { type Field, getResource, isEditable, isListed } from '@/lib/resources'
import ConfirmButton from '@/components/ConfirmButton'
import { createRow, deleteRow, updateRow } from '../actions'

export const dynamic = 'force-dynamic'

type Row = Record<string, unknown>
type Options = Map<string, { value: string; label: string }[]>
type Search = Promise<{ q?: string; msg?: string; error?: string }>

function Input({ f, value, options }: { f: Field; value?: unknown; options: Options }) {
  const v = value === null || value === undefined ? '' : String(value)
  if (f.type === 'boolean') {
    return (
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" name={f.name} defaultChecked={value === undefined ? true : Boolean(value)} />
        <span>{f.label}</span>
      </label>
    )
  }
  if (f.type === 'ref') {
    return (
      <select name={f.name} defaultValue={v} required={f.required} className="select">
        <option value="">— none —</option>
        {(options.get(f.name) ?? []).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  }
  if (f.type === 'textarea') {
    return <textarea name={f.name} defaultValue={v} required={f.required} placeholder={f.placeholder} className="textarea" rows={f.long ? 8 : 3} />
  }
  return (
    <input
      name={f.name}
      defaultValue={v}
      required={f.required}
      placeholder={f.placeholder}
      type={f.type === 'number' ? 'number' : 'text'}
      step={f.type === 'number' ? 'any' : undefined}
      className="input"
    />
  )
}

export default async function ResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>
  searchParams: Search
}) {
  const { resource } = await params
  const r = getResource(resource)
  if (!r) notFound()

  const { q = '', msg, error } = await searchParams
  const { supabase } = await requireAdmin()

  const { data, error: loadError } = await supabase
    .from(r.table)
    .select('*')
    .order(r.orderBy.column, { ascending: r.orderBy.ascending })
    .limit(500)
  let rows = (data ?? []) as Row[]

  // Look up names for id columns (e.g. show "Google" instead of 1)
  const refs = r.fields.filter((f) => f.type === 'ref' && f.ref)
  const labels = new Map<string, Map<string, string>>()
  const options: Options = new Map()
  await Promise.all(
    refs.map(async (f) => {
      const { data: refRows } = await supabase.from(f.ref!.table).select(`id, ${f.ref!.label}`).limit(1000)
      const m = new Map<string, string>()
      for (const row of (refRows ?? []) as unknown as Row[]) m.set(String(row.id), String(row[f.ref!.label] ?? row.id))
      labels.set(f.name, m)
      options.set(f.name, [...m.entries()].map(([value, label]) => ({ value, label })))
    })
  )

  const term = q.trim().toLowerCase()
  if (term) rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(term))

  const listed = r.fields.filter(isListed)
  const editable = r.fields.filter(isEditable)
  const canCreate = r.mode === 'crud'
  const canEdit = r.mode !== 'read'

  const cell = (f: Field, row: Row) => {
    const v = row[f.name]
    if (v === null || v === undefined || v === '') return <span className="faint">—</span>
    if (f.type === 'datetime') return <span className="muted" style={{ whiteSpace: 'nowrap' }}>{formatDate(String(v))}</span>
    if (f.type === 'boolean') return v ? <span className="pill up">Yes</span> : <span className="pill neutral">No</span>
    if (f.name === 'status') {
      const s = String(v)
      return <span className={`pill ${s === 'success' ? 'up' : s === 'error' ? 'down' : 'neutral'}`}>{s}</span>
    }
    if (f.type === 'ref') {
      const label = labels.get(f.name)?.get(String(v)) ?? String(v)
      if (f.ref?.table === 'images') return <img src={label} alt="" className="thumb" />
      return <span>{label}</span>
    }
    if (f.long) {
      const s = String(v)
      return (
        <details className="long-cell">
          <summary className="clamp">{s}</summary>
          <pre className="long-text">{s}</pre>
        </details>
      )
    }
    return <span>{String(v)}</span>
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{r.group}</div>
          <h1 className="page-title">{r.title}</h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: 640 }}>{r.description}</p>
        </div>
        <div className="chips">
          <span className="chip">{rows.length} rows</span>
          <span className={`chip ${r.mode === 'read' ? '' : 'active'}`}>
            {r.mode === 'crud' ? 'Create · Read · Update · Delete' : r.mode === 'mix' ? 'Read · Update' : 'Read-only'}
          </span>
        </div>
      </div>

      {msg && <div className="flash">✓ {msg}</div>}
      {(error || loadError) && <div className="flash err">⚠ {error ?? loadError?.message}</div>}

      {canCreate && (
        <details className="card panel" style={{ marginBottom: 16 }}>
          <summary className="section-title" style={{ margin: 0 }}>＋ Add new</summary>
          <form action={createRow} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <input type="hidden" name="_resource" value={r.key} />
            <div className="form-grid">
              {editable.map((f) => (
                <div key={f.name} className="field" style={f.type === 'textarea' ? { gridColumn: '1 / -1' } : undefined}>
                  {f.type !== 'boolean' && <label>{f.label}{f.required && ' *'}</label>}
                  <Input f={f} options={options} />
                </div>
              ))}
            </div>
            <div><button className="btn btn-primary">Create</button></div>
          </form>
        </details>
      )}

      <form className="toolbar">
        <input name="q" defaultValue={q} placeholder={`Search ${r.title.toLowerCase()}…`} className="input" />
        <button className="btn">Search</button>
        {q && <Link href={`/db/${r.key}`} className="btn btn-ghost">Clear</Link>}
      </form>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              {listed.map((f) => <th key={f.name}>{f.label}</th>)}
              {canEdit && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
                {listed.map((f) => (
                  <td key={f.name} style={f.long ? { minWidth: 260, maxWidth: 420 } : undefined}>{cell(f, row)}</td>
                ))}
                {canEdit && (
                  <td>
                    <div className="row-actions">
                      <details className="edit-pop">
                        <summary className="btn btn-sm">Edit</summary>
                        <form action={updateRow} className="cap-edit pop-form">
                          <input type="hidden" name="_resource" value={r.key} />
                          <input type="hidden" name="id" value={String(row.id)} />
                          {editable.map((f) => (
                            <div key={f.name} className="field">
                              {f.type !== 'boolean' && <label>{f.label}</label>}
                              <Input f={f} value={row[f.name]} options={options} />
                            </div>
                          ))}
                          <div><button className="btn btn-primary btn-sm">Save</button></div>
                        </form>
                      </details>
                      {r.mode === 'crud' && (
                        <form action={deleteRow}>
                          <input type="hidden" name="_resource" value={r.key} />
                          <input type="hidden" name="id" value={String(row.id)} />
                          <ConfirmButton message="Delete this row? This can’t be undone.">Delete</ConfirmButton>
                        </form>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={listed.length + 1} className="empty">
                  {q ? 'Nothing matches your search.' : 'Nothing here yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
