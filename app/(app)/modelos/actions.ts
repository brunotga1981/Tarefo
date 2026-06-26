"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { instantiateTemplate, instantiateBatch } from "@/lib/templates";

async function requireManage() {
  const user = await getCurrentUser();
  if (!can(user, "templates.manage")) throw new Error("Sem permissão.");
  return user!;
}

// Criar tarefas (a partir de modelo/lote) requer apenas permissão de criar tarefas.
async function requireCreate() {
  const user = await getCurrentUser();
  if (!can(user, "tasks.manage")) throw new Error("Sem permissão.");
  return user!;
}

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
function nul(fd: FormData, k: string): string | null {
  const s = str(fd, k);
  return s === "" ? null : s;
}

// ---- Modelos ----
export async function createTemplateAction(fd: FormData) {
  await requireManage();
  const name = str(fd, "name");
  if (!name) return;
  const dueDays = nul(fd, "due_days");
  await query(
    `INSERT INTO task_templates (name, type, description, responsavel, due_days, tags, client_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      name,
      nul(fd, "type") ?? "PADRAO",
      nul(fd, "description"),
      nul(fd, "responsavel"),
      dueDays ? Number(dueDays) : null,
      nul(fd, "tags"),
      nul(fd, "client_id"),
    ]
  );
  revalidatePath("/modelos");
}

export async function addTemplateStepAction(fd: FormData) {
  await requireManage();
  const templateId = str(fd, "template_id");
  const name = str(fd, "name");
  if (!templateId || !name) return;
  await query(
    `INSERT INTO template_steps (template_id, name, "order", sequential)
     VALUES ($1,$2,COALESCE((SELECT max("order")+1 FROM template_steps WHERE template_id=$1),0),$3)`,
    [templateId, name, fd.get("sequential") === "on"]
  );
  revalidatePath("/modelos");
}

export async function deleteTemplateStepAction(fd: FormData) {
  await requireManage();
  await query(`DELETE FROM template_steps WHERE id = $1`, [str(fd, "id")]);
  revalidatePath("/modelos");
}

export async function instantiateTemplateAction(fd: FormData) {
  const user = await requireCreate();
  const id = await instantiateTemplate(str(fd, "template_id"), user.id);
  revalidatePath("/meu-tarefo");
  if (id) redirect(`/meu-tarefo/${id}`);
}

// ---- Lotes ----
export async function createBatchAction(fd: FormData) {
  await requireManage();
  const name = str(fd, "name");
  if (!name) return;
  const rows = await query<{ id: string }>(
    `INSERT INTO task_batches (name, description) VALUES ($1,$2) RETURNING id`,
    [name, nul(fd, "description")]
  );
  for (const tid of fd.getAll("template_ids")) {
    await query(
      `INSERT INTO batch_templates (batch_id, template_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [rows[0].id, String(tid)]
    );
  }
  revalidatePath("/modelos");
}

export async function instantiateBatchAction(fd: FormData) {
  const user = await requireCreate();
  await instantiateBatch(str(fd, "batch_id"), user.id);
  revalidatePath("/meu-tarefo");
  redirect("/meu-tarefo");
}

// ---- Agendamentos ----
export async function createScheduleAction(fd: FormData) {
  const user = await requireManage();
  const templateId = str(fd, "template_id");
  const startDate = str(fd, "start_date");
  if (!templateId || !startDate) return;
  const runTime = str(fd, "run_time") || "08:00";
  const nextRun = new Date(`${startDate}T${runTime}:00`);
  await query(
    `INSERT INTO task_schedules
       (template_id, owner_id, frequency, every, start_date, end_date, run_time, next_run)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      templateId,
      nul(fd, "owner_id") ?? user.id,
      nul(fd, "frequency") ?? "MENSAL",
      Number(nul(fd, "every") ?? "1") || 1,
      startDate,
      nul(fd, "end_date"),
      runTime,
      nextRun.toISOString(),
    ]
  );
  revalidatePath("/agendamentos");
}

export async function toggleScheduleAction(fd: FormData) {
  await requireManage();
  await query(
    `UPDATE task_schedules SET active = NOT active WHERE id = $1`,
    [str(fd, "id")]
  );
  revalidatePath("/agendamentos");
}

export async function deleteScheduleAction(fd: FormData) {
  await requireManage();
  await query(`DELETE FROM task_schedules WHERE id = $1`, [str(fd, "id")]);
  revalidatePath("/agendamentos");
}
