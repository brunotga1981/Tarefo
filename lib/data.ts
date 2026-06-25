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
  subtask_count?: number;
  is_collaborator?: boolean;
  pending_mentions?: number;
};

export type Named = { id: string; name: string };

const TASK_SELECT = `
  SELECT t.*, c.name AS client_name, p.name AS project_name,
    (SELECT count(*)::int FROM tasks s WHERE s.parent_id = t.id) AS subtask_count
  FROM tasks t
  LEFT JOIN clients c ON c.id = t.client_id
  LEFT JOIN projects p ON p.id = t.project_id
`;

const TYPE_RANK =
  "CASE t.type WHEN 'PRIORIDADE_MAXIMA' THEN 0 WHEN 'URGENTE' THEN 1 ELSE 2 END";

// Tarefas de topo visíveis para o usuário (dono, colaborador, mencionado ou admin).
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

  const visibility = canViewAll
    ? "TRUE"
    : `(t.owner_id = $1
        OR EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = t.id AND tc.user_id = $1)
        OR EXISTS (SELECT 1 FROM mentions m WHERE m.task_id = t.id AND m.user_id = $1))`;

  return query<TaskRow>(
    `SELECT t.*, c.name AS client_name, p.name AS project_name,
       (SELECT count(*)::int FROM tasks s WHERE s.parent_id = t.id) AS subtask_count,
       EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = t.id AND tc.user_id = $1) AS is_collaborator,
       (SELECT count(*)::int FROM mentions m WHERE m.task_id = t.id AND m.user_id = $1 AND m.resolved = false) AS pending_mentions
     FROM tasks t
     LEFT JOIN clients c ON c.id = t.client_id
     LEFT JOIN projects p ON p.id = t.project_id
     WHERE t.parent_id IS NULL AND ${visibility}
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
  { id: string; name: string; username: string | null }[]
> {
  return query(`SELECT id, name, username FROM users ORDER BY name`);
}

export async function listClients(): Promise<Named[]> {
  return query<Named>("SELECT id, name FROM clients ORDER BY name");
}

export async function listProjects(): Promise<Named[]> {
  return query<Named>("SELECT id, name FROM projects ORDER BY name");
}
