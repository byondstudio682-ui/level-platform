'use client'
import { useEffect } from 'react'

const INPUT_TAGS = ['INPUT', 'TEXTAREA']

function playKey(isDelete: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3)
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const g = ctx.createGain()
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = isDelete ? 900 : 1800
    f.Q.value = 0.8
    src.connect(f); f.connect(g); g.connect(ctx.destination)
    g.gain.setValueAtTime(isDelete ? 0.30 : 0.22, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
    src.start(); src.stop(ctx.currentTime + 0.05)
    src.onended = () => ctx.close()
  } catch {}
}

export function KeyboardSound() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (!INPUT_TAGS.includes(tag ?? '')) return
      // Ignora teclas de controle (tab, shift, ctrl, etc.)
      if (e.key.length > 1 && !['Backspace', 'Delete', 'Enter'].includes(e.key)) return
      const isDel = e.key === 'Backspace' || e.key === 'Delete'
      playKey(isDel)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return null
}
