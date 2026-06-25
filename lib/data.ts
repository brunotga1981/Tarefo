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
  sequential: boolean;
  order: number;
  client_name?: string | null;
  project_name?: string | null;
  subtask_count?: number;
};

export type Named = { id: string; name: string };

const TASK_SELECT = `
  SELECT t.*, c.name AS client_name, p.name AS project_name,
    (SELECT count(*)::int FROM tasks s WHERE s.parent_id = t.id) AS subtask_count
  FROM tasks t
  LEFT JOIN clients c ON c.id = t.client_id
  LEFT JOIN projects p ON p.id = t.project_id
`;

const TYPE_RANK = "CASE t.type WHEN 'PRIORIDADE_MAXIMA' THEN 0 WHEN 'URGENTE' THEN 1 ELSE 2 END";

export async function listTopTasks(sort = "priority"): Promise<TaskRow[]> {
  let order = `ORDER BY ${TYPE_RANK}, t.due_date NULLS LAST`;
  if (sort === "due") order = "ORDER BY t.due_date NULLS LAST";
  else if (sort === "client") order = "ORDER BY client_name NULLS LAST";
  else if (sort === "responsavel") order = "ORDER BY t.responsavel NULLS LAST";
  else if (sort === "recent") order = "ORDER BY t.created_at DESC";

  return query<TaskRow>(
    `${TASK_SELECT} WHERE t.parent_id IS NULL ${order}`
  );
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
};

export async function getComments(taskId: string): Promise<CommentRow[]> {
  return query<CommentRow>(
    `SELECT id, body, author_name, created_at FROM comments
     WHERE task_id = $1 ORDER BY created_at DESC`,
    [taskId]
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

export async function listClients(): Promise<Named[]> {
  return query<Named>("SELECT id, name FROM clients ORDER BY name");
}

export async function listProjects(): Promise<Named[]> {
  return query<Named>("SELECT id, name FROM projects ORDER BY name");
}
