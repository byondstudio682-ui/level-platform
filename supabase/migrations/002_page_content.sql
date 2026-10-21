CREATE TABLE IF NOT EXISTS page_content (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed inicial
INSERT INTO page_content (id, data) VALUES (
  'home',
  '{"title": "Seja bem vindo, Victor Stuck.", "subtitle": "Byond Lab · Gestão audiovisual", "modules": []}'
) ON CONFLICT (id) DO NOTHING;
