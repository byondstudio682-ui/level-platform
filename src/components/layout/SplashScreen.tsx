'use client'
import { useEffect, useState } from 'react'

export function SplashScreen() {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out' | 'done'>('in')

  useEffect(() => {
    // Só roda uma vez por sessão
    if (sessionStorage.getItem('level_splash_done')) {
      setPhase('done')
      return
    }

    // Fase 1: logo entra (fade in)
    const t1 = setTimeout(() => setPhase('hold'), 100)
    // Fase 2: hold por 2s
    const t2 = setTimeout(() => setPhase('out'), 2200)
    // Fase 3: saída completa → remove
    const t3 = setTimeout(() => {
      setPhase('done')
      sessionStorage.setItem('level_splash_done', '1')
    }, 3000)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out'
          ? 'opacity 700ms cubic-bezier(0.4,0,0.2,1)'
          : 'none',
        pointerEvents: phase === 'out' ? 'none' : 'all',
      }}
    >
      {/* Logo */}
      <div
        style={{
          opacity: phase === 'in' ? 0 : 1,
          transform: phase === 'in' ? 'scale(0.92) translateY(8px)' : 'scale(1) translateY(0)',
          transition: 'opacity 800ms cubic-bezier(0.4,0,0.2,1), transform 800ms cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            fontSize: 52,
            letterSpacing: '0.22em',
            color: '#ffffff',
            lineHeight: 1,
          }}
        >
          LEVEL
        </span>
        {/* Linha decorativa */}
        <span
          style={{
            display: 'block',
            width: phase === 'in' ? 0 : 48,
            height: 1,
            background: 'rgba(255,255,255,0.25)',
            transition: 'width 900ms cubic-bezier(0.4,0,0.2,1) 300ms',
          }}
        />
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 300,
            fontSize: 11,
            letterSpacing: '0.45em',
            color: 'rgba(255,255,255,0.30)',
            textTransform: 'uppercase',
            opacity: phase === 'in' ? 0 : 1,
            transition: 'opacity 700ms ease 500ms',
          }}
        >
          Gestão inteligente
        </span>
      </div>
    </div>
  )
}
