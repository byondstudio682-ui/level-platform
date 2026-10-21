'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit2, Check, X, Clock, Download, Search, Upload } from 'lucide-react'

type Categoria = 'Planejamento' | 'Texto' | 'Design' | 'Vídeo' | 'Captação' | 'Revisão' | 'Cliente' | 'Publicação' | 'Gestão'

interface Atividade {
  id: string
  categoria: Categoria
  microatividade: string
  unidade: string
  minutos: number
}

const CATEGORIAS: Categoria[] = ['Planejamento', 'Texto', 'Design', 'Vídeo', 'Captação', 'Revisão', 'Cliente', 'Publicação', 'Gestão']

const catColors: Record<Categoria, string> = {
  Planejamento: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  Texto: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Design: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  Vídeo: 'bg-red-500/15 text-red-400 border-red-500/20',
  Captação: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Revisão: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  Cliente: 'bg-green-500/15 text-green-400 border-green-500/20',
  Publicação: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  Gestão: 'bg-black/10 text-black/50 border-black/10',
}

const catDot: Record<Categoria, string> = {
  Planejamento: 'bg-violet-400',
  Texto: 'bg-blue-400',
  Design: 'bg-pink-400',
  Vídeo: 'bg-red-400',
  Captação: 'bg-orange-400',
  Revisão: 'bg-yellow-400',
  Cliente: 'bg-green-400',
  Publicação: 'bg-cyan-400',
  Gestão: 'bg-black/40',
}

function fmt(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function TempoClient() {
  const [atividades, setAtividades] = useState<Atividade[]>([])

  const [loaded, setLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carrega catálogo do banco
  useEffect(() => {
    fetch('/api/data?type=tempo')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.data) && d.data.length > 0) setAtividades(d.data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  // Salva catálogo no banco com debounce
  useEffect(() => {
    if (!loaded) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'tempo', action: 'replace', record: atividades }),
      })
    }, 800)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [atividades, loaded])

  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Atividade>>({})
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<Categoria | 'Todas'>('Todas')
  const [addingCat, setAddingCat] = useState<Categoria | null>(null)
  const [newRow, setNewRow] = useState({ microatividade: '', unidade: '', minutos: 30 })
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg('')

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const lines = text.split('\n').filter(l => l.trim())
        if (lines.length < 2) { setImportMsg('Arquivo vazio ou inválido.'); setImporting(false); return }

        // Detecta separador (vírgula ou ponto e vírgula)
        const sep = lines[0].includes(';') ? ';' : ','
        const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ''))

        const iCategoria = headers.findIndex(h => h.includes('categoria') || h.includes('category'))
        const iMicro = headers.findIndex(h => h.includes('micro') || h.includes('atividade') || h.includes('activity') || h.includes('tarefa'))
        const iUnidade = headers.findIndex(h => h.includes('unidade') || h.includes('unit'))
        const iMinutos = headers.findIndex(h => h.includes('minuto') || h.includes('minute') || h.includes('tempo') || h.includes('time') || h.includes('min'))

        if (iMicro === -1) { setImportMsg('Coluna "atividade" não encontrada. Verifique o CSV.'); setImporting(false); return }

        const novas: Atividade[] = []
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(sep).map(c => c.trim().replace(/"/g, ''))
          const micro = cols[iMicro] || ''
          if (!micro) continue
          const cat = (iCategoria >= 0 ? cols[iCategoria] : 'Planejamento') as Categoria
          const unidade = iUnidade >= 0 ? cols[iUnidade] : 'Unidade'
          const min = iMinutos >= 0 ? parseInt(cols[iMinutos]) || 30 : 30
          novas.push({ id: Date.now().toString() + i, categoria: cat, microatividade: micro, unidade, minutos: min })
        }

        if (novas.length === 0) { setImportMsg('Nenhuma linha válida encontrada.'); setImporting(false); return }
        setAtividades(prev => [...prev, ...novas])
        setImportMsg(`✓ ${novas.length} atividades importadas!`)
      } catch {
        setImportMsg('Erro ao ler o arquivo.')
      }
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsText(file, 'utf-8')
  }

  const filtered = atividades.filter(a => {
    const matchCat = filterCat === 'Todas' || a.categoria === filterCat
    const matchSearch = search === '' || a.microatividade.toLowerCase().includes(search.toLowerCase()) || a.unidade.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const grouped = CATEGORIAS.reduce((acc, cat) => {
    const items = filtered.filter(a => a.categoria === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {} as Record<Categoria, Atividade[]>)

  const totalMin = atividades.reduce((a, b) => a + b.minutos, 0)

  function startEdit(a: Atividade) {
    setEditId(a.id)
    setEditData({ ...a })
  }

  function saveEdit() {
    setAtividades(prev => prev.map(a => a.id === editId ? { ...a, ...editData } as Atividade : a))
    setEditId(null)
  }

  function deleteRow(id: string) {
    setAtividades(prev => prev.filter(a => a.id !== id))
  }

  function addRow(cat: Categoria) {
    if (!newRow.microatividade.trim()) return
    const id = Date.now().toString()
    setAtividades(prev => [...prev, { id, categoria: cat, ...newRow }])
    setNewRow({ microatividade: '', unidade: '', minutos: 30 })
    setAddingCat(null)
  }

  function exportCSV() {
    const header = 'Categoria,Microatividade,Unidade,Tempo estimado\n'
    const rows = atividades.map(a => `${a.categoria},"${a.microatividade}","${a.unidade}","${fmt(a.minutos)}"`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'byond-tempo.csv'; a.click()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-black tracking-tight">Controle de Tempo</h1>
          <p className="text-black/40 text-sm mt-0.5">{atividades.length} microatividades · {fmt(totalMin)} de catálogo total</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Importar CSV */}
          <div className="relative">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-black/5 border border-black/10 rounded-xl text-black/40 hover:text-black hover:bg-black/10 transition-all text-sm disabled:opacity-40"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importando...' : 'Importar CSV'}
            </button>
            {importMsg && (
              <p className={`absolute top-full mt-1 right-0 text-xs whitespace-nowrap ${importMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                {importMsg}
              </p>
            )}
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-black/5 border border-black/10 rounded-xl text-black/40 hover:text-black hover:bg-black/10 transition-all text-sm">
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-5 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 bg-black/5 border border-black/10 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-black/20" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar atividade..."
            className="bg-transparent text-black text-sm placeholder:text-black/20 focus:outline-none flex-1"
          />
        </div>
        <div className="flex gap-1 bg-black/5 rounded-xl p-1 overflow-x-auto">
          {(['Todas', ...CATEGORIAS] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat as any)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${filterCat === cat ? 'bg-black text-white font-medium' : 'text-black/40 hover:text-black'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            {/* Cabeçalho categoria */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${catDot[cat as Categoria]}`} />
                <span className="text-black font-medium text-sm">{cat}</span>
                <span className="text-black/45 text-xs">({items.length})</span>
              </div>
              <button
                onClick={() => setAddingCat(cat as Categoria)}
                className="flex items-center gap-1.5 text-black/45 hover:text-black text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>

            {/* Rows */}
            <div className="bg-black/3 border border-black/8 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-black/5 text-black/30 text-xs uppercase tracking-wider">
                <span className="col-span-5">Microatividade</span>
                <span className="col-span-3">Unidade</span>
                <span className="col-span-2">Tempo</span>
                <span className="col-span-2 text-right">Ações</span>
              </div>

              {items.map(a => (
                <div key={a.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-black/5 last:border-0 hover:bg-black/3 transition-colors group items-center">
                  {editId === a.id ? (
                    <>
                      <input
                        value={editData.microatividade || ''}
                        onChange={e => setEditData(d => ({ ...d, microatividade: e.target.value }))}
                        className="col-span-5 bg-black/10 border border-black/20 rounded-lg px-2 py-1 text-black text-sm focus:outline-none"
                      />
                      <input
                        value={editData.unidade || ''}
                        onChange={e => setEditData(d => ({ ...d, unidade: e.target.value }))}
                        className="col-span-3 bg-black/10 border border-black/20 rounded-lg px-2 py-1 text-black text-sm focus:outline-none"
                      />
                      <input
                        type="number"
                        value={editData.minutos || 0}
                        onChange={e => setEditData(d => ({ ...d, minutos: Number(e.target.value) }))}
                        className="col-span-2 bg-black/10 border border-black/20 rounded-lg px-2 py-1 text-black text-sm focus:outline-none"
                      />
                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        <button onClick={saveEdit} className="p-1.5 bg-black text-white rounded-lg hover:bg-black/90"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditId(null)} className="p-1.5 bg-black/10 text-black rounded-lg hover:bg-black/20"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="col-span-5 text-black/80 text-sm">{a.microatividade}</span>
                      <span className="col-span-3 text-black/40 text-sm">{a.unidade}</span>
                      <div className="col-span-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-black/20" />
                        <span className="text-black text-sm font-medium">{fmt(a.minutos)}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(a)} className="p-1.5 text-black/30 hover:text-black hover:bg-black/10 rounded-lg transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteRow(a.id)} className="p-1.5 text-black/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Linha nova */}
              {addingCat === cat && (
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-black/10 bg-black/5 items-center">
                  <input
                    autoFocus
                    placeholder="Nome da atividade"
                    value={newRow.microatividade}
                    onChange={e => setNewRow(n => ({ ...n, microatividade: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addRow(cat as Categoria)}
                    className="col-span-5 bg-black/10 border border-black/20 rounded-lg px-2 py-1 text-black text-sm focus:outline-none placeholder:text-black/20"
                  />
                  <input
                    placeholder="Unidade"
                    value={newRow.unidade}
                    onChange={e => setNewRow(n => ({ ...n, unidade: e.target.value }))}
                    className="col-span-3 bg-black/10 border border-black/20 rounded-lg px-2 py-1 text-black text-sm focus:outline-none placeholder:text-black/20"
                  />
                  <input
                    type="number"
                    placeholder="Min"
                    value={newRow.minutos}
                    onChange={e => setNewRow(n => ({ ...n, minutos: Number(e.target.value) }))}
                    className="col-span-2 bg-black/10 border border-black/20 rounded-lg px-2 py-1 text-black text-sm focus:outline-none"
                  />
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <button onClick={() => addRow(cat as Categoria)} className="p-1.5 bg-black text-white rounded-lg hover:bg-black/90"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setAddingCat(null)} className="p-1.5 bg-black/10 text-black rounded-lg"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
