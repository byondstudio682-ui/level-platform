import { NextRequest, NextResponse } from 'next/server'
import { adminClient, getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { data } = await adminClient
      .from('user_integrations')
      .select('key, value')
      .eq('user_id', user.id)

    const integrations: Record<string, string> = {}
    data?.forEach(row => { integrations[row.key] = row.value })
    return NextResponse.json({ integrations })
  } catch {
    return NextResponse.json({ integrations: {} })
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { key, value } = await req.json()
  if (!key) return NextResponse.json({ error: 'key obrigatório' }, { status: 400 })

  // Nunca salvar keys de sistema de outros usuários
  if (key.startsWith('level_') && !['level_clients','level_events','level_task_list','level_tempo_catalog','level_processos_map'].includes(key)) {
    return NextResponse.json({ error: 'key inválida' }, { status: 400 })
  }

  try {
    const { error } = await adminClient
      .from('user_integrations')
      .upsert({ user_id: user.id, key, value }, { onConflict: 'user_id,key' })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}
