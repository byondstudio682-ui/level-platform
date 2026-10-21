'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckSquare, Settings,
  Calendar, Bot, Clock, GitBranch, LogOut
} from 'lucide-react'

const MODULES = [
  { href: '/tarefas',       label: 'Tarefas',         icon: CheckSquare, desc: 'Board kanban' },
  { href: '/assistente',    label: 'Assistente IA',   icon: Bot,         desc: 'IA integrada' },
  { href: '/calendario',    label: 'Calendário',       icon: Calendar,    desc: 'Agenda interna' },
  { href: '/tempo',         label: 'Tempo',            icon: Clock,       desc: 'Controle de horas' },
  { href: '/processos',     label: 'Processos',        icon: GitBranch,   desc: 'Mapa de processos' },
  { href: '/configuracoes', label: 'Configurações',    icon: Settings,    desc: 'Conta e usuários' },
]

// Sons de UI via Web Audio API
function playTick() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
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
    const o = ctx.createOscillator()
    const g = ctx.createGain()
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

function getUser() {
  if (typeof document === 'undefined') return null
  const cookie = document.cookie.split(';').find(c => c.trim().startsWith('byond_user='))
  if (!cookie) return null
  try {
    const raw = cookie.trim().split('=').slice(1).join('=')
    return JSON.parse(atob(raw))
  } catch { return null }
}

// Apple App Store style — peek carousel flat
const CARD_W = 300   // largura do card
const CARD_H = 440   // altura do card (retrato)
const CARD_GAP = 16  // gap entre cards

function getCardStyle(offset: number) {
  const abs = Math.abs(offset)
  if (abs > 1) return null // centro + vizinhos imediatos apenas

  const translateX = offset * (CARD_W + CARD_GAP)
  const scale      = abs === 0 ? 1 : 0.94
  const opacity    = abs === 0 ? 1 : 0.50
  const zIndex     = abs === 0 ? 10 : 5

  return {
    transform: `translateX(${translateX}px) scale(${scale})`,
    opacity,
    zIndex,
    transition: 'transform 440ms cubic-bezier(0.4,0,0.2,1), opacity 440ms ease',
  }
}

export default function InicioPage() {
  const router  = useRouter()
  const [active, setActive]   = useState(2) // começa no centro (Assistente)
  const [entered, setEntered] = useState(false)
  const [user, setUser]       = useState<{ name: string; avatar_url: string | null; slug: string } | null>(null)

  useEffect(() => { setUser(getUser()) }, [])
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80)
    return () => clearTimeout(t)
  }, [])

  const prev = useCallback(() => { playTick(); setActive(a => Math.max(0, a - 1)) }, [])
  const next = useCallback(() => { playTick(); setActive(a => Math.min(MODULES.length - 1, a + 1)) }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Enter') { playSelect(); router.push(MODULES[active].href) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, prev, next, router])

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <div
      className="w-screen min-h-screen bg-white select-none flex flex-col"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
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
        <button onClick={logout} className="text-black/20 hover:text-black/50 transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Carrossel 3D */}
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 600ms ease 120ms, transform 600ms ease 120ms',
        }}
      >
        {/* Track Apple-style peek carousel */}
        <div className="relative flex items-center justify-center" style={{ height: CARD_H + 24, width: '100%', overflow: 'visible' }}>
          {MODULES.map((mod, i) => {
            const offset = i - active
            const cardStyle = getCardStyle(offset)
            if (!cardStyle) return null
            const Icon = mod.icon
            const isCenter = offset === 0

            return (
              <div
                key={mod.href}
                className="absolute level-icon-wrap"
                style={{ ...cardStyle, cursor: isCenter ? 'pointer' : 'pointer' }}
                onClick={() => {
                  if (isCenter) { playSelect(); router.push(mod.href) }
                  else if (offset < 0) prev()
                  else next()
                }}
              >
                <div
                  className="level-icon-card flex flex-col items-center justify-center gap-6"
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    borderRadius: 28,
                    background: isCenter ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)',
                    border: isCenter ? '1px solid rgba(0,0,0,0.14)' : '1px solid rgba(0,0,0,0.07)',
                    boxShadow: isCenter
                      ? '0 24px 72px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)'
                      : '0 4px 16px rgba(0,0,0,0.04)',
                    backdropFilter: 'blur(12px)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <span className="level-shine" aria-hidden="true" />
                  {/* Ícone grande no topo */}
                  <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: 18,
                    background: isCenter ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 300ms ease',
                  }}>
                    <Icon style={{
                      width: isCenter ? 36 : 28,
                      height: isCenter ? 36 : 28,
                      color: isCenter ? 'rgba(0,0,0,0.80)' : 'rgba(0,0,0,0.35)',
                      transition: 'all 300ms ease',
                    }} />
                  </div>
                  {/* Label */}
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{
                      fontSize: isCenter ? 18 : 15,
                      fontWeight: isCenter ? 700 : 400,
                      color: isCenter ? 'rgba(0,0,0,0.82)' : 'rgba(0,0,0,0.35)',
                      transition: 'all 300ms ease',
                      letterSpacing: '-0.02em',
                    }}>
                      {mod.label}
                    </span>
                    <span style={{
                      fontSize: 12,
                      color: isCenter ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.15)',
                      transition: 'all 300ms ease',
                      letterSpacing: '0.02em',
                    }}>
                      {mod.desc}
                    </span>
                  </div>
                  {isCenter && (
                    <span style={{
                      fontSize: 11,
                      color: 'rgba(0,0,0,0.22)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}>
                      Abrir →
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Dots de navegação */}
        <div className="flex items-center gap-2 mt-8">
          {MODULES.map((_, i) => (
            <button
              key={i}
              onClick={() => { playTick(); setActive(i) }}
              style={{
                width: i === active ? 20 : 6,
                height: 6,
                borderRadius: 99,
                background: i === active ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.12)',
                transition: 'all 300ms ease',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>

        {/* Hint */}
        <p className="text-black/20 text-xs tracking-widest mt-6">← → navegar · Enter abrir</p>
      </div>

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
        .level-icon-wrap:hover .level-shine {
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
