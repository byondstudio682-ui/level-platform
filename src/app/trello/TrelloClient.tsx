'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ExternalLink, RefreshCw, Loader2, Tag, Calendar, LayoutGrid } from 'lucide-react'

interface Board { id: string; name: string }
interface TrelloLabel { id: string; name: string; color: string }
interface TrelloCard { id: string; name: string; idList: string; due: string | null; labels: TrelloLabel[]; desc: string; url: string }
interface TrelloList { id: string; name: string }

const labelColors: Record<string, string> = {
  green: 'bg-green-500/20 text-green-400',
  yellow: 'bg-yellow-500/20 text-yellow-400',
  orange: 'bg-orange-500/20 text-orange-400',
  red: 'bg-red-500/20 text-red-400',
  purple: 'bg-purple-500/20 text-purple-400',
  blue: 'bg-blue-500/20 text-blue-400',
  sky: 'bg-sky-500/20 text-sky-400',
  lime: 'bg-lime-500/20 text-lime-400',
  pink: 'bg-pink-500/20 text-pink-400',
  black: 'bg-black/10 text-black/60',
}

export function TrelloClient() {
  const [boards, setBoards] = useState<Board[]>([])
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null)
  const [lists, setLists] = useState<TrelloList[]>([])
  const [cards, setCards] = useState<TrelloCard[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingBoards, setLoadingBoards] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [notConnected, setNotConnected] = useState(false)

  useEffect(() => {
    fetch('/api/trello')
      .then(r => r.json())
      .then(d => {
        if (d.error || !d.boards?.length) { setNotConnected(true); return }
        setBoards(d.boards)
        if (d.boards[0]) fetchBoard(d.boards[0])
      })
      .catch(() => setNotConnected(true))
      .finally(() => setLoadingBoards(false))
  }, [])

  async function fetchBoard(board: Board) {
    setLoading(true)
    setSelectedBoard(board)
    try {
      const res = await fetch(`/api/trello?boardId=${board.id}`)
      const data = await res.json()
      setLists(data.lists || [])
      setCards(data.cards || [])
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'))
    } catch {
      setLists([])
      setCards([])
    } finally {
      setLoading(false)
    }
  }

  const totalCards = cards.length
  const overdue = cards.filter(c => c.due && new Date(c.due) < new Date()).length

  if (notConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-black/30 text-sm">Agenda não conectada</p>
        <a href="/conectar" className="px-4 py-2 bg-black/5 border border-black/10 rounded-xl text-black/60 hover:text-black text-sm transition-all">
          Conectar Agenda →
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-black tracking-tight">Agenda</h1>
          <p className="text-black/40 text-sm mt-0.5">
            {loading || loadingBoards ? 'Carregando...' : `${totalCards} cards abertos${overdue > 0 ? ` · ${overdue} atrasados` : ''}`}
            {lastUpdate && !loading && <span className="text-black/45 ml-2">· {lastUpdate}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-black/5 rounded-xl p-1">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${view === 'kanban' ? 'bg-black text-white font-medium' : 'text-black/40 hover:text-black'}`}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${view === 'list' ? 'bg-black text-white font-medium' : 'text-black/40 hover:text-black'}`}>
              Lista
            </button>
          </div>
          <button
            onClick={() => selectedBoard && fetchBoard(selectedBoard)}
            disabled={loading}
            className="p-2 bg-black/5 border border-black/10 rounded-xl text-black/40 hover:text-black hover:bg-black/10 transition-all disabled:opacity-30"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Boards tabs */}
      <div className="flex gap-2 mb-5 flex-shrink-0 overflow-x-auto pb-1">
        {boards.map(board => (
          <button
            key={board.id}
            onClick={() => board && fetchBoard(board)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              selectedBoard?.id === board.id
                ? 'bg-black text-white'
                : 'bg-black/5 border border-black/8 text-black/50 hover:text-black hover:bg-black/10'
            }`}
          >
            {board.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-black/30 animate-spin" />
        </div>
      ) : view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto flex-1 pb-2">
          {lists.map(list => {
            const listCards = cards.filter(c => c.idList === list.id)
            return (
              <div key={list.id} className="flex-shrink-0 w-64">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-black text-xs font-medium uppercase tracking-wide">{list.name}</span>
                  <span className="text-black/30 text-xs bg-black/5 rounded-full px-2 py-0.5">{listCards.length}</span>
                </div>
                <div className="space-y-2 min-h-10">
                  {listCards.map(card => {
                    const isOverdue = card.due && new Date(card.due) < new Date()
                    return (
                      <a
                        key={card.id}
                        href={card.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-black/5 border border-black/5 hover:border-black/15 rounded-xl p-3 transition-all group"
                      >
                        {/* Labels */}
                        {card.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {card.labels.slice(0, 3).map(label => (
                              <span key={label.id} className={`text-xs px-1.5 py-0.5 rounded-full ${labelColors[label.color] || 'bg-black/10 text-black/50'}`}>
                                {label.name || label.color}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-black/80 text-xs leading-snug group-hover:text-black transition-colors">{card.name}</p>
                        {card.due && (
                          <div className={`flex items-center gap-1 mt-2 text-xs ${isOverdue ? 'text-red-400' : 'text-black/25'}`}>
                            <Calendar className="w-3 h-3" />
                            {card.due.slice(5, 10).split('-').reverse().join('/')}
                          </div>
                        )}
                      </a>
                    )
                  })}
                  {listCards.length === 0 && (
                    <p className="text-black/40 text-xs text-center py-4">Vazio</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1">
          {lists.map(list => {
            const listCards = cards.filter(c => c.idList === list.id)
            if (listCards.length === 0) return null
            return (
              <div key={list.id} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-black/250 text-xs font-medium uppercase tracking-wider">{list.name}</span>
                  <span className="text-black/45 text-xs">({listCards.length})</span>
                </div>
                {listCards.map(card => {
                  const isOverdue = card.due && new Date(card.due) < new Date()
                  return (
                    <a
                      key={card.id}
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-black/5 hover:border-black/15 hover:bg-black/5 transition-all group mb-1"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex gap-1">
                          {card.labels.slice(0, 2).map(label => (
                            <span key={label.id} className={`w-2 h-2 rounded-full ${labelColors[label.color]?.split(' ')[0] || 'bg-black/20'}`} />
                          ))}
                        </div>
                        <span className="text-black/70 text-sm truncate group-hover:text-black">{card.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        {card.due && (
                          <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-black/20'}`}>
                            {card.due.slice(5, 10).split('-').reverse().join('/')}
                          </span>
                        )}
                        <ExternalLink className="w-3.5 h-3.5 text-black/45 group-hover:text-black/50" />
                      </div>
                    </a>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
