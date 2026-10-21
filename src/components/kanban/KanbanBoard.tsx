'use client'

import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, Clock, AlertCircle, User, Calendar, MoreHorizontal, X, CheckSquare, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useClients, useTaskList } from '@/hooks/useData'

type Priority = 'critical' | 'high' | 'normal' | 'low'
type Status = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'

interface CheckItem { id: string; text: string; done: boolean }
interface Card {
  id: string; title: string; client: string; category: string
  deadline?: string; estimatedMinutes?: number
  priority: Priority; status: Status; checklist: CheckItem[]; labels: string[]
}
interface Column { id: Status; title: string; cards: Card[] }

const priorityConfig = {
  critical: { label: 'Crítica',    color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  high:     { label: 'Alta',       color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  normal:   { label: 'Normal',     color: 'bg-black/5 text-black/50 border-black/10' },
  low:      { label: 'Baixa',      color: 'bg-black/5 text-black/30 border-black/10' },
}

const labelColors = [
  'bg-violet-500/20 text-violet-400', 'bg-blue-500/20 text-blue-400',
  'bg-green-500/20 text-green-400',   'bg-yellow-500/20 text-yellow-400',
  'bg-pink-500/20 text-pink-400',
]

const initialColumns: Column[] = [
  { id: 'backlog',     title: 'Backlog',      cards: [] },
  { id: 'todo',        title: 'A fazer',      cards: [] },
  { id: 'in_progress', title: 'Em andamento', cards: [] },
  { id: 'review',      title: 'Revisão',      cards: [] },
  { id: 'done',        title: 'Entregue',     cards: [] },
]

// ── Modal criar/editar ────────────────────────────────────────────────
function CardFormModal({
  initial, defaultStatus, columns, onClose, onSave, onDelete,
}: {
  initial?: Card
  defaultStatus: Status
  columns: Column[]
  onClose: () => void
  onSave: (card: Card) => void
  onDelete?: (id: string) => void
}) {
  const isEdit = !!initial
  const [title, setTitle]         = useState(initial?.title || '')
  const [client, setClient]       = useState(initial?.client || '')
  const [category, setCategory]   = useState(initial?.category || 'Geral')
  const [priority, setPriority]   = useState<Priority>(initial?.priority || 'normal')
  const [status, setStatus]       = useState<Status>(initial?.status || defaultStatus)
  const [deadline, setDeadline]   = useState(initial?.deadline || '')
  const [estHours, setEstHours]   = useState(initial?.estimatedMinutes ? String(initial.estimatedMinutes / 60) : '')
  const [labelInput, setLabelInput] = useState('')
  const [labels, setLabels]       = useState<string[]>(initial?.labels || [])
  const [checklist, setChecklist] = useState<CheckItem[]>(initial?.checklist || [])
  const [checkInput, setCheckInput] = useState('')
  const [error, setError]         = useState('')

  function addLabel() {
    if (!labelInput.trim() || labels.includes(labelInput.trim())) return
    setLabels(l => [...l, labelInput.trim()])
    setLabelInput('')
  }

  function addCheck() {
    if (!checkInput.trim()) return
    setChecklist(c => [...c, { id: Date.now().toString(), text: checkInput.trim(), done: false }])
    setCheckInput('')
  }

  function handleSave() {
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    if (!client.trim()) { setError('O cliente é obrigatório.'); return }
    setError('')
    const card: Card = {
      id: initial?.id || `card-${Date.now()}`,
      title: title.trim(),
      client: client.trim(),
      category: category.trim() || 'Geral',
      priority,
      status,
      deadline: deadline || undefined,
      estimatedMinutes: estHours ? Math.round(parseFloat(estHours) * 60) : undefined,
      labels,
      checklist,
    }
    onSave(card)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-black/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-black">{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</h2>
            <button onClick={onClose} className="text-black/30 hover:text-black transition-colors"><X className="w-5 h-5" /></button>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

          {/* Título */}
          <div>
            <label className="text-black/40 text-xs mb-1 block">Título *</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Ex: Editar vídeo do cliente X"
              className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30"
            />
          </div>

          {/* Cliente */}
          <div>
            <label className="text-black/40 text-xs mb-1 block">Cliente *</label>
            <input
              value={client}
              onChange={e => setClient(e.target.value)}
              placeholder="Nome do cliente"
              className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30"
            />
          </div>

          {/* Linha: categoria + prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-black/40 text-xs mb-1 block">Categoria</label>
              <input
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Ex: Edição, Captação..."
                className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30"
              />
            </div>
            <div>
              <label className="text-black/40 text-xs mb-1 block">Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm focus:outline-none focus:border-black/30"
              >
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
          </div>

          {/* Coluna + prazo + tempo */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-black/40 text-xs mb-1 block">Coluna</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Status)}
                className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm focus:outline-none focus:border-black/30"
              >
                {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-black/40 text-xs mb-1 block">Prazo</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm focus:outline-none focus:border-black/30"
              />
            </div>
            <div>
              <label className="text-black/40 text-xs mb-1 block">Horas est.</label>
              <input
                type="number"
                min="0.5" step="0.5"
                value={estHours}
                onChange={e => setEstHours(e.target.value)}
                placeholder="Ex: 2.5"
                className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30"
              />
            </div>
          </div>

          {/* Etiquetas */}
          <div>
            <label className="text-black/40 text-xs mb-1 block">Etiquetas</label>
            <div className="flex gap-2">
              <input
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                placeholder="Adicionar etiqueta..."
                className="flex-1 bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30"
              />
              <button onClick={addLabel} className="px-3 bg-black/10 hover:bg-black/20 rounded-xl text-black text-sm transition-colors">+</button>
            </div>
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {labels.map((l, i) => (
                  <span key={l} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${labelColors[i % labelColors.length]}`}>
                    {l}
                    <button onClick={() => setLabels(ls => ls.filter(x => x !== l))} className="opacity-60 hover:opacity-100">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Checklist */}
          <div>
            <label className="text-black/40 text-xs mb-1 block">Checklist</label>
            <div className="flex gap-2">
              <input
                value={checkInput}
                onChange={e => setCheckInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCheck())}
                placeholder="Adicionar item..."
                className="flex-1 bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30"
              />
              <button onClick={addCheck} className="px-3 bg-black/10 hover:bg-black/20 rounded-xl text-black text-sm transition-colors">+</button>
            </div>
            {checklist.length > 0 && (
              <div className="space-y-1 mt-2">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm text-black/60">
                    <span>•</span><span className="flex-1">{item.text}</span>
                    <button onClick={() => setChecklist(c => c.filter(x => x.id !== item.id))} className="text-black/20 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="flex-1 bg-black text-white font-medium rounded-xl py-2.5 text-sm hover:bg-black/90 transition-colors">
              {isEdit ? 'Salvar alterações' : 'Criar tarefa'}
            </button>
            {isEdit && onDelete && (
              <button
                onClick={() => { if (confirm('Excluir esta tarefa?')) { onDelete(initial!.id); onClose() } }}
                className="px-3 bg-red-50 hover:bg-red-100 text-red-400 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="px-4 bg-black/5 text-black rounded-xl py-2.5 text-sm hover:bg-black/10 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Card view modal ───────────────────────────────────────────────────
function CardViewModal({ card, onClose, onEdit }: { card: Card; onClose: () => void; onEdit: () => void }) {
  const done = card.checklist.filter(c => c.done).length
  const total = card.checklist.length
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-black/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-black/40 text-xs uppercase tracking-wider mb-1">{card.client}</p>
              <h2 className="text-black text-lg font-semibold">{card.title}</h2>
            </div>
            <button onClick={onClose} className="text-black/30 hover:text-black ml-4 transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-black/5 rounded-xl p-3">
              <p className="text-black/40 text-xs mb-1">Prioridade</p>
              <Badge className={`text-xs border ${priorityConfig[card.priority].color}`}>{priorityConfig[card.priority].label}</Badge>
            </div>
            <div className="bg-black/5 rounded-xl p-3">
              <p className="text-black/40 text-xs mb-1">Categoria</p>
              <p className="text-black text-sm">{card.category}</p>
            </div>
            {card.deadline && <div className="bg-black/5 rounded-xl p-3"><p className="text-black/40 text-xs mb-1">Prazo</p><p className="text-black text-sm">{card.deadline}</p></div>}
            {card.estimatedMinutes && <div className="bg-black/5 rounded-xl p-3"><p className="text-black/40 text-xs mb-1">Estimativa</p><p className="text-black text-sm">{Math.round(card.estimatedMinutes / 60 * 10) / 10}h</p></div>}
          </div>
          {card.labels.length > 0 && (
            <div className="mb-4">
              <p className="text-black/40 text-xs uppercase tracking-wider mb-2">Etiquetas</p>
              <div className="flex flex-wrap gap-1">{card.labels.map((l, i) => <span key={l} className={`text-xs px-2 py-0.5 rounded-full ${labelColors[i % labelColors.length]}`}>{l}</span>)}</div>
            </div>
          )}
          {total > 0 && (
            <div className="mb-4">
              <p className="text-black/40 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5" /> Checklist ({done}/{total})</p>
              <div className="w-full bg-black/5 rounded-full h-1 mb-2"><div className="bg-black h-1 rounded-full" style={{ width: `${(done / total) * 100}%` }} /></div>
              <div className="space-y-1">{card.checklist.map(item => <div key={item.id} className="flex items-center gap-2 text-sm"><span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${item.done ? 'bg-black border-black' : 'border-black/20'}`}>{item.done && <span className="text-white text-xs">✓</span>}</span><span className={item.done ? 'text-black/30 line-through' : 'text-black'}>{item.text}</span></div>)}</div>
            </div>
          )}
          <button onClick={onEdit} className="w-full bg-black text-white font-medium rounded-xl py-2.5 text-sm hover:bg-black/90 transition-colors">Editar tarefa</button>
        </div>
      </div>
    </div>
  )
}

// ── KanbanCard ────────────────────────────────────────────────────────
function KanbanCard({ card, index, onOpen }: { card: Card; index: number; onOpen: (card: Card) => void }) {
  const [isOverdue, setIsOverdue] = useState(false)
  useEffect(() => {
    if (card.deadline && card.status !== 'done') setIsOverdue(new Date(card.deadline) < new Date())
  }, [card.deadline, card.status])
  const done = card.checklist.filter(c => c.done).length
  const total = card.checklist.length

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
          onClick={() => onOpen(card)}
          className={`bg-black/5 border rounded-xl p-3 cursor-pointer transition-all select-none ${snapshot.isDragging ? 'border-black/30 shadow-2xl scale-105' : 'border-black/5 hover:border-black/15 hover:bg-black/8'}`}
        >
          {card.labels.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{card.labels.map((l, i) => <span key={l} className={`text-xs px-1.5 py-0.5 rounded-full ${labelColors[i % labelColors.length]}`}>{l}</span>)}</div>}
          <p className="text-black text-sm font-medium leading-snug mb-2">{card.title}</p>
          <div className="flex items-center gap-1.5 mb-2"><User className="w-3 h-3 text-black/30" /><span className="text-black/40 text-xs">{card.client}</span></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={`text-xs border ${priorityConfig[card.priority].color}`}>{priorityConfig[card.priority].label}</Badge>
              {total > 0 && <span className="text-black/30 text-xs flex items-center gap-1"><CheckSquare className="w-3 h-3" />{done}/{total}</span>}
            </div>
            {card.deadline && (
              <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : 'text-black/30'}`}>
                {isOverdue && <AlertCircle className="w-3 h-3" />}
                <Calendar className="w-3 h-3" />{card.deadline?.slice(8, 10)}/{card.deadline?.slice(5, 7)}
              </div>
            )}
          </div>
          {card.estimatedMinutes && <div className="flex items-center gap-1 mt-2"><Clock className="w-3 h-3 text-black/20" /><span className="text-black/45 text-xs">{Math.round(card.estimatedMinutes / 60 * 10) / 10}h est.</span></div>}
        </div>
      )}
    </Draggable>
  )
}

// ── KanbanBoard principal ─────────────────────────────────────────────
export function KanbanBoard() {
  const [columns, setColumns]       = useState<Column[]>(initialColumns)
  const [viewCard, setViewCard]     = useState<Card | null>(null)
  const [editCard, setEditCard]     = useState<Card | null>(null)
  const [creating, setCreating]     = useState(false)
  const [defaultCol, setDefaultCol] = useState<Status>('todo')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [loaded, setLoaded]         = useState(false)
  const [saveError, setSaveError]   = useState('')

  const { clients } = useClients()
  const { upsertTask, deleteTask: deleteTaskRecord } = useTaskList()

  // Carrega do Supabase
  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(d => {
        if (d.columns && Array.isArray(d.columns) && d.columns.length > 0) setColumns(d.columns)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const firstLoadRef = useRef(false)

  // Salva no Supabase após cada mudança (não no load inicial)
  useEffect(() => {
    if (!loaded) return
    if (!firstLoadRef.current) { firstLoadRef.current = true; return } // pula a primeira renderização após load
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columns }),
    })
      .then(r => r.json())
      .then(d => { if (d.error) { setSaveError('Erro ao salvar') } else { setSaveError('') } })
      .catch(() => setSaveError('Sem conexão'))
  }, [columns, loaded])

  // Sincronia bidirecional: quando kanban muda, atualiza task list global
  function syncToDataLayer(card: Card) {
    const client = clients.find(c => c.name.toLowerCase() === card.client.toLowerCase())
    upsertTask({
      id: card.id,
      title: card.title,
      clientId: client?.id,
      clientName: card.client,
      status: card.status,
      priority: card.priority,
      category: card.category,
      deadline: card.deadline,
      estimatedMinutes: card.estimatedMinutes,
      labels: card.labels,
      createdAt: new Date().toISOString(),
    })
  }

  function saveCard(card: Card) {
    setColumns(prev => {
      const withoutCard = prev.map(col => ({ ...col, cards: col.cards.filter(c => c.id !== card.id) }))
      return withoutCard.map(col =>
        col.id === card.status ? { ...col, cards: [...col.cards, card] } : col
      )
    })
    syncToDataLayer(card)
  }

  function deleteCard(id: string) {
    setColumns(prev => prev.map(col => ({ ...col, cards: col.cards.filter(c => c.id !== id) })))
    deleteTaskRecord(id)
  }

  function onDragEnd(result: DropResult) {
    const { source, destination } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return
    const sourceCol = columns.find(c => c.id === source.droppableId)!
    const destCol   = columns.find(c => c.id === destination.droppableId)!
    const card      = { ...sourceCol.cards[source.index], status: destination.droppableId as Status }
    setColumns(prev => prev.map(col => {
      if (col.id === source.droppableId && col.id === destination.droppableId) {
        const cards = [...col.cards]; cards.splice(source.index, 1); cards.splice(destination.index, 0, card); return { ...col, cards }
      }
      if (col.id === source.droppableId) { const cards = [...col.cards]; cards.splice(source.index, 1); return { ...col, cards } }
      if (col.id === destination.droppableId) { const cards = [...col.cards]; cards.splice(destination.index, 0, card); return { ...col, cards } }
      return col
    }))
  }

  const filteredColumns = columns.map(col => ({
    ...col,
    cards: filterPriority === 'all' ? col.cards : col.cards.filter(c => c.priority === filterPriority),
  }))
  const totalCards = columns.reduce((acc, col) => acc + col.cards.length, 0)

  function openNew(colId: Status = 'todo') {
    setDefaultCol(colId)
    setCreating(true)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-black tracking-tight">Kanban</h1>
          <p className="text-black/40 text-sm mt-0.5">
            {totalCards} {totalCards === 1 ? 'tarefa' : 'tarefas'} no board
            {saveError && <span className="text-red-400 ml-2 text-xs">· {saveError}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-black/5 rounded-xl p-1">
            {(['all', 'critical', 'high', 'normal', 'low'] as const).map(p => (
              <button key={p} onClick={() => setFilterPriority(p)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${filterPriority === p ? 'bg-black text-white font-medium' : 'text-black/40 hover:text-black'}`}>
                {p === 'all' ? 'Todas' : priorityConfig[p].label}
              </button>
            ))}
          </div>
          <button
            onClick={() => openNew('todo')}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-black/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova tarefa
          </button>
        </div>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {filteredColumns.map(col => (
            <div key={col.id} className="flex-shrink-0 w-72">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-black text-sm font-medium">{col.title}</span>
                  <span className="text-black/30 text-xs bg-black/5 rounded-full px-2 py-0.5">{col.cards.length}</span>
                </div>
                <button onClick={() => openNew(col.id)} className="text-black/30 hover:text-black transition-colors" title="Adicionar tarefa nesta coluna">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef} {...provided.droppableProps}
                    className={`space-y-2 min-h-20 rounded-xl p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-black/5' : ''}`}
                  >
                    {col.cards.map((card, index) => (
                      <KanbanCard key={card.id} card={card} index={index} onOpen={setViewCard} />
                    ))}
                    {provided.placeholder}
                    <button
                      onClick={() => openNew(col.id)}
                      className="w-full flex items-center gap-2 text-black/30 hover:text-black/60 text-sm py-2 px-3 rounded-xl hover:bg-black/5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar tarefa
                    </button>
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Modal visualizar */}
      {viewCard && !editCard && (
        <CardViewModal
          card={viewCard}
          onClose={() => setViewCard(null)}
          onEdit={() => { setEditCard(viewCard); setViewCard(null) }}
        />
      )}

      {/* Modal editar */}
      {editCard && (
        <CardFormModal
          initial={editCard}
          defaultStatus={editCard.status}
          columns={columns}
          onClose={() => setEditCard(null)}
          onSave={saveCard}
          onDelete={deleteCard}
        />
      )}

      {/* Modal criar */}
      {creating && (
        <CardFormModal
          defaultStatus={defaultCol}
          columns={columns}
          onClose={() => setCreating(false)}
          onSave={saveCard}
        />
      )}
    </div>
  )
}
