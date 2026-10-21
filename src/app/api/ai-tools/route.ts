import { NextRequest, NextResponse } from 'next/server'
import { adminClient as supabase, getSessionUser } from '@/lib/auth'

async function getKeys(userId: string) {
  const { data } = await supabase
    .from('user_integrations')
    .select('key, value')
    .eq('user_id', userId)
  const k: Record<string, string> = {}
  data?.forEach(r => { k[r.key] = r.value })
  return k
}

// ─── TRELLO ──────────────────────────────────────────────────────────
const TRELLO = 'https://api.trello.com/1'

async function trelloGetBoards(key: string, token: string) {
  const r = await fetch(`${TRELLO}/members/me/boards?key=${key}&token=${token}&fields=name,id&filter=open`)
  if (!r.ok) throw new Error('Credenciais Trello inválidas')
  return r.json()
}

async function trelloGetLists(key: string, token: string, boardId: string) {
  const r = await fetch(`${TRELLO}/boards/${boardId}/lists?key=${key}&token=${token}&fields=name,id`)
  if (!r.ok) throw new Error('Board não encontrado')
  return r.json()
}

async function trelloCreateCard(key: string, token: string, listId: string, name: string, desc = '') {
  const r = await fetch(`${TRELLO}/cards?key=${key}&token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idList: listId, name, desc }),
  })
  if (!r.ok) throw new Error('Erro ao criar card no Trello')
  return r.json()
}

async function trelloGetCards(key: string, token: string, boardId: string) {
  const r = await fetch(`${TRELLO}/boards/${boardId}/cards?key=${key}&token=${token}&fields=name,idList,due,desc,url&filter=open`)
  if (!r.ok) throw new Error('Erro ao buscar cards')
  return r.json()
}

// ─── NOTION ──────────────────────────────────────────────────────────
const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VER = '2022-06-28'

async function notionSearch(token: string, query: string) {
  const r = await fetch(`${NOTION_API}/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, page_size: 10 }),
  })
  if (!r.ok) throw new Error('Erro ao buscar no Notion')
  return r.json()
}

async function notionCreatePage(token: string, parentId: string, title: string, content = '') {
  const r = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parent: { database_id: parentId },
      properties: {
        Name: { title: [{ text: { content: title } }] },
      },
      children: content ? [{
        object: 'block', type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content } }] },
      }] : [],
    }),
  })
  if (!r.ok) {
    const err = await r.json()
    throw new Error(err?.message || 'Erro ao criar página no Notion')
  }
  return r.json()
}

async function notionCreateNote(token: string, parentPageId: string, title: string, content = '') {
  const r = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: { title: { title: [{ text: { content: title } }] } },
      children: content ? [{
        object: 'block', type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content } }] },
      }] : [],
    }),
  })
  if (!r.ok) {
    const err = await r.json()
    throw new Error(err?.message || 'Erro ao criar nota no Notion')
  }
  return r.json()
}

// ─── GOOGLE CALENDAR ─────────────────────────────────────────────────
async function gcalRefreshAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error_description || 'Erro ao renovar token Google')
  return data.access_token as string
}

async function gcalListEvents(accessToken: string, calendarId: string, maxResults = 10) {
  const now = new Date().toISOString()
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${now}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!r.ok) throw new Error('Erro ao buscar eventos do Google Agenda')
  return r.json()
}

async function gcalCreateEvent(accessToken: string, calendarId: string, summary: string, startDateTime: string, endDateTime: string, description = '') {
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary, description, start: { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' }, end: { dateTime: endDateTime, timeZone: 'America/Sao_Paulo' } }),
  })
  if (!r.ok) throw new Error('Erro ao criar evento no Google Agenda')
  return r.json()
}

// ─── HANDLER ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { tool, params } = await req.json()
  const keys = await getKeys(user.id)

  try {
    // ── TRELLO ──
    if (tool === 'trello_get_boards') {
      if (!keys.trello_key || !keys.trello_token) return NextResponse.json({ error: 'Trello não conectado. Configure em Conectar.' })
      const boards = await trelloGetBoards(keys.trello_key, keys.trello_token)
      return NextResponse.json({ result: boards })
    }

    if (tool === 'trello_get_lists') {
      if (!keys.trello_key || !keys.trello_token) return NextResponse.json({ error: 'Trello não conectado.' })
      const lists = await trelloGetLists(keys.trello_key, keys.trello_token, params.board_id)
      return NextResponse.json({ result: lists })
    }

    if (tool === 'trello_get_cards') {
      if (!keys.trello_key || !keys.trello_token) return NextResponse.json({ error: 'Trello não conectado.' })
      const cards = await trelloGetCards(keys.trello_key, keys.trello_token, params.board_id)
      return NextResponse.json({ result: cards })
    }

    if (tool === 'trello_create_card') {
      if (!keys.trello_key || !keys.trello_token) return NextResponse.json({ error: 'Trello não conectado.' })
      const card = await trelloCreateCard(keys.trello_key, keys.trello_token, params.list_id, params.name, params.desc)
      return NextResponse.json({ result: card })
    }

    // ── NOTION ──
    if (tool === 'notion_search') {
      if (!keys.notion_token) return NextResponse.json({ error: 'Notion não conectado. Configure em Conectar.' })
      const res = await notionSearch(keys.notion_token, params.query)
      return NextResponse.json({ result: res })
    }

    if (tool === 'notion_create_page') {
      if (!keys.notion_token) return NextResponse.json({ error: 'Notion não conectado.' })
      const parentId = params.database_id || keys.notion_database_id
      if (!parentId) return NextResponse.json({ error: 'ID do database Notion não configurado. Adicione em Conectar.' })
      const page = await notionCreatePage(keys.notion_token, parentId, params.title, params.content)
      return NextResponse.json({ result: page })
    }

    if (tool === 'notion_create_note') {
      if (!keys.notion_token) return NextResponse.json({ error: 'Notion não conectado.' })
      const parentId = params.page_id || keys.notion_page_id
      if (!parentId) return NextResponse.json({ error: 'ID da página Notion não configurado.' })
      const page = await notionCreateNote(keys.notion_token, parentId, params.title, params.content)
      return NextResponse.json({ result: page })
    }

    // ── GOOGLE CALENDAR ──
    if (tool === 'gcal_list_events' || tool === 'gcal_create_event') {
      if (!keys.google_client_id || !keys.google_client_secret || !keys.google_refresh_token) {
        return NextResponse.json({ error: 'Google Agenda não conectado. Configure em Conectar.' })
      }
      const calId = keys.google_calendar_id || 'primary'
      const accessToken = await gcalRefreshAccessToken(keys.google_client_id, keys.google_client_secret, keys.google_refresh_token)

      if (tool === 'gcal_list_events') {
        const events = await gcalListEvents(accessToken, calId, params.max_results || 10)
        return NextResponse.json({ result: events })
      }

      if (tool === 'gcal_create_event') {
        const event = await gcalCreateEvent(accessToken, calId, params.summary, params.start_datetime, params.end_datetime, params.description)
        return NextResponse.json({ result: event })
      }
    }

    // ── LEVEL INTERNO ──
    if (tool === 'level_create_event') {
      // Cria evento diretamente no banco do Level (calendário)
      const baseUrl = req.nextUrl.origin
      const r = await fetch(`${baseUrl}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({
          type: 'events',
          action: 'create',
          record: {
            title: params.title,
            date: params.date,
            time: params.time,
            endTime: params.end_time,
            clientName: params.client_name,
            description: params.description,
          },
        }),
      })
      const d = await r.json()
      return NextResponse.json({ result: d.item })
    }

    if (tool === 'level_create_client') {
      const baseUrl = req.nextUrl.origin
      const r = await fetch(`${baseUrl}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({ type: 'clients', action: 'create', record: params }),
      })
      const d = await r.json()
      return NextResponse.json({ result: d.item })
    }

    if (tool === 'level_list_clients') {
      const baseUrl = req.nextUrl.origin
      const r = await fetch(`${baseUrl}/api/data?type=clients`, {
        headers: { cookie: req.headers.get('cookie') || '' },
      })
      const d = await r.json()
      return NextResponse.json({ result: d.data })
    }

    if (tool === 'level_list_events') {
      const baseUrl = req.nextUrl.origin
      const r = await fetch(`${baseUrl}/api/data?type=events`, {
        headers: { cookie: req.headers.get('cookie') || '' },
      })
      const d = await r.json()
      return NextResponse.json({ result: d.data })
    }

    // ── KANBAN TASKS ──
    if (tool === 'level_create_task') {
      // Cria um card no kanban do usuário
      const baseUrl = req.nextUrl.origin
      // Buscar colunas atuais
      const r = await fetch(`${baseUrl}/api/tasks`, {
        headers: { cookie: req.headers.get('cookie') || '' },
      })
      const d = await r.json()
      const cols = d.columns || [
        { id: 'backlog', title: 'Backlog', cards: [] },
        { id: 'todo', title: 'A fazer', cards: [] },
        { id: 'in_progress', title: 'Em andamento', cards: [] },
        { id: 'review', title: 'Revisão', cards: [] },
        { id: 'done', title: 'Entregue', cards: [] },
      ]
      const targetStatus = params.status || 'todo'
      const col = cols.find((c: any) => c.id === targetStatus) || cols[1]
      const newCard = {
        id: `card-${Date.now()}`,
        title: params.title,
        client: params.client_name || '',
        category: params.category || 'Geral',
        priority: params.priority || 'normal',
        status: targetStatus,
        deadline: params.deadline || '',
        estimatedMinutes: params.estimated_minutes || 0,
        checklist: [],
        labels: params.labels || [],
      }
      col.cards.push(newCard)
      await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({ columns: cols }),
      })
      // Também salva em task list para sync com outros módulos
      await fetch(`${baseUrl}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({
          type: 'tasks', action: 'create',
          record: {
            id: newCard.id, title: newCard.title, clientName: newCard.client,
            status: newCard.status, priority: newCard.priority, category: newCard.category,
            deadline: newCard.deadline, estimatedMinutes: newCard.estimatedMinutes,
          },
        }),
      })
      return NextResponse.json({ result: newCard })
    }

    if (tool === 'level_list_tasks') {
      const baseUrl = req.nextUrl.origin
      const r = await fetch(`${baseUrl}/api/tasks`, {
        headers: { cookie: req.headers.get('cookie') || '' },
      })
      const d = await r.json()
      const cols = d.columns || []
      let cards: any[] = []
      for (const col of cols) {
        for (const card of (col.cards || [])) {
          cards.push({ ...card, columnStatus: col.id })
        }
      }
      if (params.status) cards = cards.filter((c: any) => c.status === params.status || c.columnStatus === params.status)
      if (params.priority) cards = cards.filter((c: any) => c.priority === params.priority)
      // Marcar atrasadas
      const now = Date.now()
      cards = cards.map((c: any) => ({
        ...c,
        overdue: c.deadline && c.status !== 'done' && new Date(c.deadline).getTime() < now,
        daysLeft: c.deadline ? Math.ceil((new Date(c.deadline).getTime() - now) / 86400000) : null,
      }))
      return NextResponse.json({ result: cards })
    }

    if (tool === 'level_update_task') {
      const baseUrl = req.nextUrl.origin
      const r = await fetch(`${baseUrl}/api/tasks`, {
        headers: { cookie: req.headers.get('cookie') || '' },
      })
      const d = await r.json()
      const cols: any[] = d.columns || []
      let updated = false
      for (const col of cols) {
        const idx = col.cards.findIndex((c: any) => c.id === params.id || c.title?.toLowerCase() === params.title_match?.toLowerCase())
        if (idx !== -1) {
          const card = col.cards[idx]
          if (params.status && params.status !== card.status) {
            // Mover para outra coluna
            col.cards.splice(idx, 1)
            const targetCol = cols.find((c: any) => c.id === params.status) || col
            card.status = params.status
            if (params.deadline !== undefined) card.deadline = params.deadline
            if (params.priority) card.priority = params.priority
            if (params.title) card.title = params.title
            targetCol.cards.push(card)
          } else {
            if (params.deadline !== undefined) col.cards[idx].deadline = params.deadline
            if (params.priority) col.cards[idx].priority = params.priority
            if (params.title) col.cards[idx].title = params.title
          }
          updated = true
          break
        }
      }
      if (!updated) return NextResponse.json({ error: 'Tarefa não encontrada. Pode informar o título exato?' })
      await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({ columns: cols }),
      })
      return NextResponse.json({ result: { ok: true, message: 'Tarefa atualizada.' } })
    }

    if (tool === 'level_schedule_task') {
      // "Passa para a agenda" — cria/atualiza evento na agenda interna do Level
      const baseUrl = req.nextUrl.origin
      // Buscar tarefas para identificar qual foi mencionada
      let taskTitle = params.task_title
      let taskDesc = params.description || ''
      if (params.task_id) {
        const r = await fetch(`${baseUrl}/api/tasks`, { headers: { cookie: req.headers.get('cookie') || '' } })
        const d = await r.json()
        for (const col of (d.columns || [])) {
          const card = col.cards?.find((c: any) => c.id === params.task_id)
          if (card) { taskTitle = taskTitle || card.title; taskDesc = taskDesc || card.category; break }
        }
      }
      if (!taskTitle) return NextResponse.json({ error: 'Qual tarefa você quer agendar? Informe o nome.' })
      if (!params.date) return NextResponse.json({ error: `Para agendar "${taskTitle}", qual é a data?` })

      // Verificar se já existe evento com esse título+data para evitar duplicata
      const evR = await fetch(`${baseUrl}/api/data?type=events`, { headers: { cookie: req.headers.get('cookie') || '' } })
      const evD = await evR.json()
      const existing = (evD.data || []).find((e: any) =>
        e.title?.toLowerCase().includes(taskTitle.toLowerCase()) && e.date === params.date
      )
      if (existing) {
        // Atualizar existente
        await fetch(`${baseUrl}/api/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
          body: JSON.stringify({
            type: 'events', action: 'update',
            record: { id: existing.id, time: params.time, endTime: params.end_time, description: taskDesc },
          }),
        })
        return NextResponse.json({ result: { updated: true, event: { ...existing, time: params.time } } })
      }
      // Criar novo
      const cr = await fetch(`${baseUrl}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({
          type: 'events', action: 'create',
          record: {
            title: taskTitle,
            date: params.date,
            time: params.time,
            endTime: params.end_time,
            clientName: params.client_name,
            description: taskDesc,
          },
        }),
      })
      const crD = await cr.json()
      return NextResponse.json({ result: crD.item })
    }

    if (tool === 'level_delete_event') {
      const baseUrl = req.nextUrl.origin
      if (!params.id && !params.title_match) return NextResponse.json({ error: 'Informe o ID ou título do compromisso a remover.' })
      if (params.id) {
        await fetch(`${baseUrl}/api/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
          body: JSON.stringify({ type: 'events', action: 'delete', record: { id: params.id } }),
        })
        return NextResponse.json({ result: { ok: true } })
      }
      // Buscar por título
      const r = await fetch(`${baseUrl}/api/data?type=events`, { headers: { cookie: req.headers.get('cookie') || '' } })
      const d = await r.json()
      const ev = (d.data || []).find((e: any) => e.title?.toLowerCase().includes(params.title_match.toLowerCase()))
      if (!ev) return NextResponse.json({ error: 'Compromisso não encontrado.' })
      await fetch(`${baseUrl}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({ type: 'events', action: 'delete', record: { id: ev.id } }),
      })
      return NextResponse.json({ result: { ok: true, removed: ev.title } })
    }

    if (tool === 'level_update_event') {
      const baseUrl = req.nextUrl.origin
      if (!params.id && !params.title_match) return NextResponse.json({ error: 'Informe o ID ou título do compromisso.' })
      let eventId = params.id
      if (!eventId) {
        const r = await fetch(`${baseUrl}/api/data?type=events`, { headers: { cookie: req.headers.get('cookie') || '' } })
        const d = await r.json()
        const ev = (d.data || []).find((e: any) => e.title?.toLowerCase().includes(params.title_match.toLowerCase()))
        if (!ev) return NextResponse.json({ error: 'Compromisso não encontrado.' })
        eventId = ev.id
      }
      const record: Record<string, any> = { id: eventId }
      if (params.date) record.date = params.date
      if (params.time) record.time = params.time
      if (params.title) record.title = params.title
      await fetch(`${baseUrl}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({ type: 'events', action: 'update', record }),
      })
      return NextResponse.json({ result: { ok: true } })
    }

    // ── DEMANDS ──
    const DEMAND_TIME: Record<string, number> = {
      edição: 120, captação: 180, roteiro: 90, motion: 240, reunião: 60, entrega: 30,
    }

    if (tool === 'level_create_demand') {
      const baseUrl = req.nextUrl.origin
      const estimatedMinutes = (DEMAND_TIME[params.type] || 120) * (params.deliverables || 1)
      const record: Record<string, any> = {
        title: params.title,
        clientName: params.client_name,
        type: params.type || 'edição',
        deadline: params.deadline,
        priority: params.priority || 'normal',
        deliverables: params.deliverables || 1,
        estimatedMinutes,
        status: 'pending',
        notes: params.notes,
      }
      const r = await fetch(`${baseUrl}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({ type: 'demands', action: 'create', record }),
      })
      const d = await r.json()
      // Criar evento no calendário automaticamente se tiver prazo
      if (params.deadline) {
        await fetch(`${baseUrl}/api/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
          body: JSON.stringify({
            type: 'events', action: 'create',
            record: {
              title: `📋 ${params.title}`,
              date: params.deadline,
              clientName: params.client_name,
              description: `Entrega demanda — ${estimatedMinutes >= 60 ? Math.floor(estimatedMinutes/60)+'h' : estimatedMinutes+'min'}`,
            },
          }),
        })
      }
      return NextResponse.json({ result: { ...d.item, estimatedMinutes } })
    }

    if (tool === 'level_list_demands') {
      const baseUrl = req.nextUrl.origin
      const r = await fetch(`${baseUrl}/api/data?type=demands`, {
        headers: { cookie: req.headers.get('cookie') || '' },
      })
      const d = await r.json()
      let list: any[] = d.data || []
      if (params.status) list = list.filter((x: any) => x.status === params.status)
      if (params.priority) list = list.filter((x: any) => x.priority === params.priority)
      // Marcar atrasadas
      list = list.map((x: any) => ({
        ...x,
        overdue: x.deadline && x.status !== 'completed' && new Date(x.deadline) < new Date(),
      }))
      return NextResponse.json({ result: list })
    }

    if (tool === 'level_update_demand') {
      const baseUrl = req.nextUrl.origin
      const record: Record<string, any> = { id: params.id }
      if (params.status)   record.status   = params.status
      if (params.priority) record.priority = params.priority
      if (params.deadline) record.deadline = params.deadline
      if (params.title)    record.title    = params.title
      const r = await fetch(`${baseUrl}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({ type: 'demands', action: 'update', record }),
      })
      const d = await r.json()
      return NextResponse.json({ result: d.item })
    }

    if (tool === 'level_calculate_time') {
      const type: string = params.type || 'edição'
      const deliverables: number = params.deliverables || 1
      const minutesPerUnit: number = DEMAND_TIME[type] || 120
      const total = minutesPerUnit * deliverables
      return NextResponse.json({
        result: {
          type, deliverables, minutesPerUnit, totalMinutes: total,
          formatted: total >= 60 ? `${Math.floor(total/60)}h ${total%60>0?total%60+'min':''}`.trim() : `${total}min`,
        }
      })
    }

    if (tool === 'level_prioritize_demands') {
      const baseUrl = req.nextUrl.origin
      const r = await fetch(`${baseUrl}/api/data?type=demands`, {
        headers: { cookie: req.headers.get('cookie') || '' },
      })
      const d = await r.json()
      const pOrder: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 }
      const list = (d.data || [])
        .filter((x: any) => x.status !== 'completed')
        .map((x: any) => ({
          ...x,
          overdue: x.deadline && new Date(x.deadline) < new Date(),
          daysLeft: x.deadline ? Math.ceil((new Date(x.deadline).getTime() - Date.now()) / 86400000) : 999,
        }))
        .sort((a: any, b: any) => {
          if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
          const pa = pOrder[a.priority] ?? 2
          const pb = pOrder[b.priority] ?? 2
          if (pa !== pb) return pa - pb
          return a.daysLeft - b.daysLeft
        })
      return NextResponse.json({ result: list })
    }

    return NextResponse.json({ error: `Tool desconhecida: ${tool}` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao executar ação' }, { status: 500 })
  }
}
