'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const service = params.get('service')
    const code = params.get('code')
    const error = params.get('error')
    const hash = window.location.hash

    // Trello retorna token no fragment #token=XXX
    if (!service && hash.includes('token=')) {
      const token = new URLSearchParams(hash.slice(1)).get('token')
      if (token) {
        fetch('/api/oauth/trello/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }).then(r => {
          if (r.ok) { setStatus('ok'); setMsg('Trello conectado com sucesso!') }
          else { setStatus('error'); setMsg('Erro ao salvar token do Trello') }
        })
        return
      }
    }

    if (error) { setStatus('error'); setMsg(`Autorização negada: ${error}`); return }

    if (service && code) {
      fetch(`/api/oauth/${service}/callback?code=${code}`)
        .then(r => r.json())
        .then(d => {
          if (d.ok) { setStatus('ok'); setMsg(d.message || 'Conta conectada!') }
          else { setStatus('error'); setMsg(d.error || 'Erro ao conectar') }
        })
        .catch(() => { setStatus('error'); setMsg('Erro de conexão') })
      return
    }

    setStatus('error')
    setMsg('Parâmetros inválidos')
  }, [params])

  useEffect(() => {
    if (status === 'ok') {
      const t = setTimeout(() => router.push('/conectar'), 2000)
      return () => clearTimeout(t)
    }
  }, [status, router])

  return (
    <div className="w-screen h-screen bg-white flex flex-col items-center justify-center gap-4">
      {status === 'loading' && (
        <>
          <div className="w-8 h-8 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
          <p className="text-black/50 text-sm">Conectando...</p>
        </>
      )}
      {status === 'ok' && (
        <>
          <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-2xl">✓</div>
          <p className="text-black/80 text-sm font-medium">{msg}</p>
          <p className="text-black/30 text-xs">Redirecionando...</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl">✕</div>
          <p className="text-black/80 text-sm font-medium">{msg}</p>
          <button onClick={() => router.push('/conectar')} className="text-black/40 text-xs underline">Voltar</button>
        </>
      )}
    </div>
  )
}

export default function OAuthCallback() {
  return <Suspense fallback={<div className="w-screen h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" /></div>}>
    <CallbackInner />
  </Suspense>
}
