/**
 * /api/register — Cadastro de nova conta
 * - Cria conta via Admin API (email confirmado automaticamente — sem depender de SMTP)
 * - Role padrão: "member" — nunca admin via self-signup
 * - Verifica email duplicado antes de criar
 * - Após criar, faz login automático e retorna cookies de sessão
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json()

  // Validações básicas
  if (!name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
  if (!password) return NextResponse.json({ error: 'Senha é obrigatória' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'Senha deve ter ao menos 6 caracteres' }, { status: 400 })

  const emailClean = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailClean)) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })

  // Verificar se email já existe
  const { data: existing } = await adminClient.auth.admin.listUsers()
  const duplicate = existing?.users?.find(u => u.email?.toLowerCase() === emailClean)
  if (duplicate) {
    return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 })
  }

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  // Criar conta via Admin API — email_confirm:true (sem necessidade de SMTP)
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email: emailClean,
    password,
    email_confirm: true,
    user_metadata: {
      name: name.trim(),
      role: 'member',   // nunca admin via self-signup
      slug,
    },
  })

  if (createErr || !created.user) {
    const msg = createErr?.message || 'Erro ao criar conta'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Login automático após cadastro
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const loginRes = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SB_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailClean, password }),
  })

  const loginData = await loginRes.json()

  if (!loginData.access_token) {
    // Conta criada mas login falhou — usuário pode fazer login manualmente
    return NextResponse.json({ ok: true, autoLogin: false })
  }

  const user = {
    id: created.user.id,
    email: emailClean,
    name: name.trim(),
    role: 'member' as const,
    slug,
    avatar_url: '',
  }

  const res = NextResponse.json({ ok: true, autoLogin: true, user })

  const cookieOpts = { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' as const }
  res.cookies.set('sb_access_token',  loginData.access_token,  cookieOpts)
  res.cookies.set('sb_refresh_token', loginData.refresh_token, cookieOpts)
  res.cookies.set('byond_session', 'authenticated', cookieOpts)
  res.cookies.set('byond_user', Buffer.from(JSON.stringify(user)).toString('base64'), {
    httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax',
  })

  return res
}
