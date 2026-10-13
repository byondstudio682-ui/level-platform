-- ============================================================
-- AUDIOVISUAL IA — Schema completo v1
-- ============================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJETOS
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATÁLOGO DE PROCESSOS (importado da planilha)
-- ============================================================
CREATE TABLE process_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- ex: edição, organização, revisão, exportação
  deliverable_type TEXT, -- ex: reel, podcast, institucional, etc.
  base_duration_minutes INTEGER NOT NULL, -- tempo base em minutos
  complexity TEXT DEFAULT 'normal' CHECK (complexity IN ('simple', 'normal', 'complex')),
  is_required BOOLEAN DEFAULT TRUE,
  is_shareable BOOLEAN DEFAULT FALSE, -- pode ser compartilhada entre entregáveis?
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tempos por complexidade (quando um processo tem tempo diferente por nível)
CREATE TABLE process_complexity_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_id UUID NOT NULL REFERENCES process_catalog(id) ON DELETE CASCADE,
  complexity TEXT NOT NULL CHECK (complexity IN ('simple', 'normal', 'complex')),
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TAREFAS
-- ============================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- tipo de produção: reel, podcast, institucional, etc.
  deliverable_quantity INTEGER DEFAULT 1,
  entry_date DATE DEFAULT CURRENT_DATE,
  deadline DATE,
  planned_start DATE,
  planned_end DATE,
  estimated_minutes INTEGER,
  actual_minutes INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  priority_manual BOOLEAN DEFAULT FALSE, -- true = prioridade definida manualmente
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled')),
  risk_level TEXT DEFAULT 'none' CHECK (risk_level IN ('none', 'low', 'medium', 'high', 'critical')),
  notes TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'audio', 'text')),
  audio_id UUID, -- referência ao áudio que gerou a tarefa
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ETAPAS DE PRODUÇÃO POR TAREFA
-- ============================================================
CREATE TABLE task_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  process_catalog_id UUID REFERENCES process_catalog(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  estimated_minutes INTEGER NOT NULL,
  actual_minutes INTEGER DEFAULT 0,
  -- Snapshot dos tempos no momento da criação (preserva histórico)
  snapshot_process_name TEXT,
  snapshot_duration_minutes INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'skipped')),
  is_required BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEPENDÊNCIAS ENTRE TAREFAS
-- ============================================================
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'finish_to_start',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

-- ============================================================
-- AGENDAMENTOS (calendário inteligente)
-- ============================================================
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  task_step_id UUID REFERENCES task_steps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REGISTRO DE TEMPO (controle de execução)
-- ============================================================
CREATE TABLE time_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  task_step_id UUID REFERENCES task_steps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  log_type TEXT DEFAULT 'work' CHECK (log_type IN ('work', 'interruption', 'rework', 'revision')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÁUDIOS E TRANSCRIÇÕES
-- ============================================================
CREATE TABLE audio_transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT,
  file_hash TEXT, -- para evitar processamento duplicado
  storage_path TEXT,
  raw_transcription TEXT,
  processed_data JSONB, -- dados estruturados extraídos pela IA
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'transcribed', 'processed', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, file_hash)
);

-- ============================================================
-- CONFIGURAÇÕES DE DISPONIBILIDADE
-- ============================================================
CREATE TABLE availability_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  work_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- 0=dom, 1=seg, ..., 6=sab
  start_time TIME DEFAULT '08:00',
  end_time TIME DEFAULT '18:00',
  break_start TIME DEFAULT '12:00',
  break_end TIME DEFAULT '13:00',
  max_hours_per_day DECIMAL(4,2) DEFAULT 8.0,
  buffer_percentage INTEGER DEFAULT 20, -- margem de segurança %
  focus_similar_tasks BOOLEAN DEFAULT TRUE, -- agrupa tarefas semelhantes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Períodos indisponíveis (férias, eventos, etc.)
CREATE TABLE unavailable_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HISTÓRICO DE ALTERAÇÕES
-- ============================================================
CREATE TABLE change_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_task_steps_task_id ON task_steps(task_id);
CREATE INDEX idx_schedules_user_id ON schedules(user_id);
CREATE INDEX idx_schedules_date ON schedules(scheduled_date);
CREATE INDEX idx_time_logs_task_id ON time_logs(task_id);
CREATE INDEX idx_audio_transcriptions_hash ON audio_transcriptions(file_hash);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_complexity_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE unavailable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;

-- Políticas: usuário vê apenas seus próprios dados
CREATE POLICY "users_own_clients" ON clients USING (auth.uid() = user_id);
CREATE POLICY "users_own_projects" ON projects USING (auth.uid() = user_id);
CREATE POLICY "users_own_process_catalog" ON process_catalog USING (auth.uid() = user_id);
CREATE POLICY "users_own_tasks" ON tasks USING (auth.uid() = user_id);
CREATE POLICY "users_own_schedules" ON schedules USING (auth.uid() = user_id);
CREATE POLICY "users_own_time_logs" ON time_logs USING (auth.uid() = user_id);
CREATE POLICY "users_own_audio" ON audio_transcriptions USING (auth.uid() = user_id);
CREATE POLICY "users_own_availability" ON availability_config USING (auth.uid() = user_id);
CREATE POLICY "users_own_unavailable" ON unavailable_periods USING (auth.uid() = user_id);
CREATE POLICY "users_own_history" ON change_history USING (auth.uid() = user_id);

-- task_steps: via task
CREATE POLICY "users_own_task_steps" ON task_steps
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_steps.task_id AND tasks.user_id = auth.uid()));

-- task_dependencies: via task
CREATE POLICY "users_own_task_dependencies" ON task_dependencies
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_dependencies.task_id AND tasks.user_id = auth.uid()));

-- process_complexity_times: via process_catalog
CREATE POLICY "users_own_complexity_times" ON process_complexity_times
  USING (EXISTS (SELECT 1 FROM process_catalog WHERE process_catalog.id = process_complexity_times.process_id AND process_catalog.user_id = auth.uid()));

-- ============================================================
-- FUNÇÃO: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_task_steps_updated_at BEFORE UPDATE ON task_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_availability_updated_at BEFORE UPDATE ON availability_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_process_catalog_updated_at BEFORE UPDATE ON process_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at();
