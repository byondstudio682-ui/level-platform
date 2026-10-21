'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ExternalLink } from 'lucide-react'

function getUser() {
  if (typeof document === 'undefined') return null
  const cookie = document.cookie.split(';').find(c => c.trim().startsWith('byond_user='))
  if (!cookie) return null
  try {
    const raw = cookie.trim().split('=').slice(1).join('=')
    return JSON.parse(atob(raw))
  } catch { return null }
}

interface FieldConfig {
  key: string
  label: string
  placeholder: string
  help: string
}

interface Integration {
  id: string
  name: string
  description: string
  color: string
  fields: FieldConfig[]
  link?: string
  linkLabel?: string
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'gemini',
    name: 'Gemini IA',
    description: 'Google AI — motor do Assistente',
    color: '#1a1a1a',
    fields: [
      { key: 'gemini_api_key', label: 'API Key', placeholder: 'AIza...', help: 'Obtenha em aistudio.google.com/app/apikey' },
    ],
    link: 'https://aistudio.google.com/app/apikey',
    linkLabel: 'Gerar chave grátis',
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Criar cards e consultar tarefas pelo chat',
    color: '#1a1a1a',
    fields: [
      { key: 'trello_key', label: 'API Key', placeholder: 'sua api key do trello', help: 'Acesse trello.com/app-key' },
      { key: 'trello_token', label: 'Token', placeholder: 'seu token do trello', help: 'Na mesma página, clique em "Token"' },
    ],
    link: 'https://trello.com/app-key',
    linkLabel: 'Obter API Key e Token',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Criar notas e buscar páginas pelo chat',
    color: '#1a1a1a',
    fields: [
      { key: 'notion_token', label: 'Integration Token', placeholder: 'secret_...', help: 'Crie em notion.so/my-integrations e conecte às suas páginas' },
      { key: 'notion_database_id', label: 'Database ID (opcional)', placeholder: 'ID do database para criar tarefas', help: 'Abra o database → copie o ID da URL (32 chars)' },
      { key: 'notion_page_id', label: 'Page ID (opcional)', placeholder: 'ID da página para notas rápidas', help: 'Abra a página → copie o ID da URL' },
    ],
    link: 'https://www.notion.so/my-integrations',
    linkLabel: 'Criar integração',
  },
  {
    id: 'google',
    name: 'Google Agenda',
    description: 'Agendar e consultar eventos pelo chat',
    color: '#1a1a1a',
    fields: [
      { key: 'google_client_id', label: 'Client ID', placeholder: '...apps.googleusercontent.com', help: 'Crie um projeto no Google Cloud Console → OAuth 2.0' },
      { key: 'google_client_secret', label: 'Client Secret', placeholder: 'GOCSPX-...', help: 'Na mesma tela de credenciais OAuth' },
      { key: 'google_refresh_token', label: 'Refresh Token', placeholder: '1//...', help: 'Gerado após autorizar o app com OAuth (use oauth2.googleapis.com/token)' },
      { key: 'google_calendar_id', label: 'Calendar ID', placeholder: 'seu@gmail.com', help: 'Configurações da agenda → ID do calendário (ou deixe "primary")' },
    ],
    link: 'https://console.cloud.google.com/apis/credentials',
    linkLabel: 'Criar credenciais OAuth',
  },
]

export default function ConectarPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [integrations, setIntegrations] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [entered, setEntered] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(getUser())
    setTimeout(() => setEntered(true), 80)
    // Busca integrações do servidor (por usuário)
    fetch('/api/integrations')
      .then(r => r.json())
      .then(d => setIntegrations(d.integrations || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(integrationId: string, fields: FieldConfig[], values: Record<string, string>) {
    // Salva cada campo no servidor vinculado ao usuário
    await Promise.all(
      fields.map(f => {
        if (values[f.key] !== undefined) {
          return fetch('/api/integrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: f.key, value: values[f.key] }),
          })
        }
      })
    )
    // Atualiza estado local
    const updated = { ...integrations }
    fields.forEach(f => { if (values[f.key] !== undefined) updated[f.key] = values[f.key] })
    setIntegrations(updated)
    setSaved(s => ({ ...s, [integrationId]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [integrationId]: false })), 2000)
  }

  return (
    <div
      className="w-screen min-h-screen overflow-y-auto"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Grain */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 512 512\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'512\' height=\'512\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")', backgroundSize: '256px' }} />

      <div
        className="relative z-10 max-w-md mx-auto px-6 py-8 flex flex-col gap-6"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 500ms ease, transform 500ms ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/inicio')} className="text-black/45 hover:text-black/60 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-black text-base font-semibold">Conectar</h1>
            {user && <p className="text-black/30 text-xs">{user.name}</p>}
          </div>
        </div>

        {/* Integration cards */}
        {INTEGRATIONS.map((intg) => (
          <IntegrationCard
            key={intg.id}
            integration={intg}
            integrations={integrations}
            saved={saved[intg.id]}
            onSave={(fields, values) => handleSave(intg.id, fields, values)}
          />
        ))}

        {/* Info */}
        <p className="text-black/40 text-xs text-center pb-4">
          As credenciais ficam salvas localmente no seu dispositivo
        </p>
      </div>
    </div>
  )
}

function IntegrationCard({
  integration,
  integrations,
  saved,
  onSave,
}: {
  integration: Integration
  integrations: Record<string, string>
  saved?: boolean
  onSave: (fields: FieldConfig[], values: Record<string, string>) => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const initial: Record<string, string> = {}
    integration.fields.forEach(f => {
      initial[f.key] = integrations[f.key] || ''
    })
    setValues(initial)
  }, [integrations, integration.fields])

  const isConnected = integration.fields.every(f => !!integrations[f.key])

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{
        background: 'rgba(0,0,0,0.30)',
        borderColor: isConnected ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.30)',
      }}
    >
      {/* Card header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-black/60' : 'bg-black/10'}`} />
          <div className="text-left">
            <p className="text-black text-sm font-medium">{integration.name}</p>
            <p className="text-black/30 text-xs">{isConnected ? 'Conectado' : integration.description}</p>
          </div>
        </div>
        <span className="text-black/45 text-xs">{open ? '−' : '+'}</span>
      </button>

      {/* Expanded fields */}
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-black/5 pt-4">
          {integration.link && (
            <a
              href={integration.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-black/25 hover:text-black/50 text-xs transition-colors w-fit"
            >
              <ExternalLink className="w-3 h-3" />
              {integration.linkLabel}
            </a>
          )}

          {integration.fields.map(field => (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-black/30 text-xs">{field.label}</label>
              <input
                type="text"
                placeholder={field.placeholder}
                value={values[field.key] || ''}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                className="bg-black/4 border border-black/8 rounded-xl px-3 py-2 text-black text-xs placeholder-black/15 outline-none focus:border-black/20 transition-colors"
              />
              <p className="text-black/40 text-[10px]">{field.help}</p>
            </div>
          ))}

          <button
            onClick={() => onSave(integration.fields, values)}
            className="flex items-center justify-center gap-2 bg-black/6 hover:bg-black/10 border border-black/10 rounded-xl py-2 text-black text-xs font-medium transition-all mt-1"
          >
            {saved ? <><Check className="w-3 h-3" /> Salvo</> : 'Salvar'}
          </button>
        </div>
      )}
    </div>
  )
}
