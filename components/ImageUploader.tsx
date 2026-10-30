'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ImageUploader() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pick = (f: File | null) => {
    setError('')
    if (!f) return
    if (!f.type.startsWith('image/')) return setError('Please choose an image file.')
    if (f.size > 5 * 1024 * 1024) return setError('Please choose an image under 5 MB.')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const upload = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      return setError('You are signed out. Refresh and sign in again.')
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/admin-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('uploads').upload(path, file, { contentType: file.type })
    if (upErr) {
      setBusy(false)
      return setError(upErr.message)
    }
    const url = supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl

    const { error: dbErr } = await supabase
      .from('images')
      .insert({ url, profile_id: user.id, description: description || null, is_public: isPublic })
    setBusy(false)
    if (dbErr) return setError(dbErr.message)

    setFile(null)
    setPreview('')
    setDescription('')
    router.refresh()
  }

  return (
    <div className="card panel" style={{ marginBottom: 16 }}>
      <div className="section-title">＋ Upload a new image</div>
      <div className="uploader">
        <button
          type="button"
          className="dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            pick(e.dataTransfer.files?.[0] ?? null)
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" />
          ) : (
            <span>📸<br />Drop a photo or click</span>
          )}
        </button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        <div style={{ display: 'grid', gap: 10, flex: 1, minWidth: 220 }}>
          <div className="field">
            <label>Description</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bodega cat guarding the chips" />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Public
          </label>
          <div>
            <button className="btn btn-primary" disabled={!file || busy} onClick={upload}>
              {busy ? 'Uploading…' : 'Upload image'}
            </button>
          </div>
          {error && <div className="flash err" style={{ margin: 0 }}>⚠ {error}</div>}
        </div>
      </div>
    </div>
  )
}
