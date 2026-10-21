'use client'
import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(true) // sempre ON visualmente

  useEffect(() => {
    const audio = new Audio('/ambient.mp3')
    audio.loop = true
    audio.volume = 0.2
    audioRef.current = audio
    // Tenta autoplay; se bloqueado, aguarda primeiro clique do usuário
    audio.play().catch(() => {
      const unlock = () => {
        audio.play().catch(() => {})
        window.removeEventListener('click', unlock)
        window.removeEventListener('touchstart', unlock)
      }
      window.addEventListener('click', unlock)
      window.addEventListener('touchstart', unlock)
    })
    return () => { audio.pause(); audio.src = '' }
  }, [])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().catch(() => {})
      setPlaying(true)
    }
  }

  return (
    <button
      onClick={toggle}
      title={playing ? 'Pausar música' : 'Tocar música'}
      className="fixed bottom-5 left-5 z-50 flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300"
      style={{
        background: playing ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.08)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {playing
        ? <Volume2 className="w-3.5 h-3.5 text-black/50" />
        : <VolumeX  className="w-3.5 h-3.5 text-black/25" />
      }
      <span className="text-[10px] text-black/30 tracking-wider font-medium">
        {playing ? 'ON' : 'OFF'}
      </span>
      {playing && (
        <span className="flex items-end gap-[2px] h-3">
          {[0,1,2].map(i => (
            <span key={i} className="w-[2px] bg-black/30 rounded-full"
              style={{ animation: `levelbar 0.8s ease-in-out ${i*0.15}s infinite alternate`, height: '4px' }} />
          ))}
        </span>
      )}
      <style>{`@keyframes levelbar{from{height:3px}to{height:10px}}`}</style>
    </button>
  )
}
