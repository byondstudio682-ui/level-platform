'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SEEN_KEY = 'byond_intro_seen'

export default function Root() {
  const router = useRouter()
  const [phase, setPhase] = useState<'dark' | 'logo' | 'out'>('dark')

  useEffect(() => {
    // Se ja viu a intro nesta sessao, vai direto
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SEEN_KEY)) {
      router.replace('/home')
      return
    }

    // Sequencia cinematografica
    const t1 = setTimeout(() => setPhase('logo'), 600)
    const t2 = setTimeout(() => setPhase('out'), 2400)
    const t3 = setTimeout(() => {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SEEN_KEY, '1')
      }
      router.replace('/home')
    }, 3000)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [router])

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 24,
    }}>
      {/* Logo */}
      <div style={{
        opacity: phase === 'logo' ? 1 : 0,
        transform: phase === 'logo' ? 'scale(1) translateY(0)' : phase === 'out' ? 'scale(1.04) translateY(-4px)' : 'scale(0.96) translateY(8px)',
        transition: phase === 'logo'
          ? 'opacity 900ms cubic-bezier(0.4,0,0.2,1), transform 900ms cubic-bezier(0.4,0,0.2,1)'
          : 'opacity 500ms ease, transform 500ms ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}>
        {/* Glow atras do logo */}
        <div style={{
          position: 'absolute',
          width: 200, height: 80,
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, transparent 70%)',
          filter: 'blur(20px)',
          opacity: phase === 'logo' ? 1 : 0,
          transition: 'opacity 1200ms ease',
          pointerEvents: 'none',
        }} />

        <span style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 800,
          fontSize: 36,
          letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.95)',
          textTransform: 'uppercase',
          position: 'relative',
        }}>
          LEVEL
        </span>

        <span style={{
          fontSize: 11,
          letterSpacing: '0.35em',
          color: 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase',
          fontWeight: 400,
          opacity: phase === 'logo' ? 1 : 0,
          transition: 'opacity 700ms ease 400ms',
        }}>
          BY BYOND LAB
        </span>
      </div>

      {/* Linha de luz sutil */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.12) 60%, transparent)',
        opacity: phase === 'logo' ? 1 : 0,
        transition: 'opacity 800ms ease 300ms',
      }} />
    </div>
  )
}
