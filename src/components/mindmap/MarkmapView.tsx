'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'

const DEFAULT_MD = `# Level

## Projetos
### Cliente A
- Reel produto
- Stories pack
### Cliente B
- Vídeo institucional
- Podcast ep. 12

## Equipe
### Edição
- Victor
- Ana
### Motion
- Pedro

## Processos
- Briefing
- Produção
- Revisão
- Entrega`

const transformer = new Transformer()

export function MarkmapView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<Markmap | null>(null)
  const [markdown, setMarkdown] = useState(DEFAULT_MD)
  const [inputValue, setInputValue] = useState(DEFAULT_MD)
  const [mounted, setMounted] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Carrega mapa salvo
  useEffect(() => {
    fetch('/api/data?type=processos_map')
      .then(r => r.json())
      .then(d => {
        if (d.data && typeof d.data === 'string' && d.data.trim()) {
          setMarkdown(d.data)
          setInputValue(d.data)
        }
      })
      .catch(() => {})
  }, [])

  function saveMd(md: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'processos_map', action: 'replace', record: md }),
      })
    }, 1000)
  }

  useEffect(() => {
    if (!mounted || !svgRef.current) return

    const { root } = transformer.transform(markdown)

    if (!mmRef.current) {
      mmRef.current = Markmap.create(svgRef.current, {
        duration: 400,
        maxWidth: 300,
      })
    }

    mmRef.current.setData(root)
    mmRef.current.fit()
  }, [markdown, mounted])

  function handleGenerate() {
    setMarkdown(inputValue)
    saveMd(inputValue)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.currentTarget as HTMLTextAreaElement
      const start = el.selectionStart
      const end = el.selectionEnd
      const newVal = inputValue.slice(0, start) + '  ' + inputValue.slice(end)
      setInputValue(newVal)
      setTimeout(() => el.setSelectionRange(start + 2, start + 2), 0)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-black tracking-tight">Mapa Mental</h1>
          <p className="text-black/40 text-sm mt-0.5">Escreva em Markdown e visualize o mapa</p>
        </div>
        <a
          href="https://markmap.js.org/docs/markmap"
          target="_blank"
          rel="noopener noreferrer"
          className="text-black/30 hover:text-black text-xs underline underline-offset-2 transition-colors"
        >
          Ver sintaxe →
        </a>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Editor */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3">
          <div className="flex-1 flex flex-col bg-black/3 border border-black/8 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/8">
              <span className="text-black/40 text-xs font-medium uppercase tracking-wider">Markdown</span>
              <span className="text-black/45 text-xs">Tab = 2 espaços</span>
            </div>
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 bg-transparent text-black/80 text-xs font-mono p-4 focus:outline-none resize-none leading-relaxed placeholder:text-black/20"
              placeholder="# Título&#10;## Ramo&#10;### Sub-ramo&#10;- item"
            />
          </div>
          <button
            onClick={handleGenerate}
            className="w-full py-3 bg-black text-white font-semibold rounded-xl hover:bg-black/90 transition-colors text-sm"
          >
            Gerar mapa →
          </button>
          <button
            onClick={() => { setInputValue(''); setMarkdown('# Novo mapa'); saveMd('') }}
            className="w-full py-2.5 bg-black/5 border border-black/10 text-black/40 hover:text-black hover:bg-black/10 rounded-xl transition-all text-sm"
          >
            Limpar
          </button>
        </div>

        {/* Mapa */}
        <div className="flex-1 bg-black/3 border border-black/8 rounded-2xl overflow-hidden relative">
          {!mounted && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
            </div>
          )}
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ background: 'transparent' }}
          />
          <div className="absolute bottom-3 right-3 text-black/40 text-xs">
            Scroll para zoom · Arraste para mover
          </div>
        </div>
      </div>
    </div>
  )
}
