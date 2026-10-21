'use client'

import { useState } from 'react'
import { Plus, X, User, Mail, Phone, Building, Edit2, Trash2, CheckSquare, Calendar } from 'lucide-react'
import { useClients, useTaskList, useEvents, type Client } from '@/hooks/useData'
import { PageEnter } from '@/components/layout/PageEnter'

const COLORS = [
  'bg-violet-500/10 border-violet-500/20',
  'bg-amber-500/10 border-amber-500/20',
  'bg-blue-500/10 border-blue-500/20',
  'bg-green-500/10 border-green-500/20',
  'bg-pink-500/10 border-pink-500/20',
  'bg-cyan-500/10 border-cyan-500/20',
  'bg-orange-500/10 border-orange-500/20',
]
const DOTS = ['bg-violet-400','bg-amber-400','bg-blue-400','bg-green-400','bg-pink-400','bg-cyan-400','bg-orange-400']

function ClientForm({ initial, onSave, onClose }: {
  initial?: Client
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [name,    setName]    = useState(initial?.name    || '')
  const [email,   setEmail]   = useState(initial?.email   || '')
  const [phone,   setPhone]   = useState(initial?.phone   || '')
  const [company, setCompany] = useState(initial?.company || '')
  const [notes,   setNotes]   = useState(initial?.notes   || '')
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)

  async function handleSave() {
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    setSaving(true)
    await onSave({ name: name.trim(), email, phone, company, notes, ...(initial?.id ? { id: initial.id } : {}) })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-black/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-black">{initial ? 'Editar cliente' : 'Novo cliente'}</h2>
            <button onClick={onClose} className="text-black/30 hover:text-black transition-colors"><X className="w-5 h-5" /></button>
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          <div>
            <label className="text-black/40 text-xs mb-1 block">Nome *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="Nome do cliente" onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-black/40 text-xs mb-1 block">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@..."
                className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30" />
            </div>
            <div>
              <label className="text-black/40 text-xs mb-1 block">Telefone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 9..."
                className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30" />
            </div>
          </div>
          <div>
            <label className="text-black/40 text-xs mb-1 block">Empresa</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Nome da empresa"
              className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30" />
          </div>
          <div>
            <label className="text-black/40 text-xs mb-1 block">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Notas sobre o cliente..."
              className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/30 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-black text-white font-medium rounded-xl py-2.5 text-sm hover:bg-black/90 transition-colors disabled:opacity-50">
              {saving ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar cliente'}
            </button>
            <button onClick={onClose} className="px-4 bg-black/5 text-black rounded-xl py-2.5 text-sm hover:bg-black/10 transition-colors">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClientDetail({ client, colorIdx, onEdit, onDelete, onBack }: {
  client: Client; colorIdx: number; onEdit: () => void; onDelete: () => void; onBack: () => void
}) {
  const { tasks }  = useTaskList()
  const { events } = useEvents()
  const myTasks  = tasks.filter(t => t.clientId === client.id || t.clientName?.toLowerCase() === client.name.toLowerCase())
  const myEvents = events.filter(e => e.clientId === client.id || e.clientName?.toLowerCase() === client.name.toLowerCase())

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-black/40 hover:text-black text-sm transition-colors">← Clientes</button>
        <div className="flex-1" />
        <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 hover:bg-black/10 rounded-xl text-black/60 text-sm transition-colors"><Edit2 className="w-3.5 h-3.5" /> Editar</button>
        <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-xl text-red-400 text-sm transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>

      {/* Header */}
      <div className={`rounded-2xl border p-5 ${COLORS[colorIdx % COLORS.length]}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${DOTS[colorIdx % DOTS.length]} bg-opacity-20 flex items-center justify-center`}>
            <User className="w-5 h-5 text-black/60" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black">{client.name}</h2>
            {client.company && <p className="text-black/40 text-sm">{client.company}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-black/50">
          {client.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{client.email}</span>}
          {client.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{client.phone}</span>}
        </div>
        {client.notes && <p className="mt-3 text-black/50 text-sm">{client.notes}</p>}
      </div>

      {/* Tarefas vinculadas */}
      <div>
        <h3 className="text-black/60 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5" /> Tarefas ({myTasks.length})
        </h3>
        {myTasks.length === 0
          ? <p className="text-black/25 text-sm">Nenhuma tarefa vinculada</p>
          : <div className="space-y-2">
              {myTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-black/5 rounded-xl px-4 py-2.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.priority === 'critical' ? 'bg-red-400' : t.priority === 'high' ? 'bg-orange-400' : 'bg-black/20'}`} />
                  <span className="text-black/70 text-sm flex-1">{t.title}</span>
                  <span className="text-black/30 text-xs bg-black/5 px-2 py-0.5 rounded-full">{t.status}</span>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Eventos vinculados */}
      <div>
        <h3 className="text-black/60 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" /> Compromissos ({myEvents.length})
        </h3>
        {myEvents.length === 0
          ? <p className="text-black/25 text-sm">Nenhum compromisso agendado</p>
          : <div className="space-y-2">
              {myEvents.map(e => (
                <div key={e.id} className="flex items-center gap-3 bg-black/5 rounded-xl px-4 py-2.5">
                  <span className="text-black/70 text-sm flex-1">{e.title}</span>
                  <span className="text-black/30 text-xs">{e.date}{e.time ? ` · ${e.time}` : ''}</span>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}

export function ClientesClient() {
  const { clients, loading, createClient, updateClient, deleteClient } = useClients()
  const { tasks }  = useTaskList()
  const { events } = useEvents()
  const [showForm, setShowForm]   = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [selected, setSelected]   = useState<Client | null>(null)
  const [search, setSearch]       = useState('')

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  )

  function getTaskCount(c: Client) {
    return tasks.filter(t => t.clientId === c.id || t.clientName?.toLowerCase() === c.name.toLowerCase()).length
  }
  function getEventCount(c: Client) {
    return events.filter(e => e.clientId === c.id || e.clientName?.toLowerCase() === c.name.toLowerCase()).length
  }

  if (selected) {
    const idx = clients.findIndex(c => c.id === selected.id)
    return (
      <PageEnter>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h1 className="text-2xl font-semibold text-black tracking-tight">Clientes</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ClientDetail
              client={selected}
              colorIdx={idx}
              onEdit={() => setEditClient(selected)}
              onDelete={async () => { await deleteClient(selected.id); setSelected(null) }}
              onBack={() => setSelected(null)}
            />
          </div>
        </div>
        {editClient && (
          <ClientForm
            initial={editClient}
            onSave={async data => { await updateClient(data); setSelected({ ...selected, ...data }) }}
            onClose={() => setEditClient(null)}
          />
        )}
      </PageEnter>
    )
  }

  return (
    <PageEnter className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-black tracking-tight">Clientes</h1>
          <p className="text-black/40 text-sm mt-0.5">{clients.length} {clients.length === 1 ? 'cliente' : 'clientes'} cadastrados</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-black/90 transition-colors">
          <Plus className="w-4 h-4" /> Novo cliente
        </button>
      </div>

      {/* Busca */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar cliente..."
        className="w-full mb-4 bg-black/5 border border-black/10 rounded-xl px-4 py-2.5 text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-black/25 flex-shrink-0" />

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <User className="w-10 h-10 text-black/15" />
            <p className="text-black/30 text-sm">{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p>
            {!search && <button onClick={() => setShowForm(true)} className="text-black/50 text-sm underline">Cadastrar primeiro cliente</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client, i) => {
              const tc = getTaskCount(client)
              const ec = getEventCount(client)
              return (
                <button key={client.id} onClick={() => setSelected(client)}
                  className={`text-left rounded-2xl border p-5 hover:shadow-md transition-all ${COLORS[i % COLORS.length]}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl ${DOTS[i % DOTS.length]} opacity-70 flex items-center justify-center flex-shrink-0`}>
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-black font-medium text-sm truncate">{client.name}</p>
                      {client.company && <p className="text-black/40 text-xs truncate">{client.company}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-black/35">
                    {tc > 0 && <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" />{tc} tarefa{tc !== 1 ? 's' : ''}</span>}
                    {ec > 0 && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{ec} evento{ec !== 1 ? 's' : ''}</span>}
                    {tc === 0 && ec === 0 && <span>Sem registros</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <ClientForm onSave={createClient} onClose={() => setShowForm(false)} />
      )}
    </PageEnter>
  )
}
