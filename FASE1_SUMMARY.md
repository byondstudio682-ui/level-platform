# FASE 1 — Estrutura ✅

## O que foi criado

### Projeto
- Next.js 14 + TypeScript + Tailwind CSS
- shadcn/ui configurado (Button, Card, Badge, Input, Label, Separator)
- Estrutura de pastas: `src/app/`, `src/components/`, `src/lib/`, `src/types/`

### Arquivos principais
| Arquivo | Descrição |
|---|---|
| `src/app/layout.tsx` | Layout raiz — dark mode, fonte Inter |
| `src/app/page.tsx` | Redireciona para /login |
| `src/app/login/page.tsx` | Login/cadastro com Supabase Auth |
| `src/app/dashboard/layout.tsx` | Layout com sidebar |
| `src/app/dashboard/page.tsx` | Dashboard com cards de métricas e módulos |
| `src/components/layout/Sidebar.tsx` | Sidebar dark com navegação completa |
| `src/lib/supabase.ts` | Cliente Supabase (browser + admin) |
| `src/types/index.ts` | Tipos TypeScript completos |
| `supabase/migrations/001_initial_schema.sql` | Schema completo com 13 tabelas + RLS |
| `.env.local.example` | Variáveis de ambiente necessárias |

### Banco de dados (migration)
13 tabelas criadas:
- `clients` — cadastro de clientes
- `projects` — projetos por cliente
- `process_catalog` — processos importados da planilha
- `process_complexity_times` — tempos por complexidade
- `tasks` — demandas principais
- `task_steps` — etapas de produção por tarefa (com snapshot)
- `task_dependencies` — dependências entre tarefas
- `schedules` — agendamentos no calendário
- `time_logs` — registro de tempo de execução
- `audio_transcriptions` — áudios + transcrições (com hash anti-duplicata)
- `availability_config` — configuração de disponibilidade
- `unavailable_periods` — períodos indisponíveis
- `change_history` — histórico de alterações

---

## Como configurar

### 1. Criar projeto no Supabase
1. Acesse supabase.com e crie um novo projeto
2. Copie: URL do projeto, Anon Key e Service Role Key

### 2. Configurar variáveis de ambiente
```bash
cp .env.local.example .env.local
# Edite .env.local com suas credenciais
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
OPENAI_API_KEY=sk-...
```

### 3. Executar a migration SQL
1. No painel Supabase → SQL Editor
2. Cole o conteúdo de `supabase/migrations/001_initial_schema.sql`
3. Clique em "Run"

### 4. Rodar o projeto
```bash
npm run dev
# Acesse http://localhost:3000
```

---

## Como testar a Fase 1

1. Acesse `http://localhost:3000` → redireciona para `/login`
2. Crie uma conta com e-mail e senha
3. Confirme o e-mail (se Supabase exigir)
4. Faça login → redireciona para `/dashboard`
5. Dashboard exibe: cards de métricas, tarefas mock, módulos navegáveis
6. Sidebar exibe todos os módulos (links ainda sem conteúdo — serão criados nas próximas fases)

---

## Próximas fases

| Fase | O que será construído |
|---|---|
| **FASE 2** | CRUD de Clientes, Projetos e Tarefas com dados reais do Supabase |
| **FASE 3** | Importação de planilha + catálogo de processos + cálculo de tempos |
| **FASE 4** | Entrada por áudio + transcrição Whisper + extração estruturada via IA |
| **FASE 5** | Motor de prioridades + calendário inteligente + detecção de sobrecarga |
| **FASE 6** | Assistente conversacional + replanejamento assistido + relatórios |
| **FASE 7** | Testes completos + documentação final |
