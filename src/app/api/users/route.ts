/**
 * /api/users — Gerenciamento de usuários (admin only)
 * GET: lista todos os usuários
 * POST: cria novo usuário
 * PATCH: atualiza usuário (nome, role, senha)
 * DELETE: remove usuário
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminClient, getSessionUser } from '@/lib/auth'

function requireAdmin(user: Awaited<ReturnType<typeof getSessionUser>>) {
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Acesso negado — apenas administradores' }, { status: 403 })
  return null
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  const denied = requireAdmin(user)
  if (denied) return denied

  const { data, error } = await adminClient.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = (data?.users || [])
    .filter(u => u.user_metadata?.name || u.email)
    .map(u => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || u.email?.split('@')[0],
      role: u.user_metadata?.role || 'member',
      slug: u.user_metadata?.slug || '',
      avatar_url: u.user_metadata?.avatar_url || '',
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
    }))

  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  const denied = requireAdmin(user)
  if (denied) return denied

  const { email, password, name, role = 'member' } = await req.json()
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'email, password e name são obrigatórios' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Senha deve ter ao menos 8 caracteres' }, { status: 400 })
  }

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role, slug },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, user: { id: data.user?.id, email, name, role, slug } })
}

export async function PATCH(req: NextRequest) {
  const currentUser = await getSessionUser(req)
  const { id, name, role, password } = await req.json()

  if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Admin pode editar qualquer usuário; member só pode editar a si mesmo (e não mudar role)
  if (currentUser.role !== 'admin' && currentUser.id !== id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }
  if (currentUser.role !== 'admin' && role && role !== currentUser.role) {
    return NextResponse.json({ error: 'Não é possível alterar seu próprio papel' }, { status: 403 })
  }

  const updates: any = {}
  if (name) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    updates.user_metadata = { name, slug, role: role || currentUser.role }
  }
  if (password) {
    if (password.length < 8) return NextResponse.json({ error: 'Senha deve ter ao menos 8 caracteres' }, { status: 400 })
    updates.password = password
  }

  const { error } = await adminClient.auth.admin.updateUserById(id, updates)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  const denied = requireAdmin(user)
  if (denied) return denied

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  if (id === user!.id) return NextResponse.json({ error: 'Não é possível excluir sua própria conta' }, { status: 400 })

  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
