'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'

const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()

function done(msg: string, isError = false): never {
  redirect(`/captions?${isError ? 'error' : 'msg'}=${encodeURIComponent(msg)}`)
}

// CREATE
export async function createCaption(fd: FormData) {
  const { supabase, user } = await requireAdmin()

  const caption = str(fd, 'caption')
  const image_url = str(fd, 'image_url') || str(fd, 'existing_image')
  const theme = str(fd, 'theme') || null
  const prompt = str(fd, 'prompt') || 'Added manually by an admin'

  if (!caption || !image_url) done('A caption and a photo are required.', true)

  const { error } = await supabase
    .from('captions')
    .insert({ caption, image_url, theme, prompt, user_id: user.id })

  if (error) done(error.message, true)
  revalidatePath('/', 'layout')
  done('Caption added.')
}

// UPDATE
export async function updateCaption(fd: FormData) {
  const { supabase } = await requireAdmin()

  const id = str(fd, 'id')
  const caption = str(fd, 'caption')
  if (!id || !caption) done('Caption text can’t be empty.', true)

  const { error } = await supabase
    .from('captions')
    .update({
      caption,
      theme: str(fd, 'theme') || null,
      prompt: str(fd, 'prompt') || 'Edited by an admin',
    })
    .eq('id', id)

  if (error) done(error.message, true)
  revalidatePath('/', 'layout')
  done('Caption updated.')
}

// DELETE (its votes are removed automatically by the database)
export async function deleteCaption(fd: FormData) {
  const { supabase } = await requireAdmin()

  const id = str(fd, 'id')
  const { error } = await supabase.from('captions').delete().eq('id', id)

  if (error) done(error.message, true)
  revalidatePath('/', 'layout')
  done('Caption deleted.')
}
