"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { query } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { getParticipantIds } from "@/lib/data";

function nullable(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function createTaskAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const name = nullable(formData.get("name"));
  if (!name) return;

  const parentId = nullable(formData.get("parent_id"));

  // Dono da nova tarefa: na subtarefa pode ser atribuída a outra pessoa.
  let ownerId = user.id;

  if (parentId) {
    const p = await query<{ owner_id: string | null; parent_id: string | null }>(
      `SELECT owner_id, parent_id FROM tasks WHERE id = $1`,
      [parentId]
    );
    const parent = p[0];
    if (!parent) return;

    // Apenas o dono da tarefa-pai (ou Administrador) pode abrir subtarefas.
    if (parent.owner_id !== user.id && !can(user, "tasks.view_all")) return;

    // Limite de profundidade: principal -> subtarefa -> sub-subtarefa (2 níveis).
    let parentDepth = 0;
    if (parent.parent_id) {
      const gp = await query<{ parent_id: string | null }>(
        `SELECT parent_id FROM tasks WHERE id = $1`,
        [parent.parent_id]
      );
      parentDepth = gp[0]?.parent_id ? 2 : 1;
    }
    if (parentDepth >= 2) return; // criaria um 3º nível — não permitido

    // Atribuição da subtarefa (responsável que "recebe" a subtarefa)
    ownerId = nullable(formData.get("owner_id")) ?? user.id;
  }

  const rows = await query<{ id: string }>(
    `INSERT INTO tasks
       (name, type, status, start_date, due_date, description, responsavel, tags,
        client_id, project_id, parent_id, sequential, owner_id, "order")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
       COALESCE((SELECT max("order")+1 FROM tasks WHERE parent_id IS NOT DISTINCT FROM $11), 0))
     RETURNING id`,
    [
      name,
      nullable(formData.get("type")) ?? "PADRAO",
      nullable(formData.get("status")) ?? "A_FAZER",
      nullable(formData.get("start_date")),
      nullable(formData.get("due_date")),
      nullable(formData.get("description")),
      nullable(formData.get("responsavel")),
      nullable(formData.get("tags")),
      nullable(formData.get("client_id")),
      nullable(formData.get("project_id")),
      parentId,
      formData.get("sequential") === "on",
      ownerId,
    ]
  );

  revalidatePath("/meu-tarefo");
  if (parentId) {
    revalidatePath(`/meu-tarefo/${parentId}`);
    return;
  }
  redirect(`/meu-tarefo/${rows[0].id}`);
}

export async function updateStatusAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  // Regra: subtarefa sequencial só inicia após a anterior ser concluída.
  if (status !== "A_FAZER") {
    const cur = await query<{
      parent_id: string | null;
      sequential: boolean;
      order: number;
    }>(`SELECT parent_id, sequential, "order" FROM tasks WHERE id = $1`, [id]);
    const t = cur[0];
    if (t?.parent_id && t.sequential) {
      const pending = await query<{ count: string }>(
        `SELECT count(*)::int AS count FROM tasks
         WHERE parent_id = $1 AND "order" < $2 AND status <> 'CONCLUIDA'`,
        [t.parent_id, t.order]
      );
      if (Number(pending[0]?.count ?? 0) > 0) {
        revalidatePath(`/meu-tarefo/${id}`);
        revalidatePath("/meu-tarefo");
        return;
      }
    }
  }

  await query(`UPDATE tasks SET status = $2, updated_at = now() WHERE id = $1`, [
    id,
    status,
  ]);
  revalidatePath("/meu-tarefo");
  revalidatePath(`/meu-tarefo/${id}`);
}

export async function addCommentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const taskId = String(formData.get("task_id"));
  const body = nullable(formData.get("body"));
  if (!body) return;

  const inserted = await query<{ id: string }>(
    `INSERT INTO comments (body, author_name, author_id, task_id)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [body, user.name, user.id, taskId]
  );
  const commentId = inserted[0].id;

  // Detecta menções @usuario e registra para a coluna "Marcação de Tarefa - MD"
  const handles = Array.from(body.matchAll(/@([a-z0-9_.-]+)/gi)).map((m) =>
    m[1].toLowerCase()
  );
  if (handles.length) {
    const users = await query<{ id: string; username: string | null }>(
      `SELECT id, username FROM users WHERE lower(username) = ANY($1)`,
      [handles]
    );
    for (const u of users) {
      if (u.id === user.id) continue; // não menciona a si mesmo
      await query(
        `INSERT INTO mentions (task_id, comment_id, user_id) VALUES ($1,$2,$3)`,
        [taskId, commentId, u.id]
      );
    }
  }

  revalidatePath("/meu-tarefo");
  revalidatePath(`/meu-tarefo/${taskId}`);
}

export async function resolveMentionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const commentId = String(formData.get("comment_id"));
  const taskId = String(formData.get("task_id"));
  await query(
    `UPDATE mentions SET resolved = true WHERE comment_id = $1 AND user_id = $2`,
    [commentId, user.id]
  );
  revalidatePath("/meu-tarefo");
  revalidatePath(`/meu-tarefo/${taskId}`);
}

export async function addCollaboratorAction(formData: FormData) {
  const taskId = String(formData.get("task_id"));
  const userId = nullable(formData.get("user_id"));
  if (!userId) return;
  await query(
    `INSERT INTO task_collaborators (task_id, user_id) VALUES ($1,$2)
     ON CONFLICT DO NOTHING`,
    [taskId, userId]
  );
  revalidatePath("/meu-tarefo");
  revalidatePath(`/meu-tarefo/${taskId}`);
}

export async function removeCollaboratorAction(formData: FormData) {
  const taskId = String(formData.get("task_id"));
  const userId = String(formData.get("user_id"));
  await query(
    `DELETE FROM task_collaborators WHERE task_id = $1 AND user_id = $2`,
    [taskId, userId]
  );
  revalidatePath("/meu-tarefo");
  revalidatePath(`/meu-tarefo/${taskId}`);
}

// Finaliza apenas a colaboração do usuário atual.
export async function finalizeMyShareAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const taskId = String(formData.get("task_id"));

  const participants = await getParticipantIds(taskId);
  if (!participants.includes(user.id)) return; // não é participante

  await query(
    `INSERT INTO task_completions (task_id, user_id) VALUES ($1,$2)
     ON CONFLICT DO NOTHING`,
    [taskId, user.id]
  );

  // Se todos os participantes concluíram, a tarefa é finalizada por completo.
  const done = await query<{ count: string }>(
    `SELECT count(*)::int AS count FROM task_completions WHERE task_id = $1`,
    [taskId]
  );
  if (Number(done[0]?.count ?? 0) >= participants.length) {
    await query(
      `UPDATE tasks SET status = 'CONCLUIDA', updated_at = now() WHERE id = $1`,
      [taskId]
    );
  }

  revalidatePath("/meu-tarefo");
  revalidatePath(`/meu-tarefo/${taskId}`);
}

// Finaliza 100% da tarefa (marca todos os participantes e conclui).
export async function finalizeWholeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const taskId = String(formData.get("task_id"));

  // Apenas o dono da tarefa ou o Administrador podem finalizar 100%.
  const owner = await query<{ owner_id: string | null }>(
    `SELECT owner_id FROM tasks WHERE id = $1`,
    [taskId]
  );
  const isOwner = owner[0]?.owner_id === user.id;
  if (!isOwner && !can(user, "tasks.view_all")) return;

  const participants = await getParticipantIds(taskId);
  for (const uid of participants) {
    await query(
      `INSERT INTO task_completions (task_id, user_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [taskId, uid]
    );
  }
  await query(
    `UPDATE tasks SET status = 'CONCLUIDA', updated_at = now() WHERE id = $1`,
    [taskId]
  );

  revalidatePath("/meu-tarefo");
  revalidatePath(`/meu-tarefo/${taskId}`);
}

export async function uploadAttachmentAction(formData: FormData) {
  const taskId = String(formData.get("task_id"));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stored = `${taskId}-${safe}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, stored), buffer);

  await query(
    `INSERT INTO attachments (filename, url, size, task_id) VALUES ($1,$2,$3,$4)`,
    [file.name, `/uploads/${stored}`, file.size, taskId]
  );
  revalidatePath(`/meu-tarefo/${taskId}`);
}
