import { Pool } from "pg";
import { SCHEMA_SQL } from "./schema";
import { hashPassword } from "./hash";
import { ALL_PERMISSION_KEYS } from "./permissions";

// Pool de conexões reutilizável entre hot-reloads do Next em desenvolvimento.
const globalForDb = globalThis as unknown as {
  _pool?: Pool;
  _ready?: Promise<void>;
};

export const pool: Pool =
  globalForDb._pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    // Habilite com DATABASE_SSL=true ao conectar por URL externa (ex.: Render externo).
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForDb._pool = pool;

export async function query<T = any>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await ready();
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/** Garante que o schema existe (e dados de exemplo) — executa apenas uma vez. */
export function ready(): Promise<void> {
  if (!globalForDb._ready) {
    globalForDb._ready = (async () => {
      await pool.query(SCHEMA_SQL);
      await seedAccess();
      await seedTasks();
    })();
  }
  return globalForDb._ready;
}

// Perfis de acesso, usuários (com senha) e grupos.
async function seedAccess() {
  const { rows } = await pool.query<{ count: string }>(
    "SELECT count(*)::int AS count FROM profiles"
  );
  if (Number(rows[0]?.count ?? 0) > 0) return;

  // Perfis
  const admin = await pool.query<{ id: string }>(
    `INSERT INTO profiles (name) VALUES ('Administrador') RETURNING id`
  );
  const gestor = await pool.query<{ id: string }>(
    `INSERT INTO profiles (name) VALUES ('Gestor') RETURNING id`
  );
  const membro = await pool.query<{ id: string }>(
    `INSERT INTO profiles (name) VALUES ('Membro') RETURNING id`
  );
  const adminId = admin.rows[0].id;
  const gestorId = gestor.rows[0].id;
  const membroId = membro.rows[0].id;

  // Permissões por perfil
  for (const key of ALL_PERMISSION_KEYS) {
    await pool.query(
      `INSERT INTO profile_permissions (profile_id, permission) VALUES ($1,$2)`,
      [adminId, key]
    );
  }
  for (const key of [
    "tasks.view",
    "tasks.manage",
    "templates.manage",
    "clients.view",
    "clients.manage",
    "projects.view",
    "projects.manage",
    "users.manage",
    "trainings.manage",
    "blog.manage",
    "timeline.post",
  ]) {
    await pool.query(
      `INSERT INTO profile_permissions (profile_id, permission) VALUES ($1,$2)`,
      [gestorId, key]
    );
  }
  for (const key of ["tasks.view", "tasks.manage", "clients.view", "projects.view"]) {
    await pool.query(
      `INSERT INTO profile_permissions (profile_id, permission) VALUES ($1,$2)`,
      [membroId, key]
    );
  }

  // Usuários (senha padrão de demonstração)
  const pwd = hashPassword("tarefo123");
  await pool.query(
    `INSERT INTO users (name, email, role, username, password_hash, profile_id, birth_date, phone) VALUES
      ('Administrador', 'admin@azuladministradora.com.br', 'Administrador', 'admin', $1, $2, '1985-03-15', '(11) 90000-0001'),
      ('Bruno Tarefo', 'brunotga@yahoo.com.br', 'Gestor', 'brunotga', $1, $3, '1990-06-27', '(11) 90000-0002'),
      ('Equipe Atendimento', 'atendimento@azuladministradora.com.br', 'Membro', 'atendimento', $1, $4, '1995-12-10', '(11) 90000-0003')`,
    [pwd, adminId, gestorId, membroId]
  );

  // Grupo de exemplo
  const grupo = await pool.query<{ id: string }>(
    `INSERT INTO groups (name) VALUES ('Atendimento') RETURNING id`
  );
  const grupoId = grupo.rows[0].id;
  await pool.query(
    `INSERT INTO group_profiles (group_id, profile_id) VALUES ($1,$2)`,
    [grupoId, membroId]
  );
  await pool.query(
    `INSERT INTO group_members (group_id, user_id)
     SELECT $1, id FROM users WHERE email = 'atendimento@azuladministradora.com.br'`,
    [grupoId]
  );

  // Treinamentos de exemplo
  await pool.query(
    `INSERT INTO trainings (title, category, description, url) VALUES
      ('Primeiros passos no Tarefo', 'Onboarding',
       'Visão geral do sistema: tarefas, Torpedo e R.A.C.', ''),
      ('Boas práticas de atendimento', 'Atendimento',
       'Como conduzir um atendimento promotor e registrar a evolução.', '')`
  );
}

// Clientes, projetos e tarefas de exemplo.
async function seedTasks() {
  const { rows } = await pool.query<{ count: string }>(
    "SELECT count(*)::int AS count FROM clients"
  );
  if (Number(rows[0]?.count ?? 0) > 0) return;

  // Clientes de exemplo
  const clients = await pool.query<{ id: string }>(
    `INSERT INTO clients (name) VALUES
      ('Condomínio Edifício Azul'),
      ('Residencial Smart Living'),
      ('Cliente Avulso')
     RETURNING id`
  );

  // Projetos de exemplo
  const projects = await pool.query<{ id: string }>(
    `INSERT INTO projects (name) VALUES
      ('Implantação 2026'),
      ('Manutenção Predial')
     RETURNING id`
  );

  const c0 = clients.rows[0]?.id ?? null;
  const c1 = clients.rows[1]?.id ?? null;
  const p0 = projects.rows[0]?.id ?? null;

  // Donos das tarefas (para a regra de visibilidade)
  const usr = await pool.query<{ id: string; username: string }>(
    `SELECT id, username FROM users`
  );
  const byUser = Object.fromEntries(usr.rows.map((u) => [u.username, u.id]));
  const bruno = byUser["brunotga"] ?? null;
  const atendimento = byUser["atendimento"] ?? null;

  // Tarefas de exemplo (com dono)
  const tasks = await pool.query<{ id: string }>(
    `INSERT INTO tasks (name, type, status, description, responsavel, due_date, client_id, project_id, tags, owner_id)
     VALUES
      ('Aprovar prestação de contas', 'PRIORIDADE_MAXIMA', 'EM_ANDAMENTO',
        'Revisar e aprovar a prestação de contas do mês.', 'Bruno Tarefo',
        now() + interval '3 days', $1, $3, 'financeiro,mensal', $4),
      ('Agendar assembleia', 'URGENTE', 'A_FAZER',
        'Definir data e convocar moradores para a assembleia.', 'Equipe Atendimento',
        now() + interval '7 days', $1, null, 'assembleia', $5),
      ('Atualizar cadastro de moradores', 'PADRAO', 'A_FAZER',
        'Conferir e atualizar os dados dos moradores no sistema.', 'Equipe Atendimento',
        now() + interval '14 days', $2, $3, 'cadastro', $5)
     RETURNING id`,
    [c0, c1, p0, bruno, atendimento]
  );
  const t0 = tasks.rows[0]?.id; // Aprovar prestação de contas (dono: Bruno)

  // Atendimento é colaborador da tarefa do Bruno (aparece em verde no Meu Tarefo dele)
  if (t0 && atendimento) {
    await pool.query(
      `INSERT INTO task_collaborators (task_id, user_id) VALUES ($1,$2)`,
      [t0, atendimento]
    );
    // Comentário com menção @atendimento -> alimenta a coluna "Marcação de Tarefa - MD"
    const cmt = await pool.query<{ id: string }>(
      `INSERT INTO comments (body, author_name, task_id)
       VALUES ('Por favor revisar os valores, @atendimento.', 'Bruno Tarefo', $1)
       RETURNING id`,
      [t0]
    );
    await pool.query(
      `INSERT INTO mentions (task_id, comment_id, user_id) VALUES ($1,$2,$3)`,
      [t0, cmt.rows[0].id, atendimento]
    );
  }

  // Modelos de tarefa de exemplo (com etapas/procedimentos)
  const tmpl1 = await pool.query<{ id: string }>(
    `INSERT INTO task_templates (name, type, description, responsavel, due_days, tags, client_id)
     VALUES ('Prestação de contas mensal', 'PRIORIDADE_MAXIMA',
       'Fechamento e aprovação da prestação de contas do mês.', 'Financeiro', 5,
       'financeiro,mensal', $1) RETURNING id`,
    [c0]
  );
  const t1 = tmpl1.rows[0].id;
  await pool.query(
    `INSERT INTO template_steps (template_id, name, "order", sequential) VALUES
      ($1,'Conferir lançamentos',0,true),
      ($1,'Gerar relatório',1,true),
      ($1,'Aprovar e publicar',2,true)`,
    [t1]
  );

  const tmpl2 = await pool.query<{ id: string }>(
    `INSERT INTO task_templates (name, type, description, responsavel, due_days, tags)
     VALUES ('Convocação de assembleia', 'URGENTE',
       'Organizar e convocar assembleia de moradores.', 'Atendimento', 10, 'assembleia')
     RETURNING id`
  );
  const t2 = tmpl2.rows[0].id;
  await pool.query(
    `INSERT INTO template_steps (template_id, name, "order", sequential) VALUES
      ($1,'Definir pauta e data',0,false),
      ($1,'Enviar convocação',1,false)`,
    [t2]
  );

  // Lote de exemplo agrupando os dois modelos
  const batch = await pool.query<{ id: string }>(
    `INSERT INTO task_batches (name, description)
     VALUES ('Rotina mensal do condomínio', 'Tarefas recorrentes de todo mês.')
     RETURNING id`
  );
  await pool.query(
    `INSERT INTO batch_templates (batch_id, template_id) VALUES ($1,$2),($1,$3)`,
    [batch.rows[0].id, t1, t2]
  );
}
