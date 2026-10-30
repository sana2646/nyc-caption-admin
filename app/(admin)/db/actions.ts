'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { type Resource, getResource, isEditable } from '@/lib/resources'

function back(r: Resource, msg: string, isError = false): never {
  redirect(`/db/${r.key}?${isError ? 'error' : 'msg'}=${encodeURIComponent(msg)}`)
}

function load(fd: FormData) {
  const r = getResource(String(fd.get('_resource') ?? ''))
  if (!r) redirect('/')
  return r
}

/** Turn form text into the right type for each column. */
function values(r: Resource, fd: FormData) {
  const out: Record<string, string | number | boolean | null> = {}
  for (const f of r.fields.filter(isEditable)) {
    if (r.mode === 'mix' && f.name !== 'caption_count') continue
    const raw = fd.get(f.name)
    if (f.type === 'boolean') {
      out[f.name] = raw === 'on'
      continue
    }
    const text = String(raw ?? '').trim()
    if (!text) {
      if (f.required) back(r, `${f.label} is required.`, true)
      out[f.name] = null
      continue
    }
    if (f.type === 'number' || f.type === 'ref') {
      const n = Number(text)
      if (Number.isNaN(n)) back(r, `${f.label} must be a number.`, true)
      out[f.name] = n
    } else {
      out[f.name] = f.name === 'email' || f.name === 'apex_domain' ? text.toLowerCase() : text
    }
  }
  return out
}

export async function createRow(fd: FormData) {
  const r = load(fd)
  if (r.mode !== 'crud') back(r, 'This table is read-only.', true)
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from(r.table).insert(values(r, fd))
  if (error) back(r, error.message, true)
  revalidatePath('/', 'layout')
  back(r, 'Added.')
}

export async function updateRow(fd: FormData) {
  const r = load(fd)
  if (r.mode === 'read') back(r, 'This table is read-only.', true)
  const { supabase } = await requireAdmin()

  const data = values(r, fd)
  if (r.mode === 'mix') data.updated_at = new Date().toISOString()

  const { error } = await supabase.from(r.table).update(data).eq('id', String(fd.get('id')))
  if (error) back(r, error.message, true)
  revalidatePath('/', 'layout')
  back(r, 'Saved.')
}

export async function deleteRow(fd: FormData) {
  const r = load(fd)
  if (r.mode !== 'crud') back(r, 'Rows in this table can’t be deleted here.', true)
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from(r.table).delete().eq('id', String(fd.get('id')))
  if (error) back(r, error.message, true)
  revalidatePath('/', 'layout')
  back(r, 'Deleted.')
}
