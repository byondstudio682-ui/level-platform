'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, X, User, ChevronRight, ChevronLeft, LogOut } from 'lucide-react'
import { useClients, useTaskList, type Client } from '@/hooks/useData'

// ─── Sons (mesmos do /inicio) ─────────────────────────────────────────────────
function playTick() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'sine'
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08)
    g.gain.setValueAtTime(0.12, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.10)
    o.start(); o.stop(ctx.currentTime + 0.10)
    o.onended = () => ctx.close()
  } catch {}
}

function playSelect() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'sine'
    o.frequency.setValueAtTime(660, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.12)
    g.gain.setValueAtTime(0.18, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
    o.start(); o.stop(ctx.currentTime + 0.18)
    o.onended = () => ctx.close()
  } catch {}
}

// ─── Cookie do usuário ────────────────────────────────────────────────────────
function getUser() {
  if (typeof document === 'undefined') return null
  const cookie = document.cookie.split(';').find(c => c.trim().startsWith('byond_user='))
  if (!cookie) return null
  try {
    const raw = cookie.trim().split('=').slice(1).join('=')
    return JSON.parse(atob(raw))
  } catch { return null }
}

// ─── Iniciais ─────────────────────────────────────────────────────────────────
function ClientInitials({ name, size = 48, isCenter = false }: { name: string; size?: number; isCenter?: boolean }) {
  const parts = name.trim().split(' ')
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()

  return (
    <div style={{
      width: size, height: size,
      borderRadius: size * 0.26,
      background: isCenter ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)',
      border: isCenter ? '1.5px solid rgba(0,0,0,0.18)' : '1.5px solid rgba(0,0,0,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      transition: 'all 300ms ease',
    }}>
      <span style={{
        fontSize: size * 0.36, fontWeight: 700,
        color: isCenter ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.35)',
        letterSpacing: '-0.02em',
        fontFamily: 'Inter, sans-serif',
        transition: 'all 300ms ease',
      }}>
        {initials}
      </span>
    </div>
  )
}

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
      style={{ background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-white border border-black/10 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-black">Novo cliente</h2>
          <button onClick={onClose} className="text-black/30 hover:text-black transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder="Nome *" onKeyDown={e => e.key === 'Enter' && handleSave()}
          className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2.5 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30" />
        <div className="grid grid-cols-2 gap-3">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2.5 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefone"
            className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2.5 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30" />
        </div>
        <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Empresa"
          className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2.5 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30" />
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observações"
          className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2.5 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30 resize-none" />
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-black/40 hover:text-black border border-black/10 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-black text-white font-medium rounded-xl py-2.5 text-sm hover:bg-black/90 transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : 'Criar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card de cliente (estilo /inicio — Apple peek carousel) ───────────────────
const CARD_W = 260
const CARD_H = 380
const CARD_GAP = 16

function getCardStyle(offset: number) {
  const abs = Math.abs(offset)
  if (abs > 1) return null
  const translateX = offset * (CARD_W + CARD_GAP)
  const scale   = abs === 0 ? 1 : 0.92
  const opacity = abs === 0 ? 1 : 0.45
  const zIndex  = abs === 0 ? 10 : 5
  return {
    transform: `translateX(${translateX}px) scale(${scale})`,
    opacity, zIndex,
    transition: 'transform 440ms cubic-bezier(0.4,0,0.2,1), opacity 440ms ease',
  }
}

// ─── Página de seleção de clientes ────────────────────────────────────────────
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
  const [user, setUser] = useState<{ name: string } | null>(null)
  const touchStartX = useRef(0)

  useEffect(() => { setUser(getUser()) }, [])
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80)
    return () => clearTimeout(t)
  }, [])

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase())
  )

  const getPendingCount = useCallback((clientId: string) =>
    tasks.filter(t => t.clientId === clientId && t.status !== 'done' && t.status !== 'completed').length
  , [tasks])

  useEffect(() => { setActiveIndex(0) }, [search])

  const prev = useCallback(() => { playTick(); setActiveIndex(a => Math.max(0, a - 1)) }, [])
  const next = useCallback(() => { playTick(); setActiveIndex(a => Math.min(filtered.length - 1, a + 1)) }, [filtered.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showNew) return
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Enter' && filtered[activeIndex]) handleSelect(filtered[activeIndex])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtered, activeIndex, showNew, prev, next])

  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev() }
  }

  async function handleSelect(client: Client) {
    playSelect()
    setSelecting(true)
    await new Promise(r => setTimeout(r, 350))
    router.push(`/clientes/${client.id}`)
  }

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <div
      className="w-screen min-h-screen bg-white select-none flex flex-col"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header — mesmo padrão do /inicio */}
      <div
        className="flex items-center justify-between px-8 pt-8 flex-shrink-0"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(-12px)',
          transition: 'opacity 500ms ease, transform 500ms ease',
        }}
      >
        <div className="flex flex-col">
          <p className="text-black/80 text-sm font-semibold tracking-tight">{user?.name ?? '...'}</p>
          <span className="text-black/30 text-[10px] font-light tracking-[0.3em] uppercase">LEVEL</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Busca */}
          {showSearch ? (
            <div className="relative flex items-center">
              <input
                autoFocus value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="bg-black/5 border border-black/10 rounded-xl px-3 py-1.5 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/25 w-44"
              />
              <button onClick={() => { setSearch(''); setShowSearch(false) }} className="absolute right-2.5 text-black/30 hover:text-black/60">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowSearch(true)} className="text-black/25 hover:text-black/60 transition-colors">
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Novo cliente */}
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-xl text-xs font-medium hover:bg-black/85 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Novo
          </button>

          {/* Logout */}
          <button onClick={logout} className="text-black/20 hover:text-black/50 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Label da seção */}
      <div
        className="text-center mt-6 flex-shrink-0"
        style={{
          opacity: entered ? 1 : 0,
          transition: 'opacity 500ms ease 80ms',
        }}
      >
        <span className="text-black/25 text-[10px] font-light tracking-[0.30em] uppercase">
          {search ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}` : 'Clientes'}
        </span>
      </div>

      {/* Carrossel — estilo Apple peek (mesmo do /inicio) */}
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={{
          opacity: entered ? (selecting ? 0 : 1) : 0,
          transform: entered ? (selecting ? 'scale(1.03)' : 'translateY(0)') : 'translateY(24px)',
          transition: selecting
            ? 'opacity 320ms ease, transform 320ms ease'
            : 'opacity 600ms ease 120ms, transform 600ms ease 120ms',
        }}
      >
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-black/15 border-t-black/50 rounded-full animate-spin" />
            <span className="text-black/30 text-sm">Carregando...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <User className="w-10 h-10 text-black/12" />
            <p className="text-black/30 text-sm">{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p>
            {!search && (
              <button onClick={() => setShowNew(true)} className="text-black/40 text-sm underline">
                Cadastrar primeiro cliente
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Track peek carousel */}
            <div
              className="relative flex items-center justify-center"
              style={{ height: CARD_H + 24, width: '100%', overflow: 'visible' }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {filtered.map((client, i) => {
                const offset = i - activeIndex
                const cardStyle = getCardStyle(offset)
                if (!cardStyle) return null
                const isCenter = offset === 0
                const pending = getPendingCount(client.id)

                return (
                  <div
                    key={client.id}
                    className="absolute level-client-wrap"
                    style={{ ...cardStyle, cursor: 'pointer' }}
                    onClick={() => {
                      if (isCenter) handleSelect(client)
                      else if (offset < 0) prev()
                      else next()
                    }}
                  >
                    <div
                      className="level-client-card flex flex-col items-center justify-center gap-5"
                      style={{
                        width: CARD_W,
                        height: CARD_H,
                        borderRadius: 28,
                        background: isCenter ? 'rgba(0,0,0,0.055)' : 'rgba(0,0,0,0.025)',
                        border: isCenter ? '1px solid rgba(0,0,0,0.13)' : '1px solid rgba(0,0,0,0.06)',
                        boxShadow: isCenter
                          ? '0 24px 72px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)'
                          : '0 4px 16px rgba(0,0,0,0.04)',
                        backdropFilter: 'blur(12px)',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      {/* Efeito shine (mesmo do /inicio) */}
                      <span className="level-shine" aria-hidden="true" />

                      {/* Avatar */}
                      <ClientInitials name={client.name} size={isCenter ? 72 : 52} isCenter={isCenter} />

                      {/* Nome e empresa */}
                      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4, padding: '0 20px' }}>
                        <span style={{
                          fontSize: isCenter ? 17 : 14,
                          fontWeight: isCenter ? 700 : 400,
                          color: isCenter ? 'rgba(0,0,0,0.82)' : 'rgba(0,0,0,0.35)',
                          transition: 'all 300ms ease',
                          letterSpacing: '-0.02em',
                          fontFamily: 'Inter, sans-serif',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          maxWidth: CARD_W - 40,
                        }}>
                          {client.name}
                        </span>
                        {client.company && (
                          <span style={{
                            fontSize: 12,
                            color: isCenter ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.18)',
                            transition: 'all 300ms ease',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            maxWidth: CARD_W - 40,
                          }}>
                            {client.company}
                          </span>
                        )}
                      </div>

                      {/* Badge pendentes */}
                      {pending > 0 && (
                        <span style={{
                          fontSize: 11,
                          color: isCenter ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.20)',
                          background: isCenter ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: 99, padding: '3px 10px',
                          transition: 'all 300ms ease',
                        }}>
                          {pending} pendente{pending !== 1 ? 's' : ''}
                        </span>
                      )}

                      {/* CTA */}
                      {isCenter && (
                        <span style={{
                          fontSize: 11,
                          color: 'rgba(0,0,0,0.22)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}>
                          Entrar →
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Dots de navegação — mesmo do /inicio */}
            <div className="flex items-center gap-2 mt-8">
              {filtered.length > 1 && (
                <button
                  onClick={prev}
                  disabled={activeIndex === 0}
                  className="text-black/20 hover:text-black/50 disabled:opacity-30 transition-colors mr-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {filtered.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { playTick(); setActiveIndex(i) }}
                  style={{
                    width: i === activeIndex ? 20 : 6,
                    height: 6, borderRadius: 99,
                    background: i === activeIndex ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.12)',
                    transition: 'all 300ms ease',
                    border: 'none', cursor: 'pointer', padding: 0,
                  }}
                />
              ))}
              {filtered.length > 1 && (
                <button
                  onClick={next}
                  disabled={activeIndex === filtered.length - 1}
                  className="text-black/20 hover:text-black/50 disabled:opacity-30 transition-colors ml-1"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-black/20 text-xs tracking-widest mt-6">← → navegar · Enter entrar</p>
          </>
        )}
      </div>

      {/* Link para módulos internos */}
      <div
        className="flex-shrink-0 pb-6 text-center"
        style={{
          opacity: entered ? 1 : 0,
          transition: 'opacity 500ms ease 300ms',
        }}
      >
        <button
          onClick={() => router.push('/inicio')}
          className="text-black/20 text-xs tracking-widest hover:text-black/40 transition-colors"
        >
          Ver módulos →
        </button>
      </div>

      {/* Modal */}
      {showNew && (
        <NewClientModal onSave={createClient} onClose={() => setShowNew(false)} />
      )}

      {/* Reutiliza exatamente os mesmos estilos de animação do /inicio */}
      <style jsx global>{`
        .level-shine {
          position: absolute;
          top: 0; left: -80%;
          width: 60%; height: 100%;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%);
          transform: skewX(-15deg);
          pointer-events: none;
          opacity: 0;
        }
        .level-client-wrap:hover .level-shine {
          animation: shine-once 500ms cubic-bezier(0.4,0,0.2,1) forwards;
        }
        @keyframes shine-once {
          0%   { left: -80%; opacity: 1; }
          100% { left: 140%; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
