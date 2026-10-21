/**
 * /api/data — CRUD centralizado para clientes, eventos e vínculos
 * Armazena em user_integrations como JSON (por user UUID do Supabase Auth)
 * Dados são estritamente isolados por usuário no backend — nunca compartilhados sem autorização explícita
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminClient, getSessionUser } from '@/lib/auth'

async function load(userId: string, key: string) {
  const { data } = await adminClient
    .from('user_integrations')
    .select('value')
    .eq('user_id', userId)
    .eq('key', key)
    .single()
  if (!data?.value) return []
  try { return JSON.parse(data.value) } catch { return [] }
}

async function save(userId: string, key: string, value: any) {
  await adminClient.from('user_integrations').upsert(
    { user_id: userId, key, value: JSON.stringify(value) },
    { onConflict: 'user_id,key' }
  )
}

const KEY_MAP: Record<string, string> = {
  'clients':       'level_clients',
  'events':        'level_events',
  'tasks':         'level_task_list',
  'tempo':         'level_tempo_catalog',
  'processos_map': 'level_processos_map',
  'demands':       'level_demands',
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type') || 'all'

  if (type !== 'all') {
    const key = KEY_MAP[type]
    if (!key) return NextResponse.json({ error: 'type inválido' }, { status: 400 })
    return NextResponse.json({ data: await load(user.id, key) })
  }

  // all — retorna tudo do usuário
  const [clients, events, tasks] = await Promise.all([
    load(user.id, 'level_clients'),
    load(user.id, 'level_events'),
    load(user.id, 'level_task_list'),
  ])
  return NextResponse.json({ clients, events, tasks })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { type, action, record } = body

  const key = KEY_MAP[type]
  if (!key) return NextResponse.json({ error: 'type inválido' }, { status: 400 })

  // replace — substitui a lista inteira (tempo, processos_map)
  if (action === 'replace') {
    await save(user.id, key, record)
    return NextResponse.json({ ok: true })
  }

  const list: any[] = await load(user.id, key)

  if (action === 'create') {
    const item = {
      ...record,
      id: record.id || `${type}-${Date.now()}`,
      ownerId: user.id,
      ownerName: user.name,
      createdAt: new Date().toISOString(),
    }
    list.push(item)
    await save(user.id, key, list)
    return NextResponse.json({ ok: true, item })
  }

  if (action === 'update') {
    const idx = list.findIndex((x: any) => x.id === record.id)
    if (idx === -1) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    // Verificar permissão: owner ou admin
    const existing = list[idx]
    if (existing.ownerId && existing.ownerId !== user.id && user.role !== 'admin') {
      // Verificar se está em sharedWith
      const sharedWith: string[] = existing.sharedWith || []
      if (!sharedWith.includes(user.id)) {
        return NextResponse.json({ error: 'Sem permissão para editar este registro' }, { status: 403 })
      }
    }

    list[idx] = { ...existing, ...record, updatedAt: new Date().toISOString() }
    await save(user.id, key, list)
    return NextResponse.json({ ok: true, item: list[idx] })
  }

  if (action === 'delete') {
    const item = list.find((x: any) => x.id === record.id)
    if (!item) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    // Apenas owner ou admin pode deletar
    if (item.ownerId && item.ownerId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão para excluir este registro' }, { status: 403 })
    }

    const filtered = list.filter((x: any) => x.id !== record.id)
    await save(user.id, key, filtered)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'action inválida' }, { status: 400 })
}
