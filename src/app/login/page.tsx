'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Mode = 'login' | 'signup'

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/inicio'

  const [mode,     setMode]     = useState<Mode>('login')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [entered,  setEntered]  = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100)
    return () => clearTimeout(t)
  }, [])

  function switchMode(m: Mode) {
    if (m === mode || animating) return
    setAnimating(true)
    setError(''); setSuccess('')
    setTimeout(() => {
      setMode(m); setName(''); setEmail(''); setPassword(''); setConfirm('')
      setAnimating(false)
    }, 180)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (res.ok) {
        router.push(nextPath)
      } else {
        const d = await res.json()
        setError(d.error || 'Email ou senha incorretos')
        setLoading(false)
      }
    } catch {
      setError('Erro de conexão')
      setLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')

    if (!name.trim())        { setError('Nome é obrigatório'); return }
    if (!email.trim())       { setError('Email é obrigatório'); return }
    if (!password)           { setError('Senha é obrigatória'); return }
    if (password.length < 6) { setError('Senha deve ter ao menos 6 caracteres'); return }
    if (password !== confirm) { setError('As senhas não coincidem'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || 'Erro ao criar conta')
        setLoading(false)
        return
      }
      if (d.autoLogin) {
        router.push('/inicio')
      } else {
        setSuccess('Conta criada! Faça login com suas credenciais.')
        switchMode('login')
        setLoading(false)
      }
    } catch {
      setError('Erro de conexão')
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div
      className="w-screen flex flex-col items-center justify-center bg-white"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="relative z-10 flex flex-col items-center gap-7 w-full max-w-xs px-8"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 600ms ease, transform 600ms ease',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-black font-bold tracking-[0.3em] text-sm uppercase">LEVEL</p>
          <p className="text-black/30 text-xs">{isLogin ? 'Acesse sua conta' : 'Crie sua conta'}</p>
        </div>

        {/* Tabs */}
        <div className="flex w-full rounded-xl bg-black/5 p-0.5 gap-0.5">
          {(['login', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className="flex-1 py-2 rounded-[10px] text-xs font-medium transition-all"
              style={{
                background: mode === m ? '#000' : 'transparent',
                color: mode === m ? '#fff' : 'rgba(0,0,0,0.35)',
              }}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          onSubmit={isLogin ? handleLogin : handleSignup}
          className="w-full flex flex-col gap-3"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(6px)' : 'translateY(0)',
            transition: 'opacity 180ms ease, transform 180ms ease',
          }}
        >
          {!isLogin && (
            <input
              type="text"
              placeholder="seu nome"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              autoFocus={!isLogin}
              className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-black text-sm placeholder-black/20 outline-none focus:border-black/30 transition-colors"
            />
          )}
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus={isLogin}
            autoComplete="email"
            className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-black text-sm placeholder-black/20 outline-none focus:border-black/30 transition-colors"
          />
          <input
            type="password"
            placeholder="senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-black text-sm placeholder-black/20 outline-none focus:border-black/30 transition-colors tracking-widest placeholder:tracking-normal"
          />
          {!isLogin && (
            <input
              type="password"
              placeholder="confirmar senha"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-black text-sm placeholder-black/20 outline-none focus:border-black/30 transition-colors tracking-widest placeholder:tracking-normal"
            />
          )}

          {error && (
            <p className="text-red-500 text-xs text-center font-medium">{error}</p>
          )}
          {success && (
            <p className="text-green-500 text-xs text-center font-medium">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-black/90 rounded-xl py-3 text-white text-sm font-medium transition-all disabled:opacity-30"
          >
            {loading ? '...' : isLogin ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {!isLogin && (
          <p className="text-black/25 text-xs text-center leading-relaxed">
            Novas contas têm acesso de membro.<br />
            Administradores podem alterar permissões.
          </p>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}
