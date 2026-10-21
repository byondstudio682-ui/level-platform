'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, LayoutDashboard, CheckSquare,
  Calendar, Info, Plus, X, Trash2, Edit2, AlertCircle, User,
} from 'lucide-react'
import { useClients, useTaskList, useEvents, type Client, type TaskRecord, type CalendarEvent } from '@/hooks/useData'
import { TopNav } from '@/components/layout/TopNav'
import { PageEnter } from '@/components/layout/PageEnter'

// ─── Sons ─────────────────────────────────────────────────────────────────────
function playTick() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'sine'
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08)
    g.gain.setValueAtTime(0.10, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.10)
    o.start(); o.stop(ctx.currentTime + 0.10)
    o.onended = () => ctx.close()
  } catch {}
}

// ─── Avatar com iniciais ─────────────────────────────────────────────────────
function ClientAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const parts = name.trim().split(' ')
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: 'rgba(0,0,0,0.06)', border: '1.5px solid rgba(0,0,0,0.10)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.36, fontWeight: 700, color: 'rgba(0,0,0,0.65)', letterSpacing: '-0.02em' }}>
        {initials}
      </span>
    </div>
  )
}

// ─── Aba: Visão Geral ─────────────────────────────────────────────────────────
function TabOverview({ client, tasks, events }: { client: Client; tasks: TaskRecord[]; events: CalendarEvent[] }) {
  const clientTasks  = tasks.filter(t => t.clientId === client.id)
  const clientEvents = events.filter(e => e.clientId === client.id)
  const pending  = clientTasks.filter(t => t.status !== 'done' && t.status !== 'completed').length
  const done     = clientTasks.filter(t => t.status === 'done' || t.status === 'completed').length
  const upcoming = clientEvents.filter(e => e.date >= new Date().toISOString().slice(0, 10)).length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pendentes', value: pending },
          { label: 'Concluídas', value: done },
          { label: 'Eventos', value: upcoming },
          { label: 'Total tarefas', value: clientTasks.length },
        ].map((s, i) => (
          <div key={i} className="bg-black/4 border border-black/8 rounded-2xl p-4">
            <p className="text-2xl font-bold text-black/80 mb-1">{s.value}</p>
            <p className="text-xs text-black/35">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Próximas tarefas */}
      {clientTasks.filter(t => t.status !== 'done').length > 0 && (
        <div>
          <p className="text-black/35 text-xs tracking-widest uppercase mb-3">Próximas tarefas</p>
          <div className="space-y-2">
            {clientTasks.filter(t => t.status !== 'done').slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center justify-between bg-black/3 border border-black/6 rounded-xl px-4 py-3">
                <span className="text-black/75 text-sm">{task.title}</span>
                {task.priority === 'high' && (
                  <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg">Alta</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {clientTasks.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16">
          <User className="w-10 h-10 text-black/12" />
          <p className="text-black/30 text-sm">Nenhuma atividade ainda para este cliente</p>
        </div>
      )}
    </div>
  )
}

// ─── Aba: Tarefas ─────────────────────────────────────────────────────────────
function TabTasks({ client, tasks, upsertTask, deleteTask }: {
  client: Client; tasks: TaskRecord[]
  upsertTask: (t: TaskRecord) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}) {
  const clientTasks = tasks.filter(t => t.clientId === client.id)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', priority: 'normal', status: 'todo' })
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!form.title.trim()) return
    setSaving(true)
    await upsertTask({
      id: `task_${Date.now()}`,
      title: form.title.trim(),
      clientId: client.id,
      clientName: client.name,
      status: form.status,
      priority: form.priority,
      createdAt: new Date().toISOString(),
    })
    setForm({ title: '', priority: 'normal', status: 'todo' })
    setShowForm(false)
    setSaving(false)
  }

  const groups = [
    { key: 'todo',        label: 'A fazer',        items: clientTasks.filter(t => t.status === 'todo') },
    { key: 'in_progress', label: 'Em andamento',   items: clientTasks.filter(t => t.status === 'in_progress') },
    { key: 'done',        label: 'Concluído',       items: clientTasks.filter(t => t.status === 'done' || t.status === 'completed') },
  ].filter(g => g.items.length > 0)

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-black/85 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nova tarefa
        </button>
      </div>

      {showForm && (
        <div className="bg-black/4 border border-black/8 rounded-2xl p-4 space-y-3">
          <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Título da tarefa" onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/25" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm focus:outline-none">
              <option value="todo">A fazer</option>
              <option value="in_progress">Em andamento</option>
              <option value="done">Concluído</option>
            </select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm focus:outline-none">
              <option value="low">Baixa</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl text-sm text-black/40 border border-black/10 hover:text-black transition-colors">Cancelar</button>
            <button onClick={handleCreate} disabled={saving}
              className="flex-1 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/85 transition-colors disabled:opacity-50">
              {saving ? '...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {groups.map(g => (
        <div key={g.key}>
          <p className="text-black/35 text-xs tracking-widest uppercase mb-2">{g.label} <span className="ml-1 text-black/20">({g.items.length})</span></p>
          <div className="space-y-2">
            {g.items.map(task => (
              <div key={task.id} className="flex items-center justify-between bg-black/3 border border-black/6 rounded-xl px-4 py-3">
                <span className={`text-sm ${g.key === 'done' ? 'text-black/30 line-through' : 'text-black/75'}`}>{task.title}</span>
                <button onClick={() => deleteTask(task.id)} className="text-black/15 hover:text-black/45 transition-colors ml-3">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {clientTasks.length === 0 && !showForm && (
        <div className="text-center py-16 text-black/25 text-sm">Nenhuma tarefa para este cliente</div>
      )}
    </div>
  )
}

// ─── Aba: Calendário ─────────────────────────────────────────────────────────
function TabCalendar({ client, events, createEvent, deleteEvent }: {
  client: Client; events: CalendarEvent[]
  createEvent: (e: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<CalendarEvent>
  deleteEvent: (id: string) => Promise<void>
}) {
  const clientEvents = events
    .filter(e => e.clientId === client.id)
    .sort((a, b) => a.date.localeCompare(b.date))
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', date: '', time: '', description: '' })
  const [saving, setSaving] = useState(false)
  const now = new Date().toISOString().slice(0, 10)

  async function handleCreate() {
    if (!form.title.trim() || !form.date) return
    setSaving(true)
    await createEvent({ title: form.title.trim(), date: form.date, time: form.time || undefined, description: form.description || undefined, clientId: client.id, clientName: client.name })
    setForm({ title: '', date: '', time: '', description: '' })
    setShowForm(false); setSaving(false)
  }

  function fmt(d: string) {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }) }
    catch { return d }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-black/85 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Novo evento
        </button>
      </div>

      {showForm && (
        <div className="bg-black/4 border border-black/8 rounded-2xl p-4 space-y-3">
          <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Título do evento"
            className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/25" />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm focus:outline-none" />
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm focus:outline-none" />
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Descrição (opcional)" rows={2}
            className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/25 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl text-sm text-black/40 border border-black/10 hover:text-black transition-colors">Cancelar</button>
            <button onClick={handleCreate} disabled={saving}
              className="flex-1 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/85 transition-colors disabled:opacity-50">
              {saving ? '...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {clientEvents.length === 0 && !showForm ? (
        <div className="text-center py-16 text-black/25 text-sm">Nenhum evento agendado para este cliente</div>
      ) : (
        <div className="space-y-2">
          {clientEvents.map(ev => (
            <div key={ev.id} className={`flex items-start justify-between bg-black/3 border border-black/6 rounded-xl px-4 py-3 ${ev.date < now ? 'opacity-40' : ''}`}>
              <div>
                <p className="text-black/75 text-sm">{ev.title}</p>
                <p className="text-black/35 text-xs mt-0.5">{fmt(ev.date)}{ev.time ? ` · ${ev.time}` : ''}</p>
                {ev.description && <p className="text-black/28 text-xs mt-1">{ev.description}</p>}
              </div>
              <button onClick={() => deleteEvent(ev.id)} className="text-black/15 hover:text-black/45 transition-colors ml-3 mt-0.5">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Aba: Info ────────────────────────────────────────────────────────────────
function TabInfo({ client, updateClient }: {
  client: Client
  updateClient: (d: Partial<Client> & { id: string }) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: client.name, email: client.email || '', phone: client.phone || '', company: client.company || '', notes: client.notes || '' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await updateClient({ id: client.id, ...form })
    setSaving(false); setEditing(false)
  }

  return (
    <div className="space-y-5 max-w-md">
      <div className="flex justify-end">
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 border border-black/10 text-black/50 hover:text-black rounded-xl text-sm transition-colors">
            <Edit2 className="w-3.5 h-3.5" /> Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl text-sm text-black/40 border border-black/10 hover:text-black transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/85 transition-colors disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      {[
        { label: 'Nome', key: 'name' as const },
        { label: 'Email', key: 'email' as const },
        { label: 'Telefone', key: 'phone' as const },
        { label: 'Empresa', key: 'company' as const },
      ].map(f => (
        <div key={f.key}>
          <label className="block text-black/35 text-xs tracking-widest uppercase mb-1.5">{f.label}</label>
          {editing ? (
            <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2.5 text-black text-sm focus:outline-none focus:border-black/25" />
          ) : (
            <p className={`text-sm ${form[f.key] ? 'text-black/75' : 'text-black/20'}`}>{form[f.key] || '—'}</p>
          )}
        </div>
      ))}

      <div>
        <label className="block text-black/35 text-xs tracking-widest uppercase mb-1.5">Observações</label>
        {editing ? (
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
            className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2.5 text-black text-sm focus:outline-none focus:border-black/25 resize-vertical" />
        ) : (
          <p className={`text-sm whitespace-pre-wrap ${form.notes ? 'text-black/75' : 'text-black/20'}`}>{form.notes || '—'}</p>
        )}
      </div>
    </div>
  )
}

// ─── Página interna do cliente ────────────────────────────────────────────────
type TabId = 'overview' | 'tasks' | 'calendar' | 'info'

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'overview',  label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'tasks',     label: 'Tarefas',     icon: CheckSquare },
  { id: 'calendar',  label: 'Calendário',  icon: Calendar },
  { id: 'info',      label: 'Info',        icon: Info },
]

const TAB_KEY = (id: string) => `level_client_tab_${id}`

function ClientePageInner() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const { clients, loading, updateClient } = useClients()
  const { tasks, upsertTask, deleteTask }  = useTaskList()
  const { events, createEvent, deleteEvent } = useEvents()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const client = clients.find(c => c.id === id)

  // Restaurar aba salva
  useEffect(() => {
    if (!id) return
    const saved = sessionStorage.getItem(TAB_KEY(id))
    if (saved && TABS.find(t => t.id === saved)) setActiveTab(saved as TabId)
  }, [id])

  function handleTab(tab: TabId) {
    playTick()
    setActiveTab(tab)
    if (id) sessionStorage.setItem(TAB_KEY(id), tab)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <TopNav />
        <div className="w-6 h-6 border-2 border-black/15 border-t-black/55 rounded-full animate-spin mt-14" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-white">
        <TopNav />
        <div className="pt-14 flex flex-col items-center justify-center h-screen gap-4">
          <AlertCircle className="w-10 h-10 text-black/15" />
          <p className="text-black/35 text-sm">Cliente não encontrado</p>
          <button onClick={() => router.push('/home')} className="text-black/50 text-sm underline">Voltar para clientes</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <main className="pt-14 flex flex-col h-screen overflow-hidden">
        <PageEnter className="flex flex-col flex-1 min-h-0 p-6 sm:p-8">

          {/* Sub-header do cliente */}
          <div className="flex items-center gap-4 mb-6 flex-shrink-0">
            <button
              onClick={() => router.push('/home')}
              className="flex items-center gap-1.5 text-black/35 hover:text-black/70 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Clientes
            </button>
            <div className="w-px h-4 bg-black/10" />
            <ClientAvatar name={client.name} size={36} />
            <div>
              <p className="text-black font-semibold text-base leading-tight">{client.name}</p>
              {client.company && <p className="text-black/35 text-xs">{client.company}</p>}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 flex-shrink-0 border-b border-black/6 pb-0">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                    isActive
                      ? 'border-black text-black'
                      : 'border-transparent text-black/35 hover:text-black/65'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Conteúdo da aba */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'overview' && <TabOverview client={client} tasks={tasks} events={events} />}
            {activeTab === 'tasks'    && <TabTasks    client={client} tasks={tasks} upsertTask={upsertTask} deleteTask={deleteTask} />}
            {activeTab === 'calendar' && <TabCalendar client={client} events={events} createEvent={createEvent} deleteEvent={deleteEvent} />}
            {activeTab === 'info'     && <TabInfo     client={client} updateClient={updateClient} />}
          </div>

        </PageEnter>
      </main>
    </div>
  )
}

// ─── Export com Suspense (obrigatório para useParams no Next.js 16.4) ─────────
export default function ClientePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black/15 border-t-black/55 rounded-full animate-spin" />
      </div>
    }>
      <ClientePageInner />
    </Suspense>
  )
}
