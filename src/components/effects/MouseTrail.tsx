'use client'

import { useEffect, useRef } from 'react'

interface Segment {
  x: number
  y: number
  age: number
}

export function MouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const segmentsRef = useRef<Segment[]>([])
  const rafRef = useRef<number>(0)
  const prevRef = useRef<{ x: number; y: number } | null>(null)
  const isDrawingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function onMove(e: MouseEvent | TouchEvent) {
      const x = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX
      const y = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY

      if (prevRef.current) {
        const dx = x - prevRef.current.x
        const dy = y - prevRef.current.y
        const dist = Math.hypot(dx, dy)

        // Interpola pontos ao longo do traço para linha contínua
        const steps = Math.max(1, Math.floor(dist / 2))
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          segmentsRef.current.push({
            x: prevRef.current.x + dx * t,
            y: prevRef.current.y + dy * t,
            age: 0,
          })
        }
      }

      prevRef.current = { x, y }
    }

    function onDown() { isDrawingRef.current = true }
    function onUp() {
      isDrawingRef.current = false
      prevRef.current = null
    }

    // Mouse
    window.addEventListener('mousemove', onMove)
    // Touch
    window.addEventListener('touchmove', (e) => onMove(e), { passive: true })
    window.addEventListener('touchstart', onDown)
    window.addEventListener('touchend', onUp)

    const MAX_AGE = 55
    const MAX_POINTS = 600

    function draw() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)

      const segs = segmentsRef.current

      // Envelhece e remove
      for (let i = segs.length - 1; i >= 0; i--) {
        segs[i].age++
        if (segs[i].age > MAX_AGE) segs.splice(i, 1)
      }
      if (segs.length > MAX_POINTS) segs.splice(0, segs.length - MAX_POINTS)

      if (segs.length < 2) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Traço principal — lápis grafite
      for (let i = 1; i < segs.length; i++) {
        const p0 = segs[i - 1]
        const p1 = segs[i]

        const gap = Math.hypot(p1.x - p0.x, p1.y - p0.y)
        if (gap > 20) continue // corte de segmento (quando mouse salta)

        const life = 1 - p1.age / MAX_AGE

        // Linha core — fina e branca
        ctx.globalAlpha = life * 0.55
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p1.x, p1.y)
        ctx.stroke()

        // Textura grafite — linha levemente offside para simular fibras do lápis
        ctx.globalAlpha = life * 0.12
        ctx.strokeStyle = '#cccccc'
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.moveTo(p0.x + 0.6, p0.y + 0.3)
        ctx.lineTo(p1.x + 0.6, p1.y + 0.3)
        ctx.stroke()

        // Borda difusa — simula pressão do lápis
        ctx.globalAlpha = life * 0.06
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3.5
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p1.x, p1.y)
        ctx.stroke()
      }

      // Ponta do cursor — ponto nítido
      if (segs.length > 0) {
        const tip = segs[segs.length - 1]
        ctx.globalAlpha = 0.9
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(tip.x, tip.y, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove as any)
      window.removeEventListener('touchstart', onDown)
      window.removeEventListener('touchend', onUp)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  )
}
