/**
 * /api/profile — Edição de perfil do usuário
 * PATCH: atualiza nome e/ou avatar_url
 * POST (multipart): faz upload da foto e atualiza avatar_url
 * DELETE: remove a foto de perfil
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminClient, getSessionUser } from '@/lib/auth'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** PATCH — atualiza nome e/ou avatar_url */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { name, avatar_url, targetUserId } = body

  // Apenas admin pode editar outro usuário
  const targetId = targetUserId && user.role === 'admin' ? targetUserId : user.id
  if (targetUserId && targetUserId !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Buscar metadata atual
  const { data: existing } = await adminClient.auth.admin.getUserById(targetId)
  const currentMeta = existing?.user?.user_metadata || {}

  const updates: Record<string, any> = {}
  const newMeta = { ...currentMeta }
  if (name !== undefined) newMeta.name = name.trim()
  if (avatar_url !== undefined) newMeta.avatar_url = avatar_url
  updates.user_metadata = newMeta

  const { error } = await adminClient.auth.admin.updateUserById(targetId, updates)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Atualizar cookie byond_user para refletir imediatamente (apenas se for o próprio usuário)
  // Buscar dados atualizados do target (para retornar)
  const targetMeta = targetId === user.id ? newMeta : (
    (await adminClient.auth.admin.getUserById(targetId))?.data?.user?.user_metadata || newMeta
  )

  const updatedUser = {
    id: user.id,
    email: user.email,
    name: targetId === user.id ? (newMeta.name || user.name) : user.name,
    role: user.role,
    slug: user.slug,
    avatar_url: targetId === user.id ? (newMeta.avatar_url || '') : (user as any).avatar_url || '',
  }

  const res = NextResponse.json({ ok: true, user: updatedUser })
  // Só atualiza cookie se for o próprio usuário
  if (targetId === user.id) {
    res.cookies.set('byond_user', Buffer.from(JSON.stringify(updatedUser)).toString('base64'), {
      httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax',
    })
  }
  return res
}

/** POST — upload de foto via multipart/form-data */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('avatar') as File | null
  const targetUserId = formData.get('targetUserId') as string | null

  const targetId = targetUserId && user.role === 'admin' ? targetUserId : user.id

  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Imagem deve ter no máximo 2MB' }, { status: 400 })

  const ext = file.type.split('/')[1] || 'jpg'
  const path = `${targetId}.${ext}`
  const bytes = await file.arrayBuffer()

  // Upload para Supabase Storage
  const uploadRes = await fetch(`${SB_URL}/storage/v1/object/avatars/${path}`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'true',
    },
    body: bytes,
  })

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    return NextResponse.json({ error: `Upload falhou: ${err}` }, { status: 500 })
  }

  // URL pública do avatar
  const avatar_url = `${SB_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`

  // Atualizar user_metadata com nova URL
  const { data: existing } = await adminClient.auth.admin.getUserById(targetId)
  const currentMeta = existing?.user?.user_metadata || {}
  await adminClient.auth.admin.updateUserById(targetId, {
    user_metadata: { ...currentMeta, avatar_url },
  })

  const updatedUser = {
    id: user.id,
    email: user.email,
    name: targetId === user.id ? (currentMeta.name || user.name) : user.name,
    role: user.role,
    slug: user.slug,
    avatar_url: targetId === user.id ? avatar_url : ((user as any).avatar_url || ''),
  }

  const res = NextResponse.json({ ok: true, avatar_url, user: updatedUser })
  if (targetId === user.id) {
    res.cookies.set('byond_user', Buffer.from(JSON.stringify(updatedUser)).toString('base64'), {
      httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax',
    })
  }
  return res
}

/** DELETE — remove foto de perfil */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const targetId = body.targetUserId && user.role === 'admin' ? body.targetUserId : user.id

  // Remover do storage (tenta png e jpg)
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    await fetch(`${SB_URL}/storage/v1/object/avatars/${targetId}.${ext}`, {
      method: 'DELETE',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    })
  }

  // Limpar avatar_url do metadata
  const { data: existing } = await adminClient.auth.admin.getUserById(targetId)
  const currentMeta = existing?.user?.user_metadata || {}
  await adminClient.auth.admin.updateUserById(targetId, {
    user_metadata: { ...currentMeta, avatar_url: '' },
  })

  const updatedUser = { ...user, avatar_url: '' }
  const res = NextResponse.json({ ok: true })
  if (targetId === user.id) {
    res.cookies.set('byond_user', Buffer.from(JSON.stringify(updatedUser)).toString('base64'), {
      httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax',
    })
  }
  return res
}
