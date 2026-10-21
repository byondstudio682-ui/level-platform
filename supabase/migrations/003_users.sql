-- Tabela de usuários (login por senha sem email)
CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL, -- identificador único ex: "victor", "joao"
  password text NOT NULL,    -- senha em plain (simples, uso interno)
  avatar_url text,
  trello_key text,
  trello_token text,
  notion_token text,
  google_refresh_token text,
  created_at timestamptz DEFAULT now()
);

-- RLS off para uso interno
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Usuários iniciais
INSERT INTO users (name, slug, password) VALUES
  ('Victor Stuck', 'victor', '1789'),
  ('Demo', 'demo', 'demo123')
ON CONFLICT (slug) DO NOTHING;
