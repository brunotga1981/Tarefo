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

-- Finalização individual de cada participante (dono + colaboradores)
CREATE TABLE IF NOT EXISTS task_completions (
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

-- A coluna "Em Revisão" foi substituída por "Marcação de Tarefa - MD".
UPDATE tasks SET status = 'EM_ANDAMENTO' WHERE status = 'EM_REVISAO';

-- Fase 3: modelos de tarefa, lotes e agendamentos
CREATE TABLE IF NOT EXISTS task_templates (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'PADRAO',
  description text,
  responsavel text,
  due_days integer,
  tags text,
  client_id text REFERENCES clients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_steps (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  template_id text NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  sequential boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS task_batches (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batch_templates (
  batch_id text NOT NULL REFERENCES task_batches(id) ON DELETE CASCADE,
  template_id text NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, template_id)
);

CREATE TABLE IF NOT EXISTS task_schedules (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  template_id text NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  owner_id text REFERENCES users(id) ON DELETE SET NULL,
  frequency text NOT NULL DEFAULT 'MENSAL', -- DIARIA | SEMANAL | MENSAL | ANUAL
  every integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date,
  run_time text NOT NULL DEFAULT '08:00',
  next_run timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Fase 4: comunicação interna
CREATE TABLE IF NOT EXISTS conversations (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL, -- DM | GROUP | CLIENT
  name text,
  client_id text REFERENCES clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  author_id text REFERENCES users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Torpedo v2
ALTER TABLE users ADD COLUMN IF NOT EXISTS presence text NOT NULL DEFAULT 'Disponível';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tasks_seen_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS started_by text REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id text NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS conversation_ratings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  rated_user_id text REFERENCES users(id) ON DELETE CASCADE,
  rater_id text REFERENCES users(id) ON DELETE SET NULL,
  score integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- SAC: tickets recebidos por e-mail, Superlógica e WhatsApp
CREATE TABLE IF NOT EXISTS sac_tickets (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  channel text NOT NULL,            -- EMAIL | SUPERLOGICA | WHATSAPP
  external_id text,                 -- id de origem (ticket Superlógica, msg-id, etc.)
  subject text,
  requester text,                   -- nome/e-mail/telefone do solicitante
  body text,
  conversation_status text,         -- WhatsApp: ABERTA | FECHADA
  status text NOT NULL DEFAULT 'ABERTO', -- ABERTO | CONVERTIDO | FECHADO
  client_id text REFERENCES clients(id) ON DELETE SET NULL,
  task_id text REFERENCES tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Treinamentos / cursos internos (LMS)
CREATE TABLE IF NOT EXISTS trainings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  category text,
  description text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS theme text;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS subtheme text;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS mandatory boolean NOT NULL DEFAULT false;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS group_id text REFERENCES groups(id) ON DELETE SET NULL;
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS deadline date;

-- Materiais do curso (vídeo, PDF, PPT, link...)
CREATE TABLE IF NOT EXISTS training_materials (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  training_id text NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'LINK', -- VIDEO | PDF | PPT | LINK | OUTRO
  title text NOT NULL,
  url text NOT NULL,
  "order" integer NOT NULL DEFAULT 0
);

-- Quiz: perguntas e opções
CREATE TABLE IF NOT EXISTS training_questions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  training_id text NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  "order" integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS training_options (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question_id text NOT NULL REFERENCES training_questions(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  "order" integer NOT NULL DEFAULT 0
);

-- Conclusão do curso (resultado do quiz)
CREATE TABLE IF NOT EXISTS training_completions (
  training_id text NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (training_id, user_id)
);

-- Fórum de dúvidas (perguntas e respostas) por curso
CREATE TABLE IF NOT EXISTS training_forum (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  training_id text NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  parent_id text REFERENCES training_forum(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Time Line (feed estilo Instagram da Intranet)
CREATE TABLE IF NOT EXISTS timeline_posts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kind text NOT NULL DEFAULT 'POST', -- POST | CERTIFICATE
  author_id text REFERENCES users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  body text,
  image_url text,
  course_id text REFERENCES trainings(id) ON DELETE SET NULL,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS timeline_reactions (
  post_id text NOT NULL REFERENCES timeline_posts(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  PRIMARY KEY (post_id, user_id, emoji)
);
CREATE TABLE IF NOT EXISTS timeline_comments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id text NOT NULL REFERENCES timeline_posts(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Blog "Conheça Mais"
CREATE TABLE IF NOT EXISTS blog_posts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  theme text,
  summary text,
  content text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Controle de leitura das conversas (para alertas de mensagens novas)
CREATE TABLE IF NOT EXISTS conversation_reads (
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Configurações da aplicação (chaves de API das integrações, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;
