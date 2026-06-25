import { Pool } from "pg";
import { SCHEMA_SQL } from "./schema";

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
      await seedIfEmpty();
    })();
  }
  return globalForDb._ready;
}

async function seedIfEmpty() {
  const { rows } = await pool.query<{ count: string }>(
    "SELECT count(*)::int AS count FROM clients"
  );
  if (Number(rows[0]?.count ?? 0) > 0) return;

  // Usuários de exemplo
  await pool.query(
    `INSERT INTO users (name, email, role) VALUES
      ('Administrador', 'admin@azuladministradora.com.br', 'Administrador'),
      ('Bruno Tarefo', 'brunotga@yahoo.com.br', 'Gestor'),
      ('Equipe Atendimento', 'atendimento@azuladministradora.com.br', 'Membro')`
  );

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

  // Tarefas de exemplo
  await pool.query(
    `INSERT INTO tasks (name, type, status, description, responsavel, due_date, client_id, project_id, tags)
     VALUES
      ('Aprovar prestação de contas', 'PRIORIDADE_MAXIMA', 'EM_ANDAMENTO',
        'Revisar e aprovar a prestação de contas do mês.', 'Bruno Tarefo',
        now() + interval '3 days', $1, $3, 'financeiro,mensal'),
      ('Agendar assembleia', 'URGENTE', 'A_FAZER',
        'Definir data e convocar moradores para a assembleia.', 'Equipe Atendimento',
        now() + interval '7 days', $1, null, 'assembleia'),
      ('Atualizar cadastro de moradores', 'PADRAO', 'A_FAZER',
        'Conferir e atualizar os dados dos moradores no sistema.', 'Equipe Atendimento',
        now() + interval '14 days', $2, $3, 'cadastro')`,
    [c0, c1, p0]
  );
}
