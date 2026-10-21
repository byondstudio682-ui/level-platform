import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE = 'https://api.trello.com/1'

function getUserFromCookie(req: NextRequest) {
  const cookie = req.cookies.get('byond_user')
  if (!cookie) return null
  try {
    return JSON.parse(Buffer.from(cookie.value, 'base64').toString('utf8'))
  } catch { return null }
}

async function getUserTrelloKeys(userId: string) {
  try {
    const { data } = await supabase
      .from('user_integrations')
      .select('key, value')
      .eq('user_id', userId)
      .in('key', ['trello_key', 'trello_token'])

    const keys: Record<string, string> = {}
    data?.forEach(row => { keys[row.key] = row.value })
    return { key: keys['trello_key'], token: keys['trello_token'] }
  } catch {
    return { key: null, token: null }
  }
}

export async function GET(req: NextRequest) {
  const user = getUserFromCookie(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Busca chaves do usuário
  const { key, token } = await getUserTrelloKeys(user.id)

  // Se o usuário não tem chaves configuradas, retorna vazio
  if (!key || !token) {
    const { searchParams } = new URL(req.url)
    const boardId = searchParams.get('boardId')
    if (!boardId) return NextResponse.json({ boards: [], error: 'Trello não conectado' })
    return NextResponse.json({ lists: [], cards: [], error: 'Trello não conectado' })
  }

  try {
    const { searchParams } = new URL(req.url)
    const boardId = searchParams.get('boardId')

    if (!boardId) {
      // Busca todos os boards do usuário
      const res = await fetch(`${BASE}/members/me/boards?key=${key}&token=${token}&fields=name,id&filter=open`)
      if (!res.ok) return NextResponse.json({ boards: [], error: 'Credenciais inválidas' })
      const boards = await res.json()
      return NextResponse.json({ boards: boards.map((b: any) => ({ id: b.id, name: b.name })) })
    }

    // Busca listas e cards do board
    const [listsRes, cardsRes] = await Promise.all([
      fetch(`${BASE}/boards/${boardId}/lists?key=${key}&token=${token}&fields=name,id`),
      fetch(`${BASE}/boards/${boardId}/cards?key=${key}&token=${token}&fields=name,idList,due,labels,desc,url&filter=open`),
    ])

    if (!listsRes.ok || !cardsRes.ok) {
      return NextResponse.json({ error: 'Erro ao buscar do Trello' }, { status: 500 })
    }

    const lists = await listsRes.json()
    const cards = await cardsRes.json()
    return NextResponse.json({ lists, cards })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
