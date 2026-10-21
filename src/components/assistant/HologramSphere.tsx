'use client'
import { useEffect, useRef } from 'react'

type SphereState = 'idle' | 'thinking' | 'responding'

interface Props {
  state: SphereState
}

const N = 1400          // partículas
const R = 110           // raio base
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

// Gera pontos uniformes na esfera (distribuição espiral de Fibonacci)
function genPoints(n: number) {
  const pts: [number, number, number][] = []
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = GOLDEN * i
    pts.push([Math.cos(theta) * r, y, Math.sin(theta) * r])
  }
  return pts
}
const BASE_PTS = genPoints(N)

export function HologramSphere({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const timeRef   = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let angleY = 0
    let angleX = 0.3

    function draw(ts: number) {
      if (!canvas) return
      const dt = Math.min(ts - timeRef.current, 50) / 1000
      timeRef.current = ts

      const W = canvas.width  = canvas.offsetWidth  * devicePixelRatio
      const H = canvas.height = canvas.offsetHeight * devicePixelRatio
      const cx = W / 2, cy = H / 2

      ctx.clearRect(0, 0, W, H)

      // Velocidade de rotação por estado
      const speed = state === 'thinking' ? 2.2 : state === 'responding' ? 0.6 : 0.28
      angleY += speed * dt
      angleX = 0.3 + Math.sin(ts * 0.0003) * 0.12

      // Pulso de raio
      const pulse = state === 'thinking'
        ? 1 + 0.08 * Math.sin(ts * 0.008)
        : state === 'responding'
          ? 1 + 0.04 * Math.sin(ts * 0.004)
          : 1 + 0.015 * Math.sin(ts * 0.001)

      const scale = devicePixelRatio
      const r = R * scale * pulse

      // Matrizes de rotação
      const cosY = Math.cos(angleY), sinY = Math.sin(angleY)
      const cosX = Math.cos(angleX), sinX = Math.sin(angleX)

      // Ordena por profundidade (z) para efeito de transparência
      const projected: { x: number; y: number; z: number }[] = BASE_PTS.map(([px, py, pz]) => {
        // Rotação Y
        const x1 = px * cosY - pz * sinY
        const z1 = px * sinY + pz * cosY
        // Rotação X
        const y2 = py * cosX - z1 * sinX
        const z2 = py * sinX + z1 * cosX
        return { x: cx + x1 * r, y: cy + y2 * r, z: z2 }
      })

      projected.sort((a, b) => a.z - b.z)

      // Renderiza partículas
      for (const pt of projected) {
        const depth = (pt.z / R + 1) / 2  // 0 (fundo) → 1 (frente)
        const alpha = state === 'thinking'
          ? 0.25 + depth * 0.75
          : 0.15 + depth * 0.70
        const size  = (0.6 + depth * 1.4) * scale

        // Halo nas partículas frontais
        if (depth > 0.85 && state !== 'idle') {
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, size * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200,220,255,${alpha * 0.18})`
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2)
        const c = state === 'thinking' ? `rgba(180,210,255,${alpha})` : `rgba(255,255,255,${alpha})`
        ctx.fillStyle = c
        ctx.fill()
      }

      // Anel equatorial (ornamento JARVIS)
      const ringOpacity = state === 'idle' ? 0.08 : state === 'responding' ? 0.18 : 0.30
      ctx.beginPath()
      ctx.ellipse(cx, cy, r * 1.02, r * 0.22, angleY * 0.3, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(180,220,255,${ringOpacity})`
      ctx.lineWidth = 0.8 * scale
      ctx.stroke()

      // Segundo anel inclinado
      ctx.beginPath()
      ctx.ellipse(cx, cy, r * 0.95, r * 0.18, -angleY * 0.5 + 1, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,255,255,${ringOpacity * 0.6})`
      ctx.lineWidth = 0.5 * scale
      ctx.stroke()

      // Glow central quando thinking
      if (state === 'thinking') {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.6)
        grad.addColorStop(0, `rgba(100,160,255,${0.08 + 0.05 * Math.sin(ts * 0.01)})`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [state])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
