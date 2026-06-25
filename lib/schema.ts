// DDL idempotente do Tarefo (PostgreSQL).
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'Membro',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'PADRAO',
  status text NOT NULL DEFAULT 'A_FAZER',
  request_date timestamptz NOT NULL DEFAULT now(),
  start_date timestamptz,
  due_date timestamptz,
  description text,
  responsavel text,
  tags text,
  client_id text REFERENCES clients(id) ON DELETE SET NULL,
  project_id text REFERENCES projects(id) ON DELETE SET NULL,
  parent_id text REFERENCES tasks(id) ON DELETE CASCADE,
  sequential boolean NOT NULL DEFAULT false,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  body text NOT NULL,
  author_name text NOT NULL,
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attachments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  filename text NOT NULL,
  url text NOT NULL,
  size integer NOT NULL DEFAULT 0,
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Fase 2: perfis de acesso, grupos e autenticação
CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_permissions (
  profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission text NOT NULL,
  PRIMARY KEY (profile_id, permission)
);

CREATE TABLE IF NOT EXISTS groups (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_profiles (
  group_id text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, profile_id)
);

-- Campos de autenticação/perfil no usuário (idempotente)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_id text REFERENCES profiles(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;

-- Dono da tarefa (criador) para a regra de visibilidade
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_id text REFERENCES users(id);

-- Colaboradores da tarefa
CREATE TABLE IF NOT EXISTS task_collaborators (
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- Menções (@usuario) feitas nos comentários
CREATE TABLE IF NOT EXISTS mentions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  comment_id text NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A coluna "Em Revisão" foi substituída por "Marcação de Tarefa - MD".
UPDATE tasks SET status = 'EM_ANDAMENTO' WHERE status = 'EM_REVISAO';
`;
