import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SERVICE_KEYS: Record<string, string[]> = {
  trello: ['trello_token', 'trello_key', 'trello_member_name'],
  notion: ['notion_token', 'notion_workspace', 'notion_database_id', 'notion_page_id'],
  google: ['google_refresh_token', 'google_client_id', 'google_client_secret', 'google_calendar_id', 'google_account_email'],
}

function getUser(req: NextRequest) {
  const cookie = req.cookies.get('byond_user')
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, 'base64').toString('utf8')) }
  catch { return null }
}

export async function POST(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { service } = await req.json()
  const keys = SERVICE_KEYS[service]
  if (!keys) return NextResponse.json({ error: 'Serviço inválido' }, { status: 400 })

  await supabase.from('user_integrations')
    .delete()
    .eq('user_id', user.id)
    .in('key', keys)

  return NextResponse.json({ ok: true })
}
