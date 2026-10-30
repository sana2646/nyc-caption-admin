/* eslint-disable @next/next/no-img-element */
import { requireAdmin } from '@/lib/auth'
import { type Profile, formatDate, fullName } from '@/lib/data'
import ConfirmButton from '@/components/ConfirmButton'
import ImageUploader from '@/components/ImageUploader'
import { deleteImage, updateImage } from './actions'

export const dynamic = 'force-dynamic'

type ImageRow = {
  id: string
  url: string
  profile_id: string | null
  description: string | null
  is_public: boolean
  created_at: string
}

export default async function ImagesPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const { msg, error } = await searchParams
  const { supabase } = await requireAdmin()

  const [{ data: i }, { data: p }, { data: c }] = await Promise.all([
    supabase.from('images').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, first_name, last_name'),
    supabase.from('captions').select('image_url'),
  ])
  const images = (i ?? []) as ImageRow[]
  const people = new Map(((p ?? []) as Profile[]).map((x) => [x.id, x]))
  const captionCount = new Map<string, number>()
  for (const row of (c ?? []) as { image_url: string }[]) {
    captionCount.set(row.image_url, (captionCount.get(row.image_url) ?? 0) + 1)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Media</div>
          <h1 className="page-title">Images</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Every photo uploaded to the club. Upload new ones, edit details, or delete them.
            Unchecking <strong>Public</strong> hides a photo from the feed.
          </p>
        </div>
        <div className="chips">
          <span className="chip">{images.length} images</span>
          <span className="chip active">Create · Read · Update · Delete</span>
        </div>
      </div>

      {msg && <div className="flash">✓ {msg}</div>}
      {error && <div className="flash err">⚠ {error}</div>}

      <ImageUploader />

      {images.length === 0 && <div className="card empty">No images yet.</div>}
      <div className="image-grid">
        {images.map((img) => (
          <div key={img.id} className="card image-card">
            <a href={img.url} target="_blank" rel="noreferrer">
              <img src={img.url} alt={img.description ?? ''} />
            </a>
            <div style={{ padding: 14, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span className="small muted">by {fullName(img.profile_id ? people.get(img.profile_id) : null)}</span>
                {img.is_public ? <span className="pill up">Public</span> : <span className="pill neutral">Hidden</span>}
              </div>
              <div className="clamp">{img.description || <span className="faint">No description</span>}</div>
              <div className="small faint">
                {captionCount.get(img.url) ?? 0} captions · {formatDate(img.created_at)}
              </div>
              <div className="row-actions" style={{ justifyContent: 'flex-start' }}>
                <details className="edit-pop">
                  <summary className="btn btn-sm">Edit</summary>
                  <form action={updateImage} className="cap-edit pop-form">
                    <input type="hidden" name="id" value={img.id} />
                    <img src={img.url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10 }} />
                    <div className="field">
                      <label>Description</label>
                      <textarea name="description" defaultValue={img.description ?? ''} className="textarea" />
                    </div>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="checkbox" name="is_public" defaultChecked={img.is_public} /> Public
                    </label>
                    <div><button className="btn btn-primary btn-sm">Save</button></div>
                  </form>
                </details>
                <form action={deleteImage}>
                  <input type="hidden" name="id" value={img.id} />
                  <input type="hidden" name="url" value={img.url} />
                  <ConfirmButton message={`Delete this image and its ${captionCount.get(img.url) ?? 0} captions? This can’t be undone.`}>Delete</ConfirmButton>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
