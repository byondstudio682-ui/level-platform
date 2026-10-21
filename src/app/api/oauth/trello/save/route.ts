import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getUser(req: NextRequest) {
  const cookie = req.cookies.get('byond_user')
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, 'base64').toString('utf8')) }
  catch { return null }
}

export async function POST(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'token obrigatório' }, { status: 400 })

  // Valida o token consultando a API do Trello
  const apiKey = process.env.TRELLO_API_KEY!
  const res = await fetch(`https://api.trello.com/1/members/me?key=${apiKey}&token=${token}&fields=fullName,username`)
  if (!res.ok) return NextResponse.json({ error: 'Token Trello inválido' }, { status: 400 })
  const member = await res.json()

  // Salva token + nome do membro
  await supabase.from('user_integrations').upsert([
    { user_id: user.id, key: 'trello_token', value: token },
    { user_id: user.id, key: 'trello_key', value: apiKey },
    { user_id: user.id, key: 'trello_member_name', value: member.fullName || member.username },
  ], { onConflict: 'user_id,key' })

  return NextResponse.json({ ok: true, name: member.fullName || member.username })
}
