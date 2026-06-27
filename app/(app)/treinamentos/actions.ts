"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";
import { PASS_SCORE } from "@/lib/lms";

async function requireManage() {
  const user = await getCurrentUser();
  if (!can(user, "trainings.manage")) throw new Error("Sem permissão.");
  return user!;
}
function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

// ---- Curso ----
export async function createCourseAction(fd: FormData) {
  await requireManage();
  const title = str(fd, "title");
  if (!title) return;
  let imageUrl = str(fd, "image_url") || null;
  const file = fd.get("image");
  if (file instanceof File && file.size > 0) {
    imageUrl = (await saveUpload(file, "curso")).url;
  }
  const rows = await query<{ id: string }>(
    `INSERT INTO trainings (title, theme, subtheme, description, image_url)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [
      title,
      str(fd, "theme") || null,
      str(fd, "subtheme") || null,
      str(fd, "description") || null,
      imageUrl,
    ]
  );
  revalidatePath("/treinamentos");
  redirect(`/treinamentos/${rows[0].id}`);
}

export async function deleteCourseAction(fd: FormData) {
  await requireManage();
  await query(`DELETE FROM trainings WHERE id=$1`, [str(fd, "id")]);
  revalidatePath("/treinamentos");
  redirect("/treinamentos");
}

// ---- Materiais ----
export async function addMaterialAction(fd: FormData) {
  await requireManage();
  const trainingId = str(fd, "training_id");
  const title = str(fd, "title");
  if (!trainingId || !title) return;
  let url = str(fd, "url");
  const file = fd.get("file");
  if (file instanceof File && file.size > 0) {
    url = (await saveUpload(file, "material")).url;
  }
  if (!url) return;
  await query(
    `INSERT INTO training_materials (training_id, kind, title, url, "order")
     VALUES ($1,$2,$3,$4,COALESCE((SELECT max("order")+1 FROM training_materials WHERE training_id=$1),0))`,
    [trainingId, str(fd, "kind") || "LINK", title, url]
  );
  revalidatePath(`/treinamentos/${trainingId}`);
}

export async function deleteMaterialAction(fd: FormData) {
  await requireManage();
  const trainingId = str(fd, "training_id");
  await query(`DELETE FROM training_materials WHERE id=$1`, [str(fd, "id")]);
  revalidatePath(`/treinamentos/${trainingId}`);
}

// ---- Quiz (perguntas) ----
export async function addQuestionAction(fd: FormData) {
  await requireManage();
  const trainingId = str(fd, "training_id");
  const prompt = str(fd, "prompt");
  const options = [0, 1, 2, 3]
    .map((i) => str(fd, `opt${i}`))
    .filter((t) => t !== "");
  const correct = Number(str(fd, "correct"));
  if (!trainingId || !prompt || options.length < 2) return;

  const q = await query<{ id: string }>(
    `INSERT INTO training_questions (training_id, prompt, "order")
     VALUES ($1,$2,COALESCE((SELECT max("order")+1 FROM training_questions WHERE training_id=$1),0))
     RETURNING id`,
    [trainingId, prompt]
  );
  for (let i = 0; i < options.length; i++) {
    await query(
      `INSERT INTO training_options (question_id, text, is_correct, "order")
       VALUES ($1,$2,$3,$4)`,
      [q[0].id, options[i], i === correct, i]
    );
  }
  revalidatePath(`/treinamentos/${trainingId}`);
}

export async function deleteQuestionAction(fd: FormData) {
  await requireManage();
  const trainingId = str(fd, "training_id");
  await query(`DELETE FROM training_questions WHERE id=$1`, [str(fd, "id")]);
  revalidatePath(`/treinamentos/${trainingId}`);
}

// ---- Submeter quiz ----
export async function submitQuizAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const trainingId = str(fd, "training_id");
  if (!trainingId) return;

  const questions = await query<{ id: string }>(
    `SELECT id FROM training_questions WHERE training_id=$1`,
    [trainingId]
  );
  if (questions.length === 0) return;

  const correct = await query<{ question_id: string; id: string }>(
    `SELECT q.id AS question_id, o.id FROM training_questions q
     JOIN training_options o ON o.question_id=q.id AND o.is_correct=true
     WHERE q.training_id=$1`,
    [trainingId]
  );
  const correctMap = new Map(correct.map((c) => [c.question_id, c.id]));

  let hits = 0;
  for (const q of questions) {
    if (str(fd, `q_${q.id}`) === correctMap.get(q.id)) hits++;
  }
  const score = Math.round((hits / questions.length) * 100);
  const passed = score >= PASS_SCORE;

  await query(
    `INSERT INTO training_completions (training_id, user_id, score, passed, completed_at)
     VALUES ($1,$2,$3,$4,now())
     ON CONFLICT (training_id, user_id)
     DO UPDATE SET score=GREATEST(training_completions.score, EXCLUDED.score),
       passed=(training_completions.passed OR EXCLUDED.passed), completed_at=now()`,
    [trainingId, user.id, score, passed]
  );
  revalidatePath("/treinamentos");
  redirect(`/treinamentos/${trainingId}/quiz?score=${score}`);
}

// ---- Fórum ----
export async function addForumPostAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const trainingId = str(fd, "training_id");
  const body = str(fd, "body");
  if (!trainingId || !body) return;
  await query(
    `INSERT INTO training_forum (training_id, user_id, author_name, parent_id, body)
     VALUES ($1,$2,$3,$4,$5)`,
    [trainingId, user.id, user.name, str(fd, "parent_id") || null, body]
  );
  revalidatePath(`/treinamentos/${trainingId}`);
}
