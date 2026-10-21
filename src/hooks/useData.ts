'use client'
import { useState, useEffect, useCallback } from 'react'

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  notes?: string
  createdAt: string
  updatedAt?: string
}

export interface CalendarEvent {
  id: string
  title: string
  date: string        // YYYY-MM-DD
  time?: string       // HH:MM
  endTime?: string
  clientId?: string
  clientName?: string
  description?: string
  color?: string
  createdAt: string
}

export interface TaskRecord {
  id: string
  title: string
  clientId?: string
  clientName?: string
  status: string
  priority: string
  category?: string
  deadline?: string
  estimatedMinutes?: number
  labels?: string[]
  createdAt: string
}

const CHANNEL = 'level_data_sync'

function broadcast(type: string) {
  try {
    const ch = new BroadcastChannel(CHANNEL)
    ch.postMessage({ type, ts: Date.now() })
    ch.close()
  } catch {}
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch('/api/data?type=clients')
      const d = await r.json()
      setClients(d.data || [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch_()
    const ch = new BroadcastChannel(CHANNEL)
    ch.onmessage = (e) => { if (e.data?.type === 'clients') fetch_() }
    return () => ch.close()
  }, [fetch_])

  async function createClient(data: Omit<Client, 'id' | 'createdAt'>) {
    const r = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'clients', action: 'create', record: data }),
    })
    const d = await r.json()
    setClients(prev => [...prev, d.item])
    broadcast('clients')
    return d.item
  }

  async function updateClient(data: Partial<Client> & { id: string }) {
    const r = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'clients', action: 'update', record: data }),
    })
    const d = await r.json()
    setClients(prev => prev.map(c => c.id === data.id ? d.item : c))
    broadcast('clients')
  }

  async function deleteClient(id: string) {
    await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'clients', action: 'delete', record: { id } }),
    })
    setClients(prev => prev.filter(c => c.id !== id))
    broadcast('clients')
  }

  return { clients, loading, createClient, updateClient, deleteClient, refresh: fetch_ }
}

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch('/api/data?type=events')
      const d = await r.json()
      setEvents(d.data || [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch_()
    const ch = new BroadcastChannel(CHANNEL)
    ch.onmessage = (e) => { if (e.data?.type === 'events') fetch_() }
    return () => ch.close()
  }, [fetch_])

  async function createEvent(data: Omit<CalendarEvent, 'id' | 'createdAt'>) {
    const r = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'events', action: 'create', record: data }),
    })
    const d = await r.json()
    setEvents(prev => [...prev, d.item])
    broadcast('events')
    return d.item
  }

  async function deleteEvent(id: string) {
    await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'events', action: 'delete', record: { id } }),
    })
    setEvents(prev => prev.filter(e => e.id !== id))
    broadcast('events')
  }

  return { events, loading, createEvent, deleteEvent, refresh: fetch_ }
}

export function useTaskList() {
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch('/api/data?type=tasks')
      const d = await r.json()
      setTasks(d.data || [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch_()
    const ch = new BroadcastChannel(CHANNEL)
    ch.onmessage = (e) => { if (e.data?.type === 'tasks') fetch_() }
    return () => ch.close()
  }, [fetch_])

  async function upsertTask(data: TaskRecord) {
    const existing = tasks.find(t => t.id === data.id)
    const action = existing ? 'update' : 'create'
    const r = await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'tasks', action, record: data }),
    })
    const d = await r.json()
    setTasks(prev => existing ? prev.map(t => t.id === data.id ? d.item : t) : [...prev, d.item])
    broadcast('tasks')
  }

  async function deleteTask(id: string) {
    await fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'tasks', action: 'delete', record: { id } }),
    })
    setTasks(prev => prev.filter(t => t.id !== id))
    broadcast('tasks')
  }

  return { tasks, loading, upsertTask, deleteTask, refresh: fetch_ }
}
