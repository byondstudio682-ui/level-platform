'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Clock, User } from 'lucide-react'
import { useEvents, type CalendarEvent } from '@/hooks/useData'

type Priority = 'critical' | 'high' | 'normal' | 'low'

interface Task {
  id: string
  title: string
  client: string
  date: string // YYYY-MM-DD
  priority: Priority
  estimatedMinutes?: number
  category?: string
}

const priorityConfig = {
  critical: { color: 'bg-red-500', light: 'bg-red-500/15 text-red-400 border-red-500/20' },
  high: { color: 'bg-orange-400', light: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  normal: { color: 'bg-blue-400', light: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  low: { color: 'bg-black/20', light: 'bg-black/5 text-black/40 border-black/10' },
}

const priorityLabels = { critical: 'Crítica', high: 'Alta', normal: 'Normal', low: 'Baixa' }

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const initialTasks: Task[] = []

interface DayModalProps {
  date: string
  tasks: Task[]
  onClose: () => void
  onAdd: (task: Omit<Task, 'id'>) => void
  onDelete: (id: string) => void
}

function DayModal({ date, tasks, onClose, onAdd, onDelete }: DayModalProps) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', client: '', priority: 'normal' as Priority, estimatedMinutes: 60, category: '' })

  const dateObj = new Date(date + 'T12:00:00')
  const label = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  function handleAdd() {
    if (!form.title.trim()) return
    onAdd({ ...form, date })
    setForm({ title: '', client: '', priority: 'normal', estimatedMinutes: 60, category: '' })
    setAdding(false)
  }

  const totalHours = tasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0) / 60

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-black/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-black font-semibold capitalize">{label}</p>
              {tasks.length > 0 && (
                <p className="text-black/40 text-xs mt-0.5">{tasks.length} tarefa{tasks.length > 1 ? 's' : ''} · {totalHours.toFixed(1)}h estimadas</p>
              )}
            </div>
            <button onClick={onClose} className="text-black/30 hover:text-black transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de carga */}
          {totalHours > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-black/30 mb-1">
                <span>Carga do dia</span>
                <span className={totalHours > 8 ? 'text-red-400' : totalHours > 6 ? 'text-orange-400' : 'text-green-400'}>
                  {totalHours.toFixed(1)}h / 8h
                </span>
              </div>
              <div className="w-full bg-black/5 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${totalHours > 8 ? 'bg-red-500' : totalHours > 6 ? 'bg-orange-400' : 'bg-green-400'}`}
                  style={{ width: `${Math.min((totalHours / 8) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Tarefas */}
          <div className="space-y-2 mb-4">
            {tasks.length === 0 && !adding && (
              <p className="text-black/45 text-sm text-center py-4">Nenhuma tarefa neste dia</p>
            )}
            {tasks.map(task => (
              <div key={task.id} className={`flex items-start gap-3 p-3 rounded-xl border ${priorityConfig[task.priority].light}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-black text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.client && <span className="text-xs opacity-60 flex items-center gap-1"><User className="w-3 h-3" />{task.client}</span>}
                    {task.estimatedMinutes && <span className="text-xs opacity-60 flex items-center gap-1"><Clock className="w-3 h-3" />{task.estimatedMinutes}min</span>}
                  </div>
                </div>
                <button onClick={() => onDelete(task.id)} className="text-black/45 hover:text-black/60 transition-colors flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Form adicionar */}
          {adding ? (
            <div className="bg-black/5 border border-black/10 rounded-xl p-4 space-y-3">
              <input
                autoFocus
                placeholder="Nome da tarefa *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-transparent border-b border-black/10 pb-2 text-black text-sm placeholder:text-black/20 focus:outline-none focus:border-black/30"
              />
              <input
                placeholder="Cliente"
                value={form.client}
                onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                className="w-full bg-transparent border-b border-black/10 pb-2 text-black text-sm placeholder:text-black/20 focus:outline-none focus:border-black/30"
              />
              <div className="flex gap-3">
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                  className="flex-1 bg-black/5 border border-black/10 rounded-lg px-3 py-1.5 text-black text-sm focus:outline-none"
                >
                  <option value="critical">Crítica</option>
                  <option value="high">Alta</option>
                  <option value="normal">Normal</option>
                  <option value="low">Baixa</option>
                </select>
                <input
                  type="number"
                  placeholder="Min"
                  value={form.estimatedMinutes}
                  onChange={e => setForm(f => ({ ...f, estimatedMinutes: Number(e.target.value) }))}
                  className="w-20 bg-black/5 border border-black/10 rounded-lg px-3 py-1.5 text-black text-sm focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} className="flex-1 bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-black/90 transition-colors">
                  Adicionar
                </button>
                <button onClick={() => setAdding(false)} className="px-4 bg-black/5 text-black rounded-lg py-2 text-sm hover:bg-black/10 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-black/10 rounded-xl text-black/40 hover:text-black hover:border-black/20 text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Adicionar tarefa
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MonthView({ year, month, tasks, onDayClick, todayStr }: {
  year: number, month: number, tasks: Task[], onDayClick: (date: string) => void, todayStr: string
}) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const [ty, tm, td] = todayStr.split('-').map(Number)

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="bg-black/3 border border-black/8 rounded-2xl p-4">
      <h3 className="text-black/60 text-xs font-medium uppercase tracking-widest mb-3">{MONTHS[month]}</h3>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-black/45 text-xs py-1">{d[0]}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayTasks = tasks.filter(t => t.date === dateStr)
          const isToday = ty === year && (tm - 1) === month && td === day
          const hasCritical = dayTasks.some(t => t.priority === 'critical')
          const hasHigh = dayTasks.some(t => t.priority === 'high')
          const totalH = dayTasks.reduce((a, t) => a + (t.estimatedMinutes || 0), 0) / 60
          const isOverloaded = totalH > 8

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              className={`relative aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-xs transition-all hover:bg-black/10 group ${
                isToday ? 'bg-black text-white font-bold' : 'text-black/60 hover:text-black'
              } ${dayTasks.length > 0 ? 'ring-1 ring-white/10' : ''}`}
            >
              <span className={isToday ? 'text-white' : ''}>{day}</span>
              {dayTasks.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {dayTasks.slice(0, 3).map((t, ti) => (
                    <span key={ti} className={`w-1 h-1 rounded-full ${priorityConfig[t.priority].color}`} />
                  ))}
                  {dayTasks.length > 3 && <span className="text-black/30" style={{fontSize: '8px'}}>+{dayTasks.length - 3}</span>}
                </div>
              )}
              {isOverloaded && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" title="Dia sobrecarregado" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function YearCalendar() {
  const { events, createEvent, deleteEvent } = useEvents()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [year, setYear] = useState(2026)
  const [view, setView] = useState<'year' | 'month'>('year')
  const [currentMonth, setCurrentMonth] = useState(9)
  const [todayDynamic, setTodayDynamic] = useState('2026-10-15')
  useEffect(() => {
    const now = new Date()
    setYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
    setTodayDynamic(now.toISOString().slice(0, 10))
  }, [])

  // Mapeia eventos para o formato Task esperado pelo calendário visual
  const tasks: Task[] = events.map(e => ({
    id: e.id,
    title: e.title,
    client: e.clientName || '',
    date: e.date,
    priority: 'normal' as Priority,
    estimatedMinutes: 60,
    category: e.description || '',
  }))

  const selectedTasks = selectedDate ? tasks.filter(t => t.date === selectedDate) : []

  function addTask(task: Omit<Task, 'id'>) {
    createEvent({
      title: task.title,
      date: task.date,
      clientName: task.client,
      description: task.category,
    })
  }

  function deleteTask(id: string) {
    deleteEvent(id)
  }

  const totalTasks = tasks.length
  const criticalCount = tasks.filter(t => t.priority === 'critical').length
  const totalHours = tasks.reduce((a, t) => a + (t.estimatedMinutes || 0), 0) / 60

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-black tracking-tight">Calendário</h1>
          <p className="text-black/40 text-sm mt-0.5">{totalTasks} tarefas · {totalHours.toFixed(0)}h estimadas · {criticalCount} críticas</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex gap-1 bg-black/5 rounded-xl p-1">
            <button onClick={() => setView('year')} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${view === 'year' ? 'bg-black text-white font-medium' : 'text-black/40 hover:text-black'}`}>Ano</button>
            <button onClick={() => setView('month')} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${view === 'month' ? 'bg-black text-white font-medium' : 'text-black/40 hover:text-black'}`}>Mês</button>
          </div>
          {/* Year nav */}
          <div className="flex items-center gap-2 bg-black/5 rounded-xl px-3 py-2">
            <button onClick={() => setYear(y => y - 1)} className="text-black/40 hover:text-black transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-black text-sm font-medium w-12 text-center">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="text-black/40 hover:text-black transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mb-5 flex-shrink-0">
        {Object.entries(priorityConfig).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${val.color}`} />
            <span className="text-black/30 text-xs">{priorityLabels[key as Priority]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-4">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-black/30 text-xs">Sobrecarga (+8h)</span>
        </div>
      </div>

      {/* Calendário */}
      {view === 'year' ? (
        <div className="grid grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto flex-1">
          {Array.from({ length: 12 }, (_, m) => (
            <MonthView
              key={m}
              year={year}
              month={m}
              tasks={tasks}
              onDayClick={setSelectedDate}
              todayStr={todayDynamic}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setCurrentMonth(m => m === 0 ? 11 : m - 1)} className="text-black/40 hover:text-black transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="text-black font-semibold">{MONTHS[currentMonth]} {year}</h2>
            <button onClick={() => setCurrentMonth(m => m === 11 ? 0 : m + 1)} className="text-black/40 hover:text-black transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="max-w-lg">
            <MonthView year={year} month={currentMonth} tasks={tasks} onDayClick={setSelectedDate} todayStr={todayDynamic} />
          </div>
          {/* Lista do mês */}
          <div className="mt-6 space-y-2">
            {tasks
              .filter(t => {
                const d = new Date(t.date + 'T12:00:00')
                return d.getFullYear() === year && d.getMonth() === currentMonth
              })
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(task => (
                <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border ${priorityConfig[task.priority].light}`}>
                  <div className={`w-1 h-8 rounded-full ${priorityConfig[task.priority].color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-black text-sm font-medium truncate">{task.title}</p>
                    <p className="text-black/30 text-xs">{task.client} · {new Date(task.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                  </div>
                  {task.estimatedMinutes && (
                    <span className="text-black/30 text-xs flex-shrink-0">{task.estimatedMinutes}min</span>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Modal do dia */}
      {selectedDate && (
        <DayModal
          date={selectedDate}
          tasks={selectedTasks}
          onClose={() => setSelectedDate(null)}
          onAdd={addTask}
          onDelete={deleteTask}
        />
      )}
    </div>
  )
}
