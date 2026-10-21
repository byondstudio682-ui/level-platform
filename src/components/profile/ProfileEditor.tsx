'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Trash2, X, Check, Loader2, User } from 'lucide-react'

interface ProfileUser {
  id: string; name: string; email: string; role: string; avatar_url?: string
}

interface Props {
  user: ProfileUser
  onSaved: (updated: ProfileUser) => void
  onClose?: () => void
  /** admin editando outro usuário */
  targetUserId?: string
}

export function ProfileEditor({ user, onSaved, onClose, targetUserId }: Props) {
  const [name,       setName]       = useState(user.name)
  const [preview,    setPreview]    = useState<string | null>(user.avatar_url || null)
  const [file,       setFile]       = useState<File | null>(null)
  const [removing,   setRemoving]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (f.size > 2 * 1024 * 1024) { setError('Imagem deve ter no máximo 2MB'); return }
    setError('')
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  async function removePhoto() {
    setRemoving(true); setError('')
    try {
      const body: any = {}
      if (targetUserId) body.targetUserId = targetUserId
      const res = await fetch('/api/profile', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); setError(d.error); return }
      setPreview(null); setFile(null)
      onSaved({ ...user, avatar_url: '' })
    } finally { setRemoving(false) }
  }

  async function handleSave() {
    if (!name.trim()) { setError('Nome não pode ficar vazio'); return }
    setSaving(true); setError('')
    try {
      let avatar_url = user.avatar_url

      // Upload foto se houver nova
      if (file) {
        const fd = new FormData()
        fd.append('avatar', file)
        if (targetUserId) fd.append('targetUserId', targetUserId)
        const res = await fetch('/api/profile', { method: 'POST', body: fd })
        const d = await res.json()
        if (!res.ok) { setError(d.error || 'Erro no upload'); setSaving(false); return }
        avatar_url = d.avatar_url
      }

      // Atualizar nome
      const body: any = { name: name.trim(), avatar_url }
      if (targetUserId) body.targetUserId = targetUserId
      const res = await fetch('/api/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Erro ao salvar'); setSaving(false); return }

      setSuccess(true)
      onSaved({ ...user, name: name.trim(), avatar_url: avatar_url || '' })
      setTimeout(() => { setSuccess(false); onClose?.() }, 1200)
    } finally { setSaving(false) }
  }

  const initials = name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const hasChanges = name.trim() !== user.name || !!file

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-500 text-sm">{error}</div>
      )}

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative group cursor-pointer"
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-black/8 flex items-center justify-center border-2 border-dashed border-black/10 group-hover:border-black/30 transition-all">
            {preview ? (
              <img src={preview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-black/40 font-bold text-2xl">{initials}</span>
            )}
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-2xl transition-all flex items-center justify-center">
            <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-all" />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 hover:bg-black/10 border border-black/8 rounded-xl text-black/50 text-xs transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            {preview ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          {preview && (
            <button
              onClick={removePhoto}
              disabled={removing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-red-400 text-xs transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </button>
          )}
        </div>

        <p className="text-black/25 text-xs">JPG, PNG ou WebP — máx. 2MB</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) { handleFile(f); e.target.value = '' } }}
        />
      </div>

      {/* Nome */}
      <div>
        <label className="text-black/40 text-xs mb-1 block">Nome exibido</label>
        <input
          value={name} onChange={e => setName(e.target.value)}
          className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2.5 text-black text-sm focus:outline-none focus:border-black/30 transition-colors"
          placeholder="Seu nome"
        />
      </div>

      {/* Botão salvar */}
      <button
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          success
            ? 'bg-green-500 text-white'
            : 'bg-black text-white hover:bg-black/90 disabled:opacity-30'
        }`}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <><Check className="w-4 h-4" /> Salvo!</> : 'Salvar alterações'}
      </button>
    </div>
  )
}

/** Avatar compacto para exibir em qualquer lugar da plataforma */
export function UserAvatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl?: string; size?: number }) {
  const initials = name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const cls = `w-${size} h-${size} rounded-lg overflow-hidden bg-black/8 flex items-center justify-center flex-shrink-0`
  return (
    <div className={cls}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-black/50 font-medium text-xs">{initials}</span>
      )}
    </div>
  )
}
