'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, AlertCircle, Clock, Users, ExternalLink, RefreshCw, Loader2, Calendar } from 'lucide-react'
import Link from 'next/link'

interface KanbanCard {
  id: string; title: string; client: string; priority: string; status: string; deadline?: string
}
interface KanbanColumn { id: string; title: string; cards: KanbanCard[] }
interface Client { id: string; name: string; company?: string; createdAt: string }
interface CalEvent { id: string; title: string; date: string; time?: string; clientName?: string }

export function DashboardClient() {
  const [columns,  setColumns]  = useState<KanbanColumn[]>([])
  const [clients,  setClients]  = useState<Client[]>([])
  const [events,   setEvents]   = useState<CalEvent[]>([])
  const [loading,  setLoading]  = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  async function loadAll() {
    setLoading(true)
    try {
      const [tasksRes, clientsRes, eventsRes] = await Promise.all([
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/data?type=clients').then(r => r.json()),
        fetch('/api/data?type=events').then(r => r.json()),
      ])
      setColumns(tasksRes.columns || [])
      setClients(clientsRes.data || [])
      setEvents(eventsRes.data || [])
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'))
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const allCards = columns.flatMap(c => c.cards)
  const totalCards = allCards.length
  const today = new Date().toISOString().slice(0, 10)

  const overdueCards = allCards.filter(c => c.deadline && c.deadline < today && c.status !== 'done')
  const dueSoon = allCards.filter(c => {
    if (!c.deadline || c.status === 'done') return false
    const diff = (new Date(c.deadline).getTime() - Date.now()) / 86400000
    return diff >= 0 && diff <= 3
  })
  const doneCards = allCards.filter(c => c.status === 'done')

  const upcomingEvents = events
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)

  const overdueByClient: Record<string, number> = {}
  overdueCards.forEach(c => {
    overdueByClient[c.client] = (overdueByClient[c.client] || 0) + 1
  })

  const cardsByCol = columns.map(col => ({ id: col.id, title: col.title, count: col.cards.length }))

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-black tracking-tight">Dashboard</h1>
          <p className="text-black/40 text-sm mt-0.5">
            {loading ? 'Carregando...' : `Atualizado às ${lastUpdate}`}
          </p>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-black/5 border border-black/10 rounded-xl text-black/40 hover:text-black hover:bg-black/8 transition-all text-sm disabled:opacity-30"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-black/20 animate-spin mx-auto mb-3" />
            <p className="text-black/30 text-sm">Carregando dados...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Tarefas abertas', value: totalCards - doneCards.length, sub: `${doneCards.length} concluídas`, icon: CheckSquare, highlight: false },
              { label: 'Atrasadas', value: overdueCards.length, sub: overdueCards.length > 0 ? 'requer atenção agora' : 'tudo em dia 🎉', icon: AlertCircle, highlight: overdueCards.length > 0 },
              { label: 'Vencem em 3 dias', value: dueSoon.length, sub: 'prazo próximo', icon: Clock, highlight: dueSoon.length > 0 },
              { label: 'Clientes', value: clients.length, sub: 'cadastrados', icon: Users, highlight: false },
            ].map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i} className={`p-5 rounded-2xl border ${stat.highlight ? 'bg-red-500/5 border-red-500/20' : 'bg-black/3 border-black/8'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-black/40 text-xs uppercase tracking-wider">{stat.label}</span>
                    <Icon className={`w-4 h-4 ${stat.highlight ? 'text-red-400' : 'text-black/20'}`} />
                  </div>
                  <p className={`text-3xl font-semibold ${stat.highlight ? 'text-red-400' : 'text-black'}`}>{stat.value}</p>
                  <p className="text-black/30 text-xs mt-1">{stat.sub}</p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Kanban por coluna */}
            <div className="bg-black/3 border border-black/8 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-black/50 text-xs font-medium uppercase tracking-wider">Tarefas por etapa</p>
                <Link href="/tarefas" className="text-black/25 hover:text-black text-xs transition-colors flex items-center gap-1">
                  Ver kanban <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {cardsByCol.map(col => (
                  <div key={col.id} className="flex items-center justify-between py-1.5">
                    <span className="text-black/60 text-sm">{col.title}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-black/5 rounded-full h-1.5">
                        <div className="bg-black h-1.5 rounded-full" style={{ width: `${Math.min((col.count / Math.max(totalCards, 1)) * 100, 100)}%` }} />
                      </div>
                      <span className="text-black/35 text-xs w-6 text-right">{col.count}</span>
                    </div>
                  </div>
                ))}
                {cardsByCol.length === 0 && <p className="text-black/25 text-sm text-center py-4">Nenhuma tarefa no sistema</p>}
              </div>
            </div>

            {/* Próximos compromissos */}
            <div className="bg-black/3 border border-black/8 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-black/50 text-xs font-medium uppercase tracking-wider">Próximos compromissos</p>
                <Link href="/calendario" className="text-black/25 hover:text-black text-xs transition-colors flex items-center gap-1">
                  Ver calendário <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-1.5">
                {upcomingEvents.length === 0 ? (
                  <p className="text-black/25 text-sm text-center py-4">Nenhum compromisso agendado</p>
                ) : upcomingEvents.map(ev => {
                  const isToday = ev.date === today
                  const d = ev.date.slice(8, 10) + '/' + ev.date.slice(5, 7)
                  return (
                    <div key={ev.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-black/5 transition-colors">
                      <Calendar className={`w-3.5 h-3.5 flex-shrink-0 ${isToday ? 'text-black' : 'text-black/25'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-black/70 text-sm truncate">{ev.title}</p>
                        {ev.clientName && <p className="text-black/35 text-xs">{ev.clientName}</p>}
                      </div>
                      <span className={`text-xs flex-shrink-0 ${isToday ? 'text-black font-medium' : 'text-black/30'}`}>
                        {isToday ? 'Hoje' : d}{ev.time ? ` · ${ev.time}` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Clientes cadastrados */}
          {clients.length > 0 && (
            <div className="bg-black/3 border border-black/8 rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-black/50 text-xs font-medium uppercase tracking-wider">Clientes recentes</p>
                <Link href="/clientes" className="text-black/25 hover:text-black text-xs transition-colors flex items-center gap-1">
                  Ver todos <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {clients.slice(0, 8).map((c, i) => {
                  const dots = ['bg-violet-400','bg-amber-400','bg-blue-400','bg-green-400','bg-pink-400','bg-cyan-400','bg-orange-400','bg-red-400']
                  const clientTasks = allCards.filter(t => t.client?.toLowerCase() === c.name.toLowerCase())
                  return (
                    <Link key={c.id} href="/clientes"
                      className="flex items-center gap-2.5 py-2.5 px-3 bg-black/3 border border-black/5 rounded-xl hover:border-black/15 hover:bg-black/5 transition-all">
                      <span className={`w-2 h-2 rounded-full ${dots[i % dots.length]} flex-shrink-0`} />
                      <div className="min-w-0">
                        <p className="text-black/70 text-xs font-medium truncate">{c.name}</p>
                        {clientTasks.length > 0 && <p className="text-black/30 text-[10px]">{clientTasks.length} tarefa{clientTasks.length !== 1 ? 's' : ''}</p>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tarefas atrasadas */}
          {overdueCards.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-red-400 text-sm font-medium">{overdueCards.length} tarefa{overdueCards.length > 1 ? 's' : ''} atrasada{overdueCards.length > 1 ? 's' : ''}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {overdueCards.slice(0, 6).map(card => (
                  <Link key={card.id} href="/tarefas"
                    className="flex items-center gap-2.5 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-xl hover:border-red-500/25 transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-black/70 text-xs truncate">{card.title}</p>
                      <p className="text-black/40 text-xs">{card.client} · venceu {card.deadline?.slice(8,10)}/{card.deadline?.slice(5,7)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {overdueCards.length > 6 && (
                <p className="text-red-400/40 text-xs text-center mt-3">+{overdueCards.length - 6} atrasadas — <Link href="/tarefas" className="underline">ver todas</Link></p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
