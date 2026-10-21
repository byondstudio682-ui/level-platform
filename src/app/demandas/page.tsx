'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { PageEnter } from '@/components/layout/PageEnter'
import { Plus, X, Check, Trash2, Filter, Clock, AlertCircle, ChevronDown } from 'lucide-react'

type Priority = 'critical' | 'high' | 'normal' | 'low'
type Status = 'pending' | 'in_progress' | 'completed'
type ProductionType = 'edição' | 'captação' | 'roteiro' | 'motion' | 'reunião' | 'entrega'

interface Demand {
  id: string
  title: string
  clientName?: string
  type: ProductionType
  deadline?: string
  priority: Priority
  deliverables: number
  estimatedMinutes: number
  status: Status
  notes?: string
  createdAt: string
}

interface Client { id: string; name: string }

const TIME_TABLE: Record<ProductionType, number> = {
  edição: 120, captação: 180, roteiro: 90,
  motion: 240, reunião: 60, entrega: 30,
}

const PRIORITY_LABELS: Record<Priority, { label: string; color: string; bg: string }> = {
  critical: { label: 'Crítico',  color: 'rgba(200,40,40,0.85)',  bg: 'rgba(200,40,40,0.08)' },
  high:     { label: 'Alto',     color: 'rgba(200,100,0,0.85)',  bg: 'rgba(200,100,0,0.08)' },
  normal:   { label: 'Normal',   color: 'rgba(0,0,0,0.45)',      bg: 'rgba(0,0,0,0.05)' },
  low:      { label: 'Baixo',    color: 'rgba(0,130,60,0.85)',   bg: 'rgba(0,130,60,0.08)' },
}

const STATUS_LABELS: Record<Status, string> = {
  pending: 'Pendente', in_progress: 'Em andamento', completed: 'Concluída',
}

function formatMinutes(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function isOverdue(deadline?: string) {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

function daysUntil(deadline?: string) {
  if (!deadline) return null
  const diff = new Date(deadline).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function DemandasPage() {
  const [demands, setDemands]   = useState<Demand[]>([])
  const [clients, setClients]   = useState<Client[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [saving, setSaving]     = useState(false)

  // Form state
  const [form, setForm] = useState({
    title: '', clientName: '', type: 'edição' as ProductionType,
    deadline: '', priority: 'normal' as Priority,
    deliverables: 1, notes: '',
  })

  const estimatedMinutes = TIME_TABLE[form.type] * form.deliverables

  const load = useCallback(async () => {
    setLoading(true)
    const [demandsRes, clientsRes] = await Promise.all([
      fetch('/api/data?type=demands'),
      fetch('/api/data?type=clients'),
    ])
    const demandsData = await demandsRes.json()
    const clientsData = await clientsRes.json()
    setDemands(demandsData.data || [])
    setClients(clientsData.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createDemand() {
    if (!form.title.trim()) return
    setSaving(true)
    const record: Partial<Demand> = {
      title: form.title.trim(),
      clientName: form.clientName || undefined,
      type: form.type,
      deadline: form.deadline || undefined,
      priority: form.priority,
      deliverables: form.deliverables,
      estimatedMinutes,
      status: 'pending',
      notes: form.notes || undefined,
    }
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'demands', action: 'create', record }),
    })
    // Se tem prazo, cria evento no calendário automaticamente
    if (form.deadline) {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'events', action: 'create',
          record: {
            title: `📋 ${form.title.trim()}`,
            date: form.deadline,
            clientName: form.clientName || undefined,
            description: `Entrega: ${STATUS_LABELS['pending']} | ${formatMinutes(estimatedMinutes)}`,
          },
        }),
      })
    }
    setForm({ title: '', clientName: '', type: 'edição', deadline: '', priority: 'normal', deliverables: 1, notes: '' })
    setShowModal(false)
    setSaving(false)
    load()
  }

  async function updateStatus(id: string, status: Status) {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'demands', action: 'update', record: { id, status } }),
    })
    setDemands(prev => prev.map(d => d.id === id ? { ...d, status } : d))
  }

  async function deleteDemand(id: string) {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'demands', action: 'delete', record: { id } }),
    })
    setDemands(prev => prev.filter(d => d.id !== id))
  }

  const filtered = demands
    .filter(d => filterStatus === 'all' || d.status === filterStatus)
    .filter(d => filterPriority === 'all' || d.priority === filterPriority)
    .sort((a, b) => {
      const pOrder: Record<Priority, number> = { critical: 0, high: 1, normal: 2, low: 3 }
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority]
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      return 0
    })

  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <main className="pt-14 p-6 max-w-3xl mx-auto">
        <PageEnter>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-black/80 tracking-tight">Demandas</h1>
              <p className="text-xs text-black/30 mt-0.5">{demands.filter(d => d.status !== 'completed').length} ativas</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova demanda
            </button>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-black/30" />
            {(['all', 'pending', 'in_progress', 'completed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="px-3 py-1 rounded-full text-xs transition-all"
                style={{
                  background: filterStatus === s ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.05)',
                  color: filterStatus === s ? 'white' : 'rgba(0,0,0,0.50)',
                }}
              >
                {s === 'all' ? 'Todas' : STATUS_LABELS[s]}
              </button>
            ))}
            <span className="w-px h-4 bg-black/10" />
            {(['all', 'critical', 'high', 'normal', 'low'] as const).map(p => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className="px-3 py-1 rounded-full text-xs transition-all"
                style={{
                  background: filterPriority === p ? (p === 'all' ? 'rgba(0,0,0,0.85)' : PRIORITY_LABELS[p as Priority].bg) : 'rgba(0,0,0,0.05)',
                  color: filterPriority === p ? (p === 'all' ? 'white' : PRIORITY_LABELS[p as Priority].color) : 'rgba(0,0,0,0.50)',
                  border: filterPriority === p && p !== 'all' ? `1px solid ${PRIORITY_LABELS[p as Priority].color}30` : '1px solid transparent',
                }}
              >
                {p === 'all' ? 'Prioridade' : PRIORITY_LABELS[p as Priority].label}
              </button>
            ))}
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-5 h-5 rounded-full border-2 border-black/20 border-t-black/60 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-black/25 text-sm">Nenhuma demanda encontrada</p>
              <button onClick={() => setShowModal(true)} className="mt-3 text-black/40 text-xs hover:text-black/70 transition-colors">
                + criar nova
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(d => {
                const p = PRIORITY_LABELS[d.priority]
                const days = daysUntil(d.deadline)
                const overdue = isOverdue(d.deadline) && d.status !== 'completed'
                return (
                  <div
                    key={d.id}
                    className="rounded-2xl p-4 border transition-all"
                    style={{
                      background: d.status === 'completed' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.04)',
                      border: overdue ? '1px solid rgba(200,40,40,0.20)' : '1px solid rgba(0,0,0,0.08)',
                      opacity: d.status === 'completed' ? 0.55 : 1,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Título + badges */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-sm font-medium tracking-tight ${d.status === 'completed' ? 'line-through text-black/40' : 'text-black/80'}`}>
                            {d.title}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: p.bg, color: p.color }}
                          >
                            {p.label}
                          </span>
                          {overdue && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-500">
                              <AlertCircle className="w-2.5 h-2.5" /> Atrasada
                            </span>
                          )}
                        </div>
                        {/* Meta info */}
                        <div className="flex items-center gap-3 text-xs text-black/35 flex-wrap">
                          {d.clientName && <span>{d.clientName}</span>}
                          <span className="capitalize">{d.type}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatMinutes(d.estimatedMinutes)}
                          </span>
                          {d.deadline && (
                            <span style={{ color: overdue ? 'rgba(200,40,40,0.70)' : days !== null && days <= 3 ? 'rgba(200,100,0,0.70)' : undefined }}>
                              {overdue
                                ? `Prazo: ${new Date(d.deadline).toLocaleDateString('pt-BR')}`
                                : days === 0 ? 'Vence hoje'
                                : days === 1 ? 'Vence amanhã'
                                : `${days}d`}
                            </span>
                          )}
                          <span className="text-black/20">{STATUS_LABELS[d.status]}</span>
                        </div>
                      </div>
                      {/* Ações */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {d.status !== 'completed' && (
                          <button
                            onClick={() => updateStatus(d.id, d.status === 'pending' ? 'in_progress' : 'completed')}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors"
                            title={d.status === 'pending' ? 'Iniciar' : 'Concluir'}
                          >
                            <Check className="w-3.5 h-3.5 text-black/50" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteDemand(d.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-black/30 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </PageEnter>
      </main>

      {/* Modal Nova Demanda */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6"
            style={{ background: 'white', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-black/80">Nova demanda</h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-full bg-black/06 flex items-center justify-center hover:bg-black/10 transition-colors">
                <X className="w-4 h-4 text-black/50" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Título */}
              <input
                className="w-full px-4 py-3 rounded-xl bg-black/05 border border-black/08 text-sm text-black/80 placeholder:text-black/25 outline-none focus:border-black/20 transition-colors"
                placeholder="Título da demanda *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />

              {/* Cliente */}
              <div className="relative">
                <select
                  className="w-full px-4 py-3 rounded-xl bg-black/05 border border-black/08 text-sm text-black/80 outline-none focus:border-black/20 transition-colors appearance-none"
                  value={form.clientName}
                  onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                >
                  <option value="">Sem cliente</option>
                  {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 pointer-events-none" />
              </div>

              {/* Tipo + Prioridade */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-black/05 border border-black/08 text-sm text-black/80 outline-none focus:border-black/20 transition-colors appearance-none"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as ProductionType }))}
                  >
                    {Object.keys(TIME_TABLE).map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-black/05 border border-black/08 text-sm text-black/80 outline-none focus:border-black/20 transition-colors appearance-none"
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                  >
                    {(Object.entries(PRIORITY_LABELS) as [Priority, typeof PRIORITY_LABELS[Priority]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 pointer-events-none" />
                </div>
              </div>

              {/* Entregáveis + Prazo */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-black/30 mb-1 block pl-1">Entregáveis</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full px-4 py-3 rounded-xl bg-black/05 border border-black/08 text-sm text-black/80 outline-none focus:border-black/20 transition-colors"
                    value={form.deliverables}
                    onChange={e => setForm(f => ({ ...f, deliverables: Math.max(1, Number(e.target.value)) }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-black/30 mb-1 block pl-1">Prazo</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl bg-black/05 border border-black/08 text-sm text-black/80 outline-none focus:border-black/20 transition-colors"
                    value={form.deadline}
                    onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  />
                </div>
              </div>

              {/* Tempo estimado (read-only) */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/03 border border-black/06">
                <Clock className="w-3.5 h-3.5 text-black/30" />
                <span className="text-xs text-black/40">Tempo estimado:</span>
                <span className="text-xs font-medium text-black/60">{formatMinutes(estimatedMinutes)}</span>
              </div>

              {/* Notas */}
              <textarea
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-black/05 border border-black/08 text-sm text-black/80 placeholder:text-black/25 outline-none focus:border-black/20 transition-colors resize-none"
                placeholder="Observações (opcional)"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />

              {/* Botão criar */}
              <button
                onClick={createDemand}
                disabled={!form.title.trim() || saving}
                className="w-full py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Criando...' : 'Criar demanda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
