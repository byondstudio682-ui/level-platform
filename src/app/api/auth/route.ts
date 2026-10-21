/**
 * /api/auth — Login/Logout com Supabase Auth
 * POST: login com email+senha → retorna JWT, seta cookies
 * DELETE: logout → apaga cookies
 * GET: retorna usuário da sessão atual
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminClient, getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
  }

  // Autenticar com Supabase Auth (senha hasheada no Supabase, nunca em texto puro)
  const { data, error } = await adminClient.auth.signInWithPassword({ email: email.trim(), password })

  if (error || !data.session) {
    return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
  }

  const u = data.user
  const meta = u.user_metadata || {}
  const user = {
    id: u.id,
    email: u.email,
    name: meta.name || u.email!.split('@')[0],
    role: meta.role || 'member',
    slug: meta.slug || 'user',
  }

  const res = NextResponse.json({ ok: true, user })

  // Cookie com JWT do Supabase (httpOnly para segurança)
  const cookieOpts = { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' as const }
  res.cookies.set('sb_access_token', data.session.access_token, cookieOpts)
  res.cookies.set('sb_refresh_token', data.session.refresh_token, { ...cookieOpts })

  // Cookie não-httpOnly com info básica do usuário (para o client ler o nome)
  res.cookies.set('byond_user', Buffer.from(JSON.stringify(user)).toString('base64'), {
    httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax',
  })
  // Compatibilidade com middleware
  res.cookies.set('byond_session', 'authenticated', {
    httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax',
  })

  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('sb_access_token')
  res.cookies.delete('sb_refresh_token')
  res.cookies.delete('byond_user')
  res.cookies.delete('byond_session')
  return res
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  return NextResponse.json({ user })
}
