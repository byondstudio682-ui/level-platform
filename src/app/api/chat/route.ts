import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'


const _SP: string[] = [
  'Voce e Level, assistente de produtividade de uma agencia de producao audiovisual.',
  'ACOES DISPONIVEIS',
  'TAREFAS (Kanban):',
  '- level_create_task: cria tarefa no board kanban',
  '- level_list_tasks: lista tarefas. overdue=true para atrasadas. Filtros: status, priority.',
  '- level_update_task: atualiza status/prazo/prioridade/titulo. Use title_match para buscar por nome.',
  'AGENDA INTERNA DO LEVEL:',
  '- level_schedule_task: PASSA PARA A AGENDA. Adiciona ou atualiza item na agenda interna. Evita duplicatas. Obrigatorio: date. Opcional: time, end_time.',
  '- level_create_event: cria evento avulso',
  '- level_list_events: lista compromissos agendados',
  '- level_update_event: reagenda ou renomeia compromisso',
  '- level_delete_event: remove compromisso da agenda',
  'DEMANDAS AUDIOVISUAIS:',
  '- level_create_demand: cria demanda. Se tiver prazo cria evento automaticamente.',
  '- level_list_demands: lista demandas. overdue=true para atrasadas.',
  '- level_update_demand: atualiza demanda',
  '- level_calculate_time: calcula tempo estimado (tipo x entregaveis)',
  '- level_prioritize_demands: ordena demandas por urgencia',
  'CLIENTES: level_list_clients, level_create_client',
  'INTEGRACOES (so quando configurado): gcal_list_events, gcal_create_event, trello_create_card, notion_search',
  'COMPORTAMENTO CRITICO:',
  '"PASSA PARA A AGENDA" / "COLOCA NA AGENDA" / "AGENDA ISSO":',
  '-> SEMPRE use level_schedule_task (agenda interna do Level, NAO Google Calendar)',
  '-> Identifique o item pelo contexto. Se faltar data: pergunte. Se faltar hora: crie sem hora.',
  '-> Se ja existir na agenda nessa data: atualize, nao duplique.',
  '-> Confirme: Pronto, [titulo] adicionado a agenda para [data].',
  '"TIRA DA AGENDA" / "CANCELA": use level_delete_event com title_match',
  '"PASSA PARA SEXTA" / "MUDA O PRAZO": use level_update_task (tarefa) ou level_update_event (agenda)',
  '"MARCA COMO CONCLUIDA": use level_update_task com status=done',
  '"QUAIS MINHAS PRIORIDADES" / "O QUE ESTA ATRASADO": use level_list_tasks, filtre overdue=true',
  '"QUANTO TEMPO PARA CONCLUIR TUDO": some estimatedMinutes de tarefas pendentes',
  'TEMPOS por entregavel: edicao 2h, captacao 3h, roteiro 1h30, motion 4h, reuniao 1h, entrega 30min',
  'REGRAS: Nao simule acoes. Agenda interna != Google Calendar. Pergunte se ambiguo. Portugues do Brasil.',
]
const SYSTEM_PROMPT = _SP.join('\n')

// Definição das ferramentas para o Gemini
const TOOLS = [{
  functionDeclarations: [
    {
      name: 'trello_get_boards',
      description: 'Lista todos os boards do Trello do usuário',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'trello_get_lists',
      description: 'Lista as listas de um board do Trello',
      parameters: {
        type: 'object',
        properties: { board_id: { type: 'string', description: 'ID do board' } },
        required: ['board_id'],
      },
    },
    {
      name: 'trello_get_cards',
      description: 'Lista os cards de um board do Trello',
      parameters: {
        type: 'object',
        properties: { board_id: { type: 'string', description: 'ID do board' } },
        required: ['board_id'],
      },
    },
    {
      name: 'trello_create_card',
      description: 'Cria um novo card no Trello',
      parameters: {
        type: 'object',
        properties: {
          list_id: { type: 'string', description: 'ID da lista onde criar o card' },
          name: { type: 'string', description: 'Nome do card' },
          desc: { type: 'string', description: 'Descrição do card (opcional)' },
        },
        required: ['list_id', 'name'],
      },
    },
    {
      name: 'notion_search',
      description: 'Busca páginas e databases no Notion',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Texto para buscar' } },
        required: ['query'],
      },
    },
    {
      name: 'notion_create_page',
      description: 'Cria uma nova página/entrada em um database do Notion',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título da página' },
          content: { type: 'string', description: 'Conteúdo/corpo da página' },
          database_id: { type: 'string', description: 'ID do database (opcional se já configurado)' },
        },
        required: ['title'],
      },
    },
    {
      name: 'notion_create_note',
      description: 'Cria uma sub-página/nota dentro de uma página do Notion',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título da nota' },
          content: { type: 'string', description: 'Conteúdo da nota' },
          page_id: { type: 'string', description: 'ID da página pai' },
        },
        required: ['title'],
      },
    },
    {
      name: 'gcal_list_events',
      description: 'Lista próximos eventos do Google Agenda',
      parameters: {
        type: 'object',
        properties: {
          max_results: { type: 'number', description: 'Número máximo de eventos (padrão 10)' },
        },
      },
    },
    {
      name: 'gcal_create_event',
      description: 'Cria um evento no Google Agenda',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Título do evento' },
          start_datetime: { type: 'string', description: 'Data e hora de início em ISO 8601 (ex: 2025-05-20T14:00:00)' },
          end_datetime: { type: 'string', description: 'Data e hora de fim em ISO 8601' },
          description: { type: 'string', description: 'Descrição do evento (opcional)' },
        },
        required: ['summary', 'start_datetime', 'end_datetime'],
      },
    },
    {
      name: 'level_create_event',
      description: 'Cria um evento/compromisso no Calendário do Level (SEMPRE use esta tool quando o usuário pedir para agendar algo)',
      parameters: {
        type: 'object',
        properties: {
          title:       { type: 'string', description: 'Título do compromisso' },
          date:        { type: 'string', description: 'Data no formato YYYY-MM-DD' },
          time:        { type: 'string', description: 'Horário de início HH:MM (opcional)' },
          end_time:    { type: 'string', description: 'Horário de fim HH:MM (opcional)' },
          client_name: { type: 'string', description: 'Nome do cliente relacionado (opcional)' },
          description: { type: 'string', description: 'Descrição ou observações (opcional)' },
        },
        required: ['title', 'date'],
      },
    },
    {
      name: 'level_create_client',
      description: 'Cadastra um novo cliente no Level',
      parameters: {
        type: 'object',
        properties: {
          name:    { type: 'string', description: 'Nome do cliente' },
          email:   { type: 'string', description: 'Email (opcional)' },
          phone:   { type: 'string', description: 'Telefone (opcional)' },
          company: { type: 'string', description: 'Empresa (opcional)' },
          notes:   { type: 'string', description: 'Observações (opcional)' },
        },
        required: ['name'],
      },
    },
    {
      name: 'level_list_clients',
      description: 'Lista todos os clientes cadastrados no Level',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'level_list_events',
      description: 'Lista os compromissos agendados no Calendário do Level',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'level_update_event',
      description: 'Reagenda ou renomeia um compromisso existente na agenda interna',
      parameters: {
        type: 'object',
        properties: {
          id:          { type: 'string', description: 'ID do evento (se conhecido)' },
          title_match: { type: 'string', description: 'Parte do título para localizar o evento' },
          date:        { type: 'string', description: 'Nova data YYYY-MM-DD' },
          time:        { type: 'string', description: 'Novo horário HH:MM' },
          title:       { type: 'string', description: 'Novo título' },
        },
      },
    },
    {
      name: 'level_delete_event',
      description: 'Remove um compromisso da agenda interna do Level',
      parameters: {
        type: 'object',
        properties: {
          id:          { type: 'string', description: 'ID do evento' },
          title_match: { type: 'string', description: 'Parte do título para localizar o evento' },
        },
      },
    },
    {
      name: 'level_create_task',
      description: 'Cria uma tarefa no board kanban do Level',
      parameters: {
        type: 'object',
        properties: {
          title:             { type: 'string',  description: 'Título da tarefa' },
          client_name:       { type: 'string',  description: 'Nome do cliente (opcional)' },
          category:          { type: 'string',  description: 'Categoria (ex: Edição, Captação, Roteiro)' },
          priority:          { type: 'string',  description: 'Prioridade: critical | high | normal | low' },
          status:            { type: 'string',  description: 'Coluna: backlog | todo | in_progress | review | done (padrão: todo)' },
          deadline:          { type: 'string',  description: 'Prazo YYYY-MM-DD' },
          estimated_minutes: { type: 'number',  description: 'Tempo estimado em minutos' },
        },
        required: ['title'],
      },
    },
    {
      name: 'level_list_tasks',
      description: 'Lista tarefas do kanban. Retorna overdue=true para atrasadas e daysLeft para dias até o prazo.',
      parameters: {
        type: 'object',
        properties: {
          status:   { type: 'string', description: 'Filtrar por coluna: backlog | todo | in_progress | review | done' },
          priority: { type: 'string', description: 'Filtrar por prioridade: critical | high | normal | low' },
        },
      },
    },
    {
      name: 'level_update_task',
      description: 'Atualiza uma tarefa do kanban: status, prazo, prioridade ou título. Use title_match para buscar por nome parcial.',
      parameters: {
        type: 'object',
        properties: {
          id:          { type: 'string', description: 'ID exato da tarefa (se conhecido)' },
          title_match: { type: 'string', description: 'Parte do título para localizar a tarefa (se ID não conhecido)' },
          status:      { type: 'string', description: 'Novo status/coluna: backlog | todo | in_progress | review | done' },
          deadline:    { type: 'string', description: 'Novo prazo YYYY-MM-DD (string vazia para remover)' },
          priority:    { type: 'string', description: 'Nova prioridade: critical | high | normal | low' },
          title:       { type: 'string', description: 'Novo título' },
        },
      },
    },
    {
      name: 'level_schedule_task',
      description: 'AGENDA INTERNA DO LEVEL: adiciona ou atualiza uma tarefa/compromisso na agenda interna. Use quando o usuário disser "passa para a agenda", "coloca na agenda", "agenda isso", "agenda para amanhã às X". NÃO é o Google Calendar.',
      parameters: {
        type: 'object',
        properties: {
          task_title:  { type: 'string', description: 'Título do compromisso/tarefa a agendar' },
          task_id:     { type: 'string', description: 'ID da tarefa se conhecido' },
          date:        { type: 'string', description: 'Data YYYY-MM-DD (obrigatório)' },
          time:        { type: 'string', description: 'Horário HH:MM (opcional)' },
          end_time:    { type: 'string', description: 'Horário de término HH:MM (opcional)' },
          client_name: { type: 'string', description: 'Cliente (opcional)' },
          description: { type: 'string', description: 'Descrição adicional (opcional)' },
        },
        required: ['task_title', 'date'],
      },
    },
    {
      name: 'level_create_demand',
      description: 'Cria uma demanda audiovisual no Level. Se tiver prazo, cria evento no calendário automaticamente.',
      parameters: {
        type: 'object',
        properties: {
          title:        { type: 'string',  description: 'Título da demanda' },
          client_name:  { type: 'string',  description: 'Nome do cliente (opcional)' },
          type:         { type: 'string',  description: 'Tipo: edição | captação | roteiro | motion | reunião | entrega' },
          deadline:     { type: 'string',  description: 'Prazo no formato YYYY-MM-DD (opcional)' },
          priority:     { type: 'string',  description: 'Prioridade: critical | high | normal | low (padrão: normal)' },
          deliverables: { type: 'number',  description: 'Quantidade de entregáveis (padrão: 1)' },
          notes:        { type: 'string',  description: 'Observações (opcional)' },
        },
        required: ['title'],
      },
    },
    {
      name: 'level_list_demands',
      description: 'Lista demandas audiovisuais. Retorna campo overdue=true para atrasadas.',
      parameters: {
        type: 'object',
        properties: {
          status:   { type: 'string', description: 'Filtrar por status: pending | in_progress | completed (opcional)' },
          priority: { type: 'string', description: 'Filtrar por prioridade: critical | high | normal | low (opcional)' },
        },
      },
    },
    {
      name: 'level_update_demand',
      description: 'Atualiza campos de uma demanda existente (status, prioridade, prazo, título)',
      parameters: {
        type: 'object',
        properties: {
          id:       { type: 'string', description: 'ID da demanda' },
          status:   { type: 'string', description: 'Novo status: pending | in_progress | completed' },
          priority: { type: 'string', description: 'Nova prioridade: critical | high | normal | low' },
          deadline: { type: 'string', description: 'Novo prazo YYYY-MM-DD' },
          title:    { type: 'string', description: 'Novo título' },
        },
        required: ['id'],
      },
    },
    {
      name: 'level_calculate_time',
      description: 'Calcula o tempo estimado de execução com base no tipo de produção e quantidade de entregáveis',
      parameters: {
        type: 'object',
        properties: {
          type:         { type: 'string', description: 'Tipo de produção: edição | captação | roteiro | motion | reunião | entrega' },
          deliverables: { type: 'number', description: 'Quantidade de entregáveis' },
        },
        required: ['type', 'deliverables'],
      },
    },
    {
      name: 'level_prioritize_demands',
      description: 'Retorna demandas ativas ordenadas por urgência: atrasadas primeiro, depois por prioridade e prazo. Explique a ordem ao usuário.',
      parameters: { type: 'object', properties: {} },
    },
  ],
}]

import { adminClient as supabase } from '@/lib/auth'

// Chave Gemini padrão (fallback quando usuário não tem configurada)
const DEFAULT_GEMINI_KEY = process.env.DEFAULT_GEMINI_KEY || ''

async function getKeys(userId: string) {
  const { data } = await supabase
    .from('user_integrations')
    .select('key, value')
    .eq('user_id', userId)
    .in('key', ['gemini_api_key', 'openai_api_key', 'claude_api_key'])
  const k: Record<string, string> = {}
  data?.forEach((r: any) => { k[r.key] = r.value })
  // Fallback: se não tem chave Gemini, usa a padrão
  if (!k['gemini_api_key']) k['gemini_api_key'] = DEFAULT_GEMINI_KEY
  return k
}

// Executa a tool no endpoint ai-tools
async function executeTool(req: NextRequest, tool: string, params: Record<string, any>) {
  const baseUrl = req.nextUrl.origin
  const r = await fetch(`${baseUrl}/api/ai-tools`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: req.headers.get('cookie') || '',
    },
    body: JSON.stringify({ tool, params }),
  })
  return r.json()
}

// Gemini com function-calling multi-turno
async function callGeminiWithTools(apiKey: string, messages: any[], req: NextRequest): Promise<{ reply: string; actions: any[] }> {
  const filtered = messages.filter(m => m.content?.trim())
  const startIdx = filtered.findIndex(m => m.role === 'user')
  const trimmed = startIdx >= 0 ? filtered.slice(startIdx) : filtered

  const contents: any[] = trimmed.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const actions: any[] = []
  let iterations = 0

  while (iterations < 5) {
    iterations++
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          tools: TOOLS,
          generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err?.error?.message || 'Erro Gemini')
    }

    const data = await res.json()
    const candidate = data.candidates?.[0]
    const parts = candidate?.content?.parts || []

    // Adiciona resposta do modelo ao histórico
    contents.push({ role: 'model', parts })

    // Verifica se há function calls
    const fnCalls = parts.filter((p: any) => p.functionCall)
    if (fnCalls.length === 0) {
      // Resposta final em texto
      const text = parts.find((p: any) => p.text)?.text || ''
      return { reply: text, actions }
    }

    // Executa cada function call
    const toolResults: any[] = []
    for (const part of fnCalls) {
      const { name, args } = part.functionCall
      const result = await executeTool(req, name, args || {})
      actions.push({ tool: name, args, result })
      toolResults.push({
        functionResponse: {
          name,
          response: result.error ? { error: result.error } : { result: result.result },
        },
      })
    }

    // Adiciona resultados das tools ao histórico
    contents.push({ role: 'user', parts: toolResults })
  }

  return { reply: 'Não consegui completar a ação. Tente novamente.', actions }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model = 'gemini' } = await req.json()
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const keys = await getKeys(user.id)
    const geminiKey = keys['gemini_api_key']

    if (!geminiKey) {
      return NextResponse.json({ reply: '⚠️ Chave do Gemini não configurada. Acesse **Conectar** → Gemini IA para adicionar sua API Key.' })
    }

    const { reply, actions } = await callGeminiWithTools(geminiKey, messages, req)
    return NextResponse.json({ reply, actions })

  } catch (err: any) {
    console.error('Chat error:', err)
    const msg = err?.message || ''
    if (msg.includes('quota') || msg.includes('billing')) {
      return NextResponse.json({ reply: '⚠️ Cota da API esgotada. Verifique os créditos da sua conta Gemini.' })
    }
    return NextResponse.json({ reply: '⚠️ Erro ao conectar com a IA. Verifique sua chave de API.' })
  }
}
