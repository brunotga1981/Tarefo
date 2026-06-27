"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";

async function requireManage() {
  const user = await getCurrentUser();
  if (!can(user, "trainings.manage")) throw new Error("Sem permissão.");
}

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

export async function createTrainingAction(fd: FormData) {
  await requireManage();
  const title = str(fd, "title");
  if (!title) return;
  await query(
    `INSERT INTO trainings (title, category, description, url) VALUES ($1,$2,$3,$4)`,
    [title, str(fd, "category") || null, str(fd, "description") || null, str(fd, "url") || null]
  );
  revalidatePath("/treinamentos");
}

export async function deleteTrainingAction(fd: FormData) {
  await requireManage();
  await query(`DELETE FROM trainings WHERE id = $1`, [str(fd, "id")]);
  revalidatePath("/treinamentos");
}
