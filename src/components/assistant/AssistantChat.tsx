'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Bot, User, Sparkles, Zap, Calendar, CheckSquare, Users, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { HologramSphere } from './HologramSphere'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isAudio?: boolean
  actions?: { tool: string; args: any; result: any }[]
}

const SUGGESTIONS = [
  { icon: Zap, text: 'Me ajuda a priorizar o dia' },
  { icon: CheckSquare, text: 'Como organizo minhas tarefas?' },
  { icon: Calendar, text: 'Me ajuda a planejar a semana' },
  { icon: Users, text: 'Estou sobrecarregado, o que faço?' },
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-black/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}

function AudioWave({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[1, 3, 2, 4, 2, 3, 1].map((h, i) => (
        <span
          key={i}
          className={`w-0.5 rounded-full bg-red-400 transition-all ${active ? 'animate-bounce' : ''}`}
          style={{
            height: active ? `${h * 3}px` : '3px',
            animationDelay: `${i * 0.07}s`,
          }}
        />
      ))}
    </div>
  )
}

const TOOL_LABELS: Record<string, string> = {
  trello_create_card: '✅ Card criado no Trello',
  trello_get_boards: '📋 Boards do Trello carregados',
  trello_get_lists: '📋 Listas carregadas',
  trello_get_cards: '📋 Cards carregados',
  notion_create_page: '📝 Página criada no Notion',
  notion_create_note: '📝 Nota criada no Notion',
  notion_search: '🔍 Notion pesquisado',
  gcal_list_events: '📅 Agenda consultada',
  gcal_create_event: '📅 Evento criado no Google Agenda',
}

function ActionBadges({ actions }: { actions?: { tool: string; args: any; result: any }[] }) {
  if (!actions?.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {actions.map((a, i) => {
        const hasError = a.result?.error
        const label = TOOL_LABELS[a.tool] || a.tool
        return (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: hasError ? 'rgba(255,80,80,0.10)' : 'rgba(0,0,0,0.06)', color: hasError ? 'rgba(200,0,0,0.7)' : 'rgba(0,0,0,0.50)', border: `1px solid ${hasError ? 'rgba(200,0,0,0.15)' : 'rgba(0,0,0,0.08)'}` }}>
            {hasError ? `⚠️ ${a.result.error}` : label}
          </span>
        )
      })}
    </div>
  )
}

function MessageBubble({ msg, onSpeak, speaking }: { msg: Message, onSpeak: (text: string) => void, speaking: boolean }) {
  const isUser = msg.role === 'user'

  const renderContent = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      if (line.startsWith('## ')) return <p key={i} className="font-semibold text-black mt-2 mb-1">{line.slice(3)}</p>
      if (line.startsWith('# ')) return <p key={i} className="font-bold text-black text-base mt-2 mb-1">{line.slice(2)}</p>
      if (line.startsWith('- ') || line.startsWith('• ')) return (
        <div key={i} className="flex gap-2 mt-0.5">
          <span className="text-black/40 mt-0.5">•</span>
          <span>{line.slice(2)}</span>
        </div>
      )
      if (/^\d+\. /.test(line)) {
        const num = line.match(/^(\d+)\. /)?.[1]
        return (
          <div key={i} className="flex gap-2 mt-0.5">
            <span className="text-black/40 w-4 text-right flex-shrink-0">{num}.</span>
            <span>{line.replace(/^\d+\. /, '')}</span>
          </div>
        )
      }
      if (line === '') return <div key={i} className="h-1" />
      return <p key={i} className="leading-relaxed">{line}</p>
    })
  }

  return (
    <div className={`flex gap-3 group ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-black/10' : 'bg-black text-white'}`}>
        {isUser ? <User className="w-4 h-4 text-black/60" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`max-w-[80%] relative`}>
        <div className={`px-4 py-3 rounded-2xl text-sm ${
          isUser
            ? 'bg-black/10 text-black rounded-tr-sm'
            : 'bg-black/5 border border-black/8 text-black/80 rounded-tl-sm'
        }`}>
          {msg.isAudio && isUser && (
            <div className="flex items-center gap-2 mb-1 text-black/40 text-xs">
              <Mic className="w-3 h-3" />
              Mensagem de voz
            </div>
          )}
          {renderContent(msg.content)}
        </div>
        {!isUser && <ActionBadges actions={msg.actions} />}
        {/* Botão ouvir resposta */}
        {!isUser && (
          <button
            onClick={() => onSpeak(msg.content)}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black/10 border border-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/20 transition-all"
            title="Ouvir resposta"
          >
            {speaking ? <VolumeX className="w-3 h-3 text-black/60" /> : <Volume2 className="w-3 h-3 text-black/60" />}
          </button>
        )}
      </div>
    </div>
  )
}

type AIModel = 'openai' | 'gemini' | 'claude'

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou o Level, seu assistente de produtividade. Estou aqui para te ajudar a organizar tarefas, planejar a agenda e manter o foco no que importa. Como posso te ajudar hoje?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [model] = useState<AIModel>('gemini')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setSpeaking(false)
    }
  }, [])

  const speakText = useCallback(async (text: string) => {
    if (speaking) { stopAudio(); return }

    // Remove markdown para leitura mais limpa
    const clean = text
      .replace(/#{1,6} /g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/- /g, '')
      .slice(0, 1000) // limita para não gastar muito

    setSpeaking(true)
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean }),
      })

      if (!res.ok) {
        setSpeaking(false)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.play()
      audio.onended = () => { setSpeaking(false); audioRef.current = null }
      audio.onerror = () => { setSpeaking(false); audioRef.current = null }
    } catch {
      setSpeaking(false)
    }
  }, [speaking, stopAudio])

  async function sendMessage(content: string, isAudio = false) {
    if (!content.trim() || loading) return

    const userMsg: Message = { role: 'user', content, isAudio }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, model }),
      })
      const data = await res.json()
      const reply = data.reply || data.error || 'Erro ao processar.'
      const assistantMsg: Message = { role: 'assistant', content: reply, actions: data.actions }
      setMessages(prev => [...prev, assistantMsg])

      // Auto-fala se ativado
      if (autoSpeak && !reply.includes('⚠️')) {
        setTimeout(() => speakText(reply), 200)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro de conexão. Tente novamente.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function startRecording() {
    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SR) {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Reconhecimento de voz não disponível. Abra no Google Chrome para usar o microfone.' }])
        return
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      const r = new SR()
      r.lang = 'pt-BR'
      r.continuous = false
      r.interimResults = false
      r.maxAlternatives = 1
      r.onstart = () => setRecording(true)
      r.onend = () => { setRecording(false); recognitionRef.current = null }
      r.onerror = (e: any) => {
        setRecording(false)
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Erro no microfone: ${e.error}` }])
        }
      }
      r.onresult = (e: any) => {
        const text = e.results?.[0]?.[0]?.transcript || ''
        if (text.trim()) sendMessage(text.trim(), true)
      }
      recognitionRef.current = r
      setRecording(true) // mostra imediatamente
      r.start()
    } catch (err) {
      setRecording(false)
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Não foi possível acessar o microfone. Verifique as permissões no Safari/Chrome.' }])
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setRecording(false)
  }

  function handleMic() {
    if (recording) stopRecording()
    else startRecording()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const showSuggestions = messages.length <= 1
  const isProcessing = loading || transcribing
  const sphereState = loading ? 'thinking' : messages.length > 1 ? 'responding' : 'idle'
  const showHologram = messages.length <= 1 && !loading

  return (
    <div className="flex flex-col h-full">
      {/* Header minimalista */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-black tracking-tight">Assistente IA</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`} />
            <p className="text-black/40 text-xs">{loading ? 'Processando...' : 'Gemini · Online'}</p>
          </div>
        </div>
        <button
          onClick={() => setAutoSpeak(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${
            autoSpeak
              ? 'bg-black text-white border-black font-medium'
              : 'bg-black/5 text-black/40 border-black/10 hover:text-black hover:border-black/20'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          {autoSpeak ? 'Voz ativa' : 'Voz'}
        </button>
      </div>

      {/* Holograma — só aparece no estado inicial */}
      {showHologram && (
        <div
          className="flex-shrink-0 flex flex-col items-center justify-center"
          style={{ height: 280, position: 'relative' }}
        >
          {/* Fundo escuro para o holograma */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, #0a0f1a 0%, #000000 70%)',
            borderRadius: 24,
            overflow: 'hidden',
          }}>
            <HologramSphere state={sphereState} />
          </div>
          {/* Label flutuante */}
          <div style={{
            position: 'absolute', bottom: 20, left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <span style={{ color: 'rgba(180,220,255,0.5)', fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase' }}>
              LEVEL · A.I.
            </span>
          </div>
        </div>
      )}

      {/* Esfera mini quando há mensagens */}
      {!showHologram && (
        <div style={{
          flexShrink: 0, height: 80,
          background: '#000',
          borderRadius: 16,
          marginBottom: 12,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <HologramSphere state={sphereState} />
          <div style={{
            position: 'absolute', bottom: 6, right: 12,
            fontSize: 9, letterSpacing: '0.3em',
            color: 'rgba(180,220,255,0.35)',
            textTransform: 'uppercase',
          }}>
            {loading ? 'processando...' : 'online'}
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} onSpeak={speakText} speaking={speaking} />
        ))}
        {isProcessing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-black" />
            </div>
            <div className="bg-black/5 border border-black/8 rounded-2xl rounded-tl-sm">
              {transcribing
                ? <div className="px-4 py-3 text-black/40 text-sm flex items-center gap-2"><Mic className="w-3.5 h-3.5" />Transcrevendo...</div>
                : <TypingDots />
              }
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && !isProcessing && (
        <div className="grid grid-cols-2 gap-2 my-4 flex-shrink-0">
          {SUGGESTIONS.map(({ icon: Icon, text }) => (
            <button
              key={text}
              onClick={() => sendMessage(text)}
              className="flex items-center gap-2 px-3 py-2.5 bg-black/5 border border-black/8 rounded-xl text-black/50 hover:text-black hover:bg-black/10 hover:border-black/15 text-xs text-left transition-all"
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {text}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 mt-3">
        <div className={`flex gap-3 items-end rounded-2xl p-3 transition-all border ${
          recording
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-black/5 border-black/10 focus-within:border-black/25'
        }`}>
          {recording ? (
            <div className="flex-1 flex items-center gap-3">
              <AudioWave active={recording} />
              <span className="text-red-400 text-sm">Gravando... toque 🎤 para parar</span>
            </div>
          ) : (
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Fale com o Level..."
              rows={1}
              disabled={isProcessing}
              className="flex-1 bg-transparent text-black text-sm placeholder:text-black/25 focus:outline-none resize-none leading-relaxed disabled:opacity-50"
              style={{ maxHeight: '120px' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = el.scrollHeight + 'px'
              }}
            />
          )}

          {/* Botão microfone */}
          <button
            onClick={handleMic}
            disabled={loading}
            className={`flex items-center gap-2 px-3 h-8 rounded-xl flex-shrink-0 transition-all disabled:opacity-30 text-xs font-medium ${
              recording
                ? 'bg-red-500 text-black animate-pulse'
                : 'bg-black/10 text-black/50 hover:bg-black/20 hover:text-black'
            }`}
            title={recording ? 'Toque para parar' : 'Toque para falar'}
          >
            {recording ? <><MicOff className="w-4 h-4" /><span>Parar</span></> : <><Mic className="w-4 h-4" /><span>Falar</span></>}
          </button>

          {/* Botão enviar */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isProcessing}
            className="w-8 h-8 rounded-xl bg-black flex items-center justify-center flex-shrink-0 hover:bg-black/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-black/40 text-xs">Enter para enviar · 🎤 clique para falar</p>
          {speaking && (
            <button onClick={stopAudio} className="text-black/30 text-xs hover:text-black flex items-center gap-1 transition-colors">
              <VolumeX className="w-3 h-3" />
              Parar áudio
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
