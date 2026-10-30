'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'

function done(msg: string, isError = false): never {
  redirect(`/images?${isError ? 'error' : 'msg'}=${encodeURIComponent(msg)}`)
}

export async function updateImage(fd: FormData) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('images')
    .update({
      description: String(fd.get('description') ?? '').trim() || null,
      is_public: fd.get('is_public') === 'on',
    })
    .eq('id', String(fd.get('id')))
  if (error) done(error.message, true)
  revalidatePath('/images')
  done('Image updated.')
}

export async function deleteImage(fd: FormData) {
  const { supabase } = await requireAdmin()
  const id = String(fd.get('id'))
  const url = String(fd.get('url') ?? '')

  // Captions on this photo go too (their votes are removed by the database)
  const { error: capErr } = await supabase.from('captions').delete().eq('image_url', url)
  if (capErr) done(capErr.message, true)

  const { error } = await supabase.from('images').delete().eq('id', id)
  if (error) done(error.message, true)

  // Also remove the file itself if it lives in our "uploads" bucket
  const marker = '/storage/v1/object/public/uploads/'
  const i = url.indexOf(marker)
  if (i !== -1) {
    await supabase.storage.from('uploads').remove([decodeURIComponent(url.slice(i + marker.length).split('?')[0])])
  }

  revalidatePath('/images')
  done('Image deleted.')
}
