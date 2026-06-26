import { query } from "./db";

export type TaskRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  request_date: string;
  start_date: string | null;
  due_date: string | null;
  description: string | null;
  responsavel: string | null;
  tags: string | null;
  client_id: string | null;
  project_id: string | null;
  parent_id: string | null;
  owner_id: string | null;
  sequential: boolean;
  order: number;
  client_name?: string | null;
  project_name?: string | null;
  owner_name?: string | null;
  parent_name?: string | null;
  depth?: number;
  subtask_count?: number;
  is_collaborator?: boolean;
  pending_mentions?: number;
  participants_total?: number;
  participants_done?: number;
};

export type Named = { id: string; name: string };

const TASK_SELECT = `
  SELECT t.*, c.name AS client_name, p.name AS project_name, ou.name AS owner_name,
    (SELECT count(*)::int FROM tasks s WHERE s.parent_id = t.id) AS subtask_count,
    (CASE
       WHEN t.parent_id IS NULL THEN 0
       WHEN (SELECT pp.parent_id FROM tasks pp WHERE pp.id = t.parent_id) IS NULL THEN 1
       ELSE 2
     END) AS depth
  FROM tasks t
  LEFT JOIN clients c ON c.id = t.client_id
  LEFT JOIN projects p ON p.id = t.project_id
  LEFT JOIN users ou ON ou.id = t.owner_id
`;

const TYPE_RANK =
  "CASE t.type WHEN 'PRIORIDADE_MAXIMA' THEN 0 WHEN 'URGENTE' THEN 1 ELSE 2 END";

// Cartões do "Meu Tarefo": tarefas de topo visíveis + subtarefas atribuídas/relacionadas ao usuário.
export async function listVisibleTasks(
  userId: string,
  canViewAll: boolean,
  sort = "priority"
): Promise<TaskRow[]> {
  let order = `ORDER BY ${TYPE_RANK}, t.due_date NULLS LAST`;
  if (sort === "due") order = "ORDER BY t.due_date NULLS LAST";
  else if (sort === "client") order = "ORDER BY client_name NULLS LAST";
  else if (sort === "responsavel") order = "ORDER BY t.responsavel NULLS LAST";
  else if (sort === "recent") order = "ORDER BY t.created_at DESC";

  // Vínculo direto do usuário com a tarefa (dono, colaborador ou mencionado).
  const directStake = `(t.owner_id = $1
      OR EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = t.id AND tc.user_id = $1)
      OR EXISTS (SELECT 1 FROM mentions m WHERE m.task_id = t.id AND m.user_id = $1))`;

  // Topo: regra de visibilidade normal (admin vê todas). Subtarefa: só se houver vínculo direto.
  const where = `(
      (t.parent_id IS NULL AND (${canViewAll ? "TRUE" : directStake}))
      OR
      (t.parent_id IS NOT NULL AND ${directStake})
    )`;

  return query<TaskRow>(
    `SELECT t.*, c.name AS client_name, p.name AS project_name,
       pt.name AS parent_name,
       (SELECT count(*)::int FROM tasks s WHERE s.parent_id = t.id) AS subtask_count,
       EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = t.id AND tc.user_id = $1) AS is_collaborator,
       (SELECT count(*)::int FROM mentions m WHERE m.task_id = t.id AND m.user_id = $1 AND m.resolved = false) AS pending_mentions,
       ((CASE WHEN t.owner_id IS NOT NULL THEN 1 ELSE 0 END)
         + (SELECT count(*)::int FROM task_collaborators tc WHERE tc.task_id = t.id AND tc.user_id IS DISTINCT FROM t.owner_id)) AS participants_total,
       (SELECT count(*)::int FROM task_completions cp WHERE cp.task_id = t.id) AS participants_done
     FROM tasks t
     LEFT JOIN clients c ON c.id = t.client_id
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN tasks pt ON pt.id = t.parent_id
     WHERE ${where}
     ${order}`,
    [userId]
  );
}

export async function canViewTask(
  taskId: string,
  userId: string,
  canViewAll: boolean
): Promise<boolean> {
  if (canViewAll) {
    const r = await query(`SELECT 1 FROM tasks WHERE id = $1`, [taskId]);
    return r.length > 0;
  }
  const r = await query(
    `SELECT 1 FROM tasks t WHERE t.id = $1 AND (
        t.owner_id = $2
        OR EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = t.id AND tc.user_id = $2)
        OR EXISTS (SELECT 1 FROM mentions m WHERE m.task_id = t.id AND m.user_id = $2)
        OR EXISTS (SELECT 1 FROM tasks pt WHERE pt.id = t.parent_id AND pt.owner_id = $2))`,
    [taskId, userId]
  );
  return r.length > 0;
}

export async function getTask(id: string): Promise<TaskRow | null> {
  const rows = await query<TaskRow>(`${TASK_SELECT} WHERE t.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function getSubtasks(parentId: string): Promise<TaskRow[]> {
  return query<TaskRow>(
    `${TASK_SELECT} WHERE t.parent_id = $1 ORDER BY t.order, t.created_at`,
    [parentId]
  );
}

export type CommentRow = {
  id: string;
  body: string;
  author_name: string;
  created_at: string;
  mentions_me_pending: boolean;
};

export async function getComments(
  taskId: string,
  userId: string
): Promise<CommentRow[]> {
  return query<CommentRow>(
    `SELECT c.id, c.body, c.author_name, c.created_at,
       EXISTS (SELECT 1 FROM mentions m
               WHERE m.comment_id = c.id AND m.user_id = $2 AND m.resolved = false)
         AS mentions_me_pending
     FROM comments c
     WHERE c.task_id = $1 ORDER BY c.created_at DESC`,
    [taskId, userId]
  );
}

export type AttachmentRow = {
  id: string;
  filename: string;
  url: string;
  size: number;
  created_at: string;
};

export async function getAttachments(taskId: string): Promise<AttachmentRow[]> {
  return query<AttachmentRow>(
    `SELECT id, filename, url, size, created_at FROM attachments
     WHERE task_id = $1 ORDER BY created_at DESC`,
    [taskId]
  );
}

export async function getCollaborators(taskId: string): Promise<Named[]> {
  return query<Named>(
    `SELECT u.id, u.name FROM task_collaborators tc
     JOIN users u ON u.id = tc.user_id
     WHERE tc.task_id = $1 ORDER BY u.name`,
    [taskId]
  );
}

export async function listUsersBasic(): Promise<
  { id: string; name: string; username: string | null; presence: string }[]
> {
  return query(
    `SELECT id, name, username, COALESCE(presence,'Disponível') AS presence
     FROM users ORDER BY name`
  );
}

export type Participant = {
  id: string;
  name: string;
  is_owner: boolean;
  done: boolean;
};

// Participantes da tarefa = dono + colaboradores (cada um divide a responsabilidade).
export async function getParticipants(taskId: string): Promise<Participant[]> {
  const o = await query<{ owner_id: string | null }>(
    `SELECT owner_id FROM tasks WHERE id = $1`,
    [taskId]
  );
  const owner = o[0]?.owner_id ?? null;
  return query<Participant>(
    `SELECT u.id, u.name,
       (u.id = $2) AS is_owner,
       EXISTS (SELECT 1 FROM task_completions cp WHERE cp.task_id = $1 AND cp.user_id = u.id) AS done
     FROM users u
     WHERE u.id = $2
        OR u.id IN (SELECT user_id FROM task_collaborators WHERE task_id = $1)
     ORDER BY is_owner DESC, u.name`,
    [taskId, owner]
  );
}

export async function getParticipantIds(taskId: string): Promise<string[]> {
  return (await getParticipants(taskId)).map((p) => p.id);
}

export async function listClients(): Promise<Named[]> {
  return query<Named>("SELECT id, name FROM clients ORDER BY name");
}

export async function listProjects(): Promise<Named[]> {
  return query<Named>("SELECT id, name FROM projects ORDER BY name");
}
