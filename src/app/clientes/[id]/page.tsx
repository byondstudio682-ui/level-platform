'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, LayoutDashboard, CheckSquare,
  Calendar, Info, Plus, X, Trash2,
  Edit2, AlertCircle, Clock, LogOut,
} from 'lucide-react'
import { useClients, useTaskList, useEvents, type Client, type TaskRecord, type CalendarEvent } from '@/hooks/useData'

// ─── Sons ─────────────────────────────────────────────────────────────────────
function playTone(freq: number, dur: number, vol = 0.09) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'sine'
    o.frequency.setValueAtTime(freq, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(freq * 1.2, ctx.currentTime + dur)
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    o.start(); o.stop(ctx.currentTime + dur)
    o.onended = () => ctx.close()
  } catch {}
}
const playTab = () => playTone(660, 0.08, 0.08)

// ─── Iniciais ─────────────────────────────────────────────────────────────────
function ClientInitials({ name, size = 48 }: { name: string; size?: number }) {
  const parts = name.trim().split(' ')
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
  const hue = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: `hsl(${hue}, 40%, 20%)`,
      border: `1.5px solid hsl(${hue}, 40%, 30%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 700, color: `hsl(${hue}, 60%, 75%)`, letterSpacing: '-0.02em' }}>
        {initials}
      </span>
    </div>
  )
}

// ─── Aba: Visao Geral ─────────────────────────────────────────────────────────
function TabOverview({ client, tasks, events }: { client: Client; tasks: TaskRecord[]; events: CalendarEvent[] }) {
  const clientTasks = tasks.filter(t => t.clientId === client.id)
  const clientEvents = events.filter(e => e.clientId === client.id)
  const pending = clientTasks.filter(t => t.status !== 'done' && t.status !== 'completed').length
  const done = clientTasks.filter(t => t.status === 'done' || t.status === 'completed').length
  const upcoming = clientEvents.filter(e => new Date(e.date) >= new Date()).length

  const stats = [
    { label: 'Tarefas pendentes', value: pending, icon: CheckSquare },
    { label: 'Concluidas', value: done, icon: CheckSquare },
    { label: 'Eventos futuros', value: upcoming, icon: Calendar },
    { label: 'Total de tarefas', value: clientTasks.length, icon: LayoutDashboard },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: '18px 20px',
          }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.90)', marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.01em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Proximas tarefas */}
      {clientTasks.filter(t => t.status !== 'done').slice(0, 5).length > 0 && (
        <div>
          <h3 style={{ color: 'rgba(255,255,255,0.50)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
            Proximas tarefas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clientTasks.filter(t => t.status !== 'done').slice(0, 5).map(task => (
              <div key={task.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{task.title}</span>
                <span style={{
                  fontSize: 10, letterSpacing: '0.05em',
                  color: task.priority === 'high' ? 'rgba(255,160,50,0.90)' : 'rgba(255,255,255,0.30)',
                  background: task.priority === 'high' ? 'rgba(255,160,50,0.10)' : 'rgba(255,255,255,0.05)',
                  padding: '2px 8px', borderRadius: 99,
                }}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {clientTasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
          Nenhuma atividade ainda para este cliente.
        </div>
      )}
    </div>
  )
}

// ─── Aba: Tarefas ─────────────────────────────────────────────────────────────
function TabTasks({ client, tasks, upsertTask, deleteTask }: {
  client: Client
  tasks: TaskRecord[]
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

  const byStatus = {
    todo: clientTasks.filter(t => t.status === 'todo'),
    in_progress: clientTasks.filter(t => t.status === 'in_progress'),
    done: clientTasks.filter(t => t.status === 'done' || t.status === 'completed'),
  }

  const statusLabel: Record<string, string> = { todo: 'A fazer', in_progress: 'Em andamento', done: 'Concluido' }
  const statusColor: Record<string, string> = {
    todo: 'rgba(255,255,255,0.35)',
    in_progress: 'rgba(100,160,255,0.80)',
    done: 'rgba(80,200,120,0.80)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowForm(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: '6px 14px', color: 'rgba(255,255,255,0.75)',
          fontSize: 13, cursor: 'pointer',
        }}>
          <Plus className="w-3.5 h-3.5" /> Nova tarefa
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Titulo da tarefa"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none' }}>
              <option value="todo">A fazer</option>
              <option value="in_progress">Em andamento</option>
              <option value="done">Concluido</option>
            </select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none' }}>
              <option value="low">Baixa</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.40)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            <button onClick={handleCreate} disabled={saving} style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'rgba(255,255,255,0.90)', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 13, border: 'none' }}>
              {saving ? '...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {Object.entries(byStatus).map(([status, statusTasks]) => statusTasks.length > 0 && (
        <div key={status}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: statusColor[status] }}>{statusLabel[status]}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 99 }}>{statusTasks.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {statusTasks.map(task => (
              <div key={task.id} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <span style={{ color: status === 'done' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.78)', fontSize: 13, textDecoration: status === 'done' ? 'line-through' : 'none', flex: 1 }}>
                  {task.title}
                </span>
                <button onClick={() => deleteTask(task.id)} style={{ color: 'rgba(255,255,255,0.20)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {clientTasks.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
          Nenhuma tarefa para este cliente.
        </div>
      )}
    </div>
  )
}

// ─── Aba: Eventos ──────────────────────────────────────────────────────────────
function TabCalendar({ client, events, createEvent, deleteEvent }: {
  client: Client
  events: CalendarEvent[]
  createEvent: (e: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<CalendarEvent>
  deleteEvent: (id: string) => Promise<void>
}) {
  const clientEvents = events
    .filter(e => e.clientId === client.id)
    .sort((a, b) => a.date.localeCompare(b.date))

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', date: '', time: '', description: '' })
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!form.title.trim() || !form.date) return
    setSaving(true)
    await createEvent({
      title: form.title.trim(),
      date: form.date,
      time: form.time || undefined,
      description: form.description || undefined,
      clientId: client.id,
      clientName: client.name,
    })
    setForm({ title: '', date: '', time: '', description: '' })
    setShowForm(false)
    setSaving(false)
  }

  function formatDate(d: string) {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }) }
    catch { return d }
  }

  const now = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowForm(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: '6px 14px', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer',
        }}>
          <Plus className="w-3.5 h-3.5" /> Novo evento
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Titulo do evento"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ flex: 2, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none', colorScheme: 'dark' }} />
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none', colorScheme: 'dark' }} />
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Descricao (opcional)" rows={2}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none', resize: 'none' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.40)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            <button onClick={handleCreate} disabled={saving} style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'rgba(255,255,255,0.90)', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 13, border: 'none' }}>
              {saving ? '...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {clientEvents.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
          Nenhum evento agendado para este cliente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {clientEvents.map(event => {
            const isPast = event.date < now
            return (
              <div key={event.id} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                opacity: isPast ? 0.45 : 1,
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'rgba(255,255,255,0.80)', fontSize: 13, marginBottom: 3 }}>{event.title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                    {formatDate(event.date)}{event.time ? ` · ${event.time}` : ''}
                  </p>
                  {event.description && <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, marginTop: 4 }}>{event.description}</p>}
                </div>
                <button onClick={() => deleteEvent(event.id)} style={{ color: 'rgba(255,255,255,0.20)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Aba: Info do Cliente ─────────────────────────────────────────────────────
function TabInfo({ client, updateClient }: {
  client: Client
  updateClient: (data: Partial<Client> & { id: string }) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: client.name, email: client.email || '', phone: client.phone || '', company: client.company || '', notes: client.notes || '' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await updateClient({ id: client.id, ...form })
    setSaving(false)
    setEditing(false)
  }

  const fields = [
    { label: 'Nome', key: 'name' as const },
    { label: 'Email', key: 'email' as const },
    { label: 'Telefone', key: 'phone' as const },
    { label: 'Empresa', key: 'company' as const },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {!editing ? (
          <button onClick={() => setEditing(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, padding: '6px 14px', color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer',
          }}>
            <Edit2 className="w-3.5 h-3.5" /> Editar
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(false)} style={{ padding: '6px 14px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.40)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.90)', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 13, border: 'none' }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fields.map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', marginBottom: 5 }}>{f.label}</label>
            {editing ? (
              <input value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            ) : (
              <p style={{ color: form[f.key] ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.20)', fontSize: 14 }}>
                {form[f.key] || '—'}
              </p>
            )}
          </div>
        ))}
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', marginBottom: 5 }}>Observacoes</label>
          {editing ? (
            <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={3}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          ) : (
            <p style={{ color: form.notes ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.20)', fontSize: 14, whiteSpace: 'pre-wrap' }}>
              {form.notes || '—'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Pagina principal do cliente ──────────────────────────────────────────────
type TabId = 'overview' | 'tasks' | 'calendar' | 'info'

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'overview',  label: 'Visao Geral', icon: LayoutDashboard },
  { id: 'tasks',     label: 'Tarefas',     icon: CheckSquare },
  { id: 'calendar',  label: 'Calendario',  icon: Calendar },
  { id: 'info',      label: 'Info',        icon: Info },
]

const TAB_KEY = (id: string) => `byond_client_tab_${id}`

export default function ClientePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { clients, loading: loadingClients, updateClient } = useClients()
  const { tasks, upsertTask, deleteTask } = useTaskList()
  const { events, createEvent, deleteEvent } = useEvents()

  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [entered, setEntered] = useState(false)

  const client = clients.find(c => c.id === id)

  // Restaurar aba da sessao anterior
  useEffect(() => {
    if (!id) return
    const saved = sessionStorage.getItem(TAB_KEY(id))
    if (saved && TABS.find(t => t.id === saved)) setActiveTab(saved as TabId)
  }, [id])

  // Salvar aba ao trocar
  function handleTabChange(tabId: TabId) {
    setActiveTab(tabId)
    if (id) sessionStorage.setItem(TAB_KEY(id), tabId)
    playTab()
  }

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60)
    return () => clearTimeout(t)
  }, [])

  function handleBack() {
    router.push('/home')
  }

  if (loadingClients) {
    return (
      <div style={{ width: '100vw', height: '100dvh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.10)', borderTopColor: 'rgba(255,255,255,0.50)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!client) {
    return (
      <div style={{ width: '100vw', height: '100dvh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <AlertCircle style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.20)' }} />
        <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 15 }}>Cliente nao encontrado</p>
        <button onClick={handleBack} style={{ color: 'rgba(255,255,255,0.60)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Voltar para clientes
        </button>
      </div>
    )
  }

  return (
    <div style={{
      width: '100vw',
      minHeight: '100dvh',
      background: '#080808',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '20px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.60)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 40,
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'opacity 400ms ease, transform 400ms ease',
      }}>
        <button
          onClick={handleBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'rgba(255,255,255,0.40)', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 13,
            transition: 'color 200ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.80)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.40)')}
        >
          <ArrowLeft className="w-4 h-4" />
          Clientes
        </button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.10)' }} />

        <ClientInitials name={client.name} size={36} />

        <div style={{ flex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.90)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>{client.name}</p>
          {client.company && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>{client.company}</p>}
        </div>

        {/* Nav secundaria das outras pages */}
        <a href="/inicio" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, textDecoration: 'none', letterSpacing: '0.05em' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.60)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
          Level ↗
        </a>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '16px 28px 0',
        opacity: entered ? 1 : 0,
        transition: 'opacity 400ms ease 100ms',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: isActive ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.35)',
                transition: 'all 200ms',
              }}
            >
              <Icon style={{ width: 14, height: 14 }} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Conteudo */}
      <div style={{
        flex: 1, padding: '24px 28px 40px',
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 500ms ease 150ms, transform 500ms ease 150ms',
        maxWidth: 800,
      }}>
        {activeTab === 'overview' && (
          <TabOverview client={client} tasks={tasks} events={events} />
        )}
        {activeTab === 'tasks' && (
          <TabTasks client={client} tasks={tasks} upsertTask={upsertTask} deleteTask={deleteTask} />
        )}
        {activeTab === 'calendar' && (
          <TabCalendar client={client} events={events} createEvent={createEvent} deleteEvent={deleteEvent} />
        )}
        {activeTab === 'info' && (
          <TabInfo client={client} updateClient={updateClient} />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
