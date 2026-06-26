import { query } from "./db";

export type Template = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  responsavel: string | null;
  due_days: number | null;
  tags: string | null;
  client_id: string | null;
  client_name?: string | null;
  step_count?: number;
};

export type TemplateStep = {
  id: string;
  name: string;
  order: number;
  sequential: boolean;
};

export async function listTemplates(): Promise<Template[]> {
  return query<Template>(
    `SELECT t.*, c.name AS client_name,
       (SELECT count(*)::int FROM template_steps s WHERE s.template_id = t.id) AS step_count
     FROM task_templates t
     LEFT JOIN clients c ON c.id = t.client_id
     ORDER BY t.name`
  );
}

export async function getTemplateSteps(templateId: string): Promise<TemplateStep[]> {
  return query<TemplateStep>(
    `SELECT id, name, "order", sequential FROM template_steps
     WHERE template_id = $1 ORDER BY "order"`,
    [templateId]
  );
}

export type Batch = {
  id: string;
  name: string;
  description: string | null;
  template_count?: number;
};

export async function listBatches(): Promise<Batch[]> {
  return query<Batch>(
    `SELECT b.*,
       (SELECT count(*)::int FROM batch_templates bt WHERE bt.batch_id = b.id) AS template_count
     FROM task_batches b ORDER BY b.name`
  );
}

export async function getBatchTemplateIds(batchId: string): Promise<string[]> {
  const rows = await query<{ template_id: string }>(
    `SELECT template_id FROM batch_templates WHERE batch_id = $1`,
    [batchId]
  );
  return rows.map((r) => r.template_id);
}

// Cria uma tarefa real a partir de um modelo (com suas etapas como subtarefas).
export async function instantiateTemplate(
  templateId: string,
  ownerId: string | null
): Promise<string | null> {
  const tpl = await query<Template>(
    `SELECT * FROM task_templates WHERE id = $1`,
    [templateId]
  );
  const t = tpl[0];
  if (!t) return null;

  const dueExpr =
    t.due_days != null ? `now() + ($1 || ' days')::interval` : `NULL`;
  const params: unknown[] =
    t.due_days != null
      ? [String(t.due_days), t.name, t.type, t.description, t.responsavel, t.tags, t.client_id, ownerId]
      : [t.name, t.type, t.description, t.responsavel, t.tags, t.client_id, ownerId];
  const base = t.due_days != null ? 1 : 0; // deslocamento dos índices

  const inserted = await query<{ id: string }>(
    `INSERT INTO tasks
       (name, type, status, request_date, start_date, due_date, description,
        responsavel, tags, client_id, owner_id)
     VALUES ($${base + 1},$${base + 2},'A_FAZER',now(),now(),${dueExpr},
       $${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7})
     RETURNING id`,
    params
  );
  const taskId = inserted[0].id;

  const steps = await getTemplateSteps(templateId);
  for (const s of steps) {
    await query(
      `INSERT INTO tasks (name, status, parent_id, sequential, owner_id, "order")
       VALUES ($1,'A_FAZER',$2,$3,$4,$5)`,
      [s.name, taskId, s.sequential, ownerId, s.order]
    );
  }
  return taskId;
}

export async function instantiateBatch(
  batchId: string,
  ownerId: string | null
): Promise<number> {
  const ids = await getBatchTemplateIds(batchId);
  let count = 0;
  for (const id of ids) {
    const r = await instantiateTemplate(id, ownerId);
    if (r) count++;
  }
  return count;
}

// ---------- Agendamentos ----------
export type Schedule = {
  id: string;
  template_id: string;
  template_name?: string;
  owner_id: string | null;
  owner_name?: string | null;
  frequency: string;
  every: number;
  start_date: string;
  end_date: string | null;
  run_time: string;
  next_run: string;
  active: boolean;
};

export const FREQUENCY_LABELS: Record<string, string> = {
  DIARIA: "Diária",
  SEMANAL: "Semanal",
  MENSAL: "Mensal",
  ANUAL: "Anual",
};

export async function listSchedules(): Promise<Schedule[]> {
  return query<Schedule>(
    `SELECT s.*, t.name AS template_name, u.name AS owner_name
     FROM task_schedules s
     JOIN task_templates t ON t.id = s.template_id
     LEFT JOIN users u ON u.id = s.owner_id
     ORDER BY s.next_run`
  );
}

export function advance(date: Date, frequency: string, every: number): Date {
  const d = new Date(date);
  if (frequency === "DIARIA") d.setDate(d.getDate() + every);
  else if (frequency === "SEMANAL") d.setDate(d.getDate() + 7 * every);
  else if (frequency === "MENSAL") d.setMonth(d.getMonth() + every);
  else if (frequency === "ANUAL") d.setFullYear(d.getFullYear() + every);
  return d;
}

// "Cron preguiçoso": gera as tarefas dos agendamentos vencidos quando alguém acessa.
export async function runDueSchedules(): Promise<number> {
  const now = new Date();
  const due = await query<Schedule>(
    `SELECT * FROM task_schedules WHERE active = true AND next_run <= now()`
  );
  let created = 0;
  for (const s of due) {
    let nr = new Date(s.next_run);
    const end = s.end_date ? new Date(s.end_date + "T23:59:59") : null;
    let guard = 0;
    while (nr <= now && (!end || nr <= end) && guard < 200) {
      await instantiateTemplate(s.template_id, s.owner_id);
      created++;
      nr = advance(nr, s.frequency, s.every);
      guard++;
    }
    const stillActive = !end || nr <= end;
    await query(
      `UPDATE task_schedules SET next_run = $2, active = $3 WHERE id = $1`,
      [s.id, nr.toISOString(), stillActive]
    );
  }
  return created;
}
