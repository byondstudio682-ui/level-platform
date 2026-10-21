'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, X, User, ChevronRight, ChevronLeft } from 'lucide-react'
import { useClients, useTaskList, type Client } from '@/hooks/useData'

// ─── Sons ─────────────────────────────────────────────────────────────────────
function playTone(freq: number, dur: number, vol = 0.10) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'sine'
    o.frequency.setValueAtTime(freq, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(freq * 1.3, ctx.currentTime + dur)
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    o.start(); o.stop(ctx.currentTime + dur)
    o.onended = () => ctx.close()
  } catch {}
}
const playHover  = () => playTone(660, 0.07, 0.07)
const playSelect = () => playTone(880, 0.14, 0.14)

// ─── Formulário de novo cliente ───────────────────────────────────────────────
function NewClientModal({ onSave, onClose }: {
  onSave: (data: Omit<Client, 'id' | 'createdAt'>) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    setSaving(true)
    await onSave({ name: name.trim(), email, phone, company, notes })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Novo cliente</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder="Nome *"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30" />
        <div className="grid grid-cols-2 gap-3">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefone"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30" />
        </div>
        <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Empresa"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30" />
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observações"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 resize-none" />
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 border border-white/10 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: 'white', color: 'black' }}>
            {saving ? 'Salvando...' : 'Criar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Iniciais do cliente ──────────────────────────────────────────────────────
function ClientInitials({ name, size = 64 }: { name: string; size?: number }) {
  const parts = name.trim().split(' ')
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
  const hue = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: `hsl(${hue}, 40%, 20%)`,
      border: `1.5px solid hsl(${hue}, 40%, 30%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.34, fontWeight: 700, color: `hsl(${hue}, 60%, 75%)`, letterSpacing: '-0.02em' }}>
        {initials}
      </span>
    </div>
  )
}

// ─── Card de cliente ──────────────────────────────────────────────────────────
function ClientCard({
  client, isActive, pendingCount, onClick,
}: {
  client: Client
  isActive: boolean
  pendingCount: number
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); playHover() }}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 220,
        flexShrink: 0,
        borderRadius: 24,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        cursor: 'pointer',
        transition: 'transform 400ms cubic-bezier(0.4,0,0.2,1), opacity 400ms ease, box-shadow 300ms ease',
        transform: isActive ? 'scale(1.08)' : hovered ? 'scale(1.03)' : 'scale(0.92)',
        opacity: isActive ? 1 : hovered ? 0.75 : 0.45,
        background: isActive
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(255,255,255,0.03)',
        border: isActive
          ? '1px solid rgba(255,255,255,0.20)'
          : '1px solid rgba(255,255,255,0.07)',
        boxShadow: isActive
          ? '0 0 60px rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.5)'
          : '0 4px 20px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow de fundo no card ativo */}
      {isActive && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.07) 0%, transparent 70%)',
        }} />
      )}

      {/* Shine no hover */}
      <div className="card-shine" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <ClientInitials name={client.name} size={isActive ? 72 : 56} />

      <div style={{ textAlign: 'center', width: '100%' }}>
        <p style={{
          color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.50)',
          fontWeight: isActive ? 700 : 400,
          fontSize: isActive ? 16 : 14,
          letterSpacing: '-0.02em',
          transition: 'all 300ms ease',
          marginBottom: 4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{client.name}</p>
        {client.company && (
          <p style={{
            color: isActive ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)',
            fontSize: 11, transition: 'all 300ms ease',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{client.company}</p>
        )}
      </div>

      {pendingCount > 0 && (
        <div style={{
          background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 99, padding: '3px 10px',
          fontSize: 11, color: isActive ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.30)',
          transition: 'all 300ms ease',
        }}>
          {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
        </div>
      )}

      {isActive && (
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.30)',
          letterSpacing: '0.10em', textTransform: 'uppercase',
        }}>
          Entrar →
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()
  const { clients, loading, createClient } = useClients()
  const { tasks } = useTaskList()
  const [activeIndex, setActiveIndex] = useState(0)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [entered, setEntered] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase())
  )

  const getPendingCount = useCallback((clientId: string) => {
    return tasks.filter(t => t.clientId === clientId && t.status !== 'done' && t.status !== 'completed').length
  }, [tasks])

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Resetar índice ao filtrar
  useEffect(() => { setActiveIndex(0) }, [search])

  // Navegação por teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showNew) return
      if (e.key === 'ArrowLeft') {
        setActiveIndex(i => Math.max(0, i - 1))
        playHover()
      }
      if (e.key === 'ArrowRight') {
        setActiveIndex(i => Math.min(filtered.length - 1, i + 1))
        playHover()
      }
      if (e.key === 'Enter' && filtered[activeIndex]) {
        handleSelect(filtered[activeIndex])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtered, activeIndex, showNew])

  // Touch swipe
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) {
      if (dx < 0) setActiveIndex(i => Math.min(filtered.length - 1, i + 1))
      else setActiveIndex(i => Math.max(0, i - 1))
      playHover()
    }
  }

  async function handleSelect(client: Client) {
    playSelect()
    setSelecting(true)
    await new Promise(r => setTimeout(r, 380))
    router.push(`/clientes/${client.id}`)
  }

  const canPrev = activeIndex > 0
  const canNext = activeIndex < filtered.length - 1

  return (
    <div
      className="w-screen select-none overflow-hidden"
      style={{
        height: '100dvh',
        background: '#080808',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 32px 0',
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'opacity 500ms ease, transform 500ms ease',
      }}>
        {/* Logo */}
        <span style={{
          color: 'rgba(255,255,255,0.90)', fontWeight: 800, fontSize: 15,
          letterSpacing: '0.18em', fontFamily: 'Inter, sans-serif',
        }}>
          LEVEL
        </span>

        {/* Label + Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showSearch ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 12, padding: '6px 32px 6px 12px',
                  color: 'white', fontSize: 13,
                  outline: 'none', width: 200,
                }}
              />
              <button
                onClick={() => { setSearch(''); setShowSearch(false) }}
                style={{ position: 'absolute', right: 8, color: 'rgba(255,255,255,0.40)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              style={{ color: 'rgba(255,255,255,0.35)', transition: 'color 200ms' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.70)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
            >
              <Search className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowNew(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10, padding: '6px 14px',
              color: 'rgba(255,255,255,0.80)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'all 200ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.16)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Novo
          </button>
        </div>
      </div>

      {/* Label CLIENTES */}
      <div style={{
        textAlign: 'center', marginTop: 28,
        opacity: entered ? 1 : 0,
        transition: 'opacity 500ms ease 100ms',
      }}>
        <span style={{
          fontSize: 11, letterSpacing: '0.30em', fontWeight: 600,
          color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
        }}>
          {search ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}` : 'CLIENTES'}
        </span>
      </div>

      {/* Carrossel */}
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          opacity: entered ? (selecting ? 0 : 1) : 0,
          transform: entered ? (selecting ? 'scale(1.04)' : 'translateY(0)') : 'translateY(32px)',
          transition: selecting
            ? 'opacity 350ms ease, transform 350ms ease'
            : 'opacity 600ms ease 150ms, transform 600ms ease 150ms',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.10)',
              borderTopColor: 'rgba(255,255,255,0.50)',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: 13 }}>Carregando clientes...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <User style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.12)' }} />
            <p style={{ color: 'rgba(255,255,255,0.30)', fontSize: 14 }}>
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </p>
            {!search && (
              <button
                onClick={() => setShowNew(true)}
                style={{ color: 'rgba(255,255,255,0.50)', fontSize: 13, textDecoration: 'underline' }}
              >
                Cadastrar primeiro cliente
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Track horizontal */}
            <div
              ref={trackRef}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '24px 80px',
                overflow: 'visible',
              }}
            >
              {filtered.map((client, i) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  isActive={i === activeIndex}
                  pendingCount={getPendingCount(client.id)}
                  onClick={() => {
                    if (i === activeIndex) handleSelect(client)
                    else { setActiveIndex(i); playHover() }
                  }}
                />
              ))}
            </div>

            {/* Setas de navegação */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
              <button
                onClick={() => { setActiveIndex(i => Math.max(0, i - 1)); playHover() }}
                disabled={!canPrev}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: canPrev ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: canPrev ? 'pointer' : 'default',
                  color: canPrev ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.15)',
                  transition: 'all 200ms',
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Dots */}
              <div style={{ display: 'flex', gap: 6 }}>
                {filtered.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveIndex(i); playHover() }}
                    style={{
                      width: i === activeIndex ? 20 : 6,
                      height: 6, borderRadius: 99,
                      background: i === activeIndex ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.15)',
                      border: 'none', cursor: 'pointer', padding: 0,
                      transition: 'all 300ms ease',
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => { setActiveIndex(i => Math.min(filtered.length - 1, i + 1)); playHover() }}
                disabled={!canNext}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: canNext ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: canNext ? 'pointer' : 'default',
                  color: canNext ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.15)',
                  transition: 'all 200ms',
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <p style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>
              ← → navegar · Enter entrar · clique para selecionar
            </p>
          </>
        )}
      </div>

      {/* Modal novo cliente */}
      {showNew && (
        <NewClientModal
          onSave={createClient}
          onClose={() => setShowNew(false)}
        />
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
