"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { query } from "@/lib/db";

function nullable(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function createTaskAction(formData: FormData) {
  const name = nullable(formData.get("name"));
  if (!name) return;

  const parentId = nullable(formData.get("parent_id"));

  const rows = await query<{ id: string }>(
    `INSERT INTO tasks
       (name, type, status, start_date, due_date, description, responsavel, tags,
        client_id, project_id, parent_id, sequential, "order")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
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
    const cur = await query<{ parent_id: string | null; sequential: boolean; order: number }>(
      `SELECT parent_id, sequential, "order" FROM tasks WHERE id = $1`,
      [id]
    );
    const t = cur[0];
    if (t?.parent_id && t.sequential) {
      const pending = await query<{ count: string }>(
        `SELECT count(*)::int AS count FROM tasks
         WHERE parent_id = $1 AND "order" < $2 AND status <> 'CONCLUIDA'`,
        [t.parent_id, t.order]
      );
      if (Number(pending[0]?.count ?? 0) > 0) {
        // Bloqueia a transição: revalida para o select voltar ao status real.
        revalidatePath(`/meu-tarefo/${id}`);
        revalidatePath("/meu-tarefo");
        return;
      }
    }
  }

  await query(
    `UPDATE tasks SET status = $2, updated_at = now() WHERE id = $1`,
    [id, status]
  );
  revalidatePath("/meu-tarefo");
  revalidatePath(`/meu-tarefo/${id}`);
}

export async function addCommentAction(formData: FormData) {
  const taskId = String(formData.get("task_id"));
  const body = nullable(formData.get("body"));
  if (!body) return;
  const author = nullable(formData.get("author_name")) ?? "Usuário Demo";

  await query(
    `INSERT INTO comments (body, author_name, task_id) VALUES ($1,$2,$3)`,
    [body, author, taskId]
  );
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
