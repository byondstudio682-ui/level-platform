/**
 * /api/tasks — Kanban por usuário autenticado
 * Dados isolados por UUID do Supabase Auth
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminClient, getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { data } = await adminClient
      .from('user_kanban')
      .select('columns')
      .eq('user_id', user.id)
      .single()

    if (!data) return NextResponse.json({ columns: null })
    return NextResponse.json({ columns: data.columns })
  } catch {
    return NextResponse.json({ columns: null })
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { columns } = await req.json()

  try {
    const { error } = await adminClient
      .from('user_kanban')
      .upsert(
        { user_id: user.id, columns, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}
