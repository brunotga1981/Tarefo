"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";
import { PASS_SCORE } from "@/lib/lms";
import {
  generateQuizWithAI,
  generateCourseContent,
  generatePostImage,
  generateSlides,
  rateForumAnswer,
} from "@/lib/ai";

export type AiQuizState = { error?: string; created?: number };
export type AiContentState = { error?: string; ok?: boolean };
export type AiImageState = { error?: string; ok?: boolean };
export type AiSlidesState = { error?: string; created?: number };

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
    `INSERT INTO trainings (title, theme, subtheme, description, image_url, mandatory, group_id, deadline, tutor_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      title,
      str(fd, "theme") || null,
      str(fd, "subtheme") || null,
      str(fd, "description") || null,
      imageUrl,
      fd.get("mandatory") === "on",
      str(fd, "group_id") || null,
      str(fd, "deadline") || null,
      str(fd, "tutor_id") || null,
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

// ---- Gerar conteúdo do curso com IA (com anexos de apoio) ----
export async function generateContentAction(
  _prev: AiContentState,
  fd: FormData
): Promise<AiContentState> {
  await requireManage();
  const trainingId = str(fd, "training_id");
  if (!trainingId) return { error: "Curso inválido." };
  const difficulty = str(fd, "difficulty") || "Médio";

  const course = await query<{ title: string; description: string | null }>(
    `SELECT title, description FROM trainings WHERE id=$1`,
    [trainingId]
  );

  // Referência: texto colado + arquivos anexos (texto é lido; demais entram como material)
  let reference = str(fd, "reference");
  const files = fd.getAll("attachments").filter((f) => f instanceof File) as File[];
  for (const file of files) {
    if (file.size === 0) continue;
    const saved = await saveUpload(file, "ref");
    // anexo também vira material do curso
    await query(
      `INSERT INTO training_materials (training_id, kind, title, url, "order")
       VALUES ($1,$2,$3,$4,COALESCE((SELECT max("order")+1 FROM training_materials WHERE training_id=$1),0))`,
      [trainingId, "OUTRO", file.name, saved.url]
    );
    // se for texto, agrega ao material de referência da IA
    if (file.type.startsWith("text/")) {
      try {
        reference += "\n\n" + (await file.text());
      } catch {
        /* ignora */
      }
    } else {
      reference += `\n\n[Anexo: ${file.name}]`;
    }
  }
  if (course[0]?.description) reference += `\n\nDescrição: ${course[0].description}`;
  if (!reference.trim()) {
    return { error: "Forneça um texto de referência ou anexos para a IA." };
  }

  try {
    const content = await generateCourseContent(
      course[0]?.title ?? "Curso",
      reference,
      difficulty
    );
    await query(`UPDATE trainings SET content=$2 WHERE id=$1`, [
      trainingId,
      content,
    ]);
    revalidatePath(`/treinamentos/${trainingId}`);
    return { ok: true };
  } catch (e: any) {
    return { error: e?.message ?? "Falha ao gerar o conteúdo com IA." };
  }
}

// ---- Editar/salvar o conteúdo do curso (após geração pela IA) ----
export async function updateCourseContentAction(fd: FormData) {
  await requireManage();
  const trainingId = str(fd, "training_id");
  if (!trainingId) return;
  await query(`UPDATE trainings SET content=$2 WHERE id=$1`, [
    trainingId,
    str(fd, "content") || null,
  ]);
  revalidatePath(`/treinamentos/${trainingId}`);
}

// ---- Gerar apresentação (slides) a partir do conteúdo do curso ----
export async function generateSlidesAction(
  _prev: AiSlidesState,
  fd: FormData
): Promise<AiSlidesState> {
  await requireManage();
  const trainingId = str(fd, "training_id");
  if (!trainingId) return { error: "Curso inválido." };
  const course = await query<{ title: string; content: string | null }>(
    `SELECT title, content FROM trainings WHERE id=$1`,
    [trainingId]
  );
  const content = course[0]?.content?.trim();
  if (!content) {
    return {
      error: "Gere ou escreva o conteúdo do curso antes de criar a apresentação.",
    };
  }
  try {
    const slides = await generateSlides(course[0].title, content);
    await query(`UPDATE trainings SET slides=$2 WHERE id=$1`, [
      trainingId,
      JSON.stringify(slides),
    ]);
    revalidatePath(`/treinamentos/${trainingId}`);
    return { created: slides.length };
  } catch (e: any) {
    return { error: e?.message ?? "Falha ao gerar a apresentação com IA." };
  }
}

// ---- Gerar imagem de capa do curso com IA (OpenAI/ChatGPT) ----
export async function generateCourseImageAction(
  _prev: AiImageState,
  fd: FormData
): Promise<AiImageState> {
  await requireManage();
  const trainingId = str(fd, "training_id");
  if (!trainingId) return { error: "Curso inválido." };
  const course = await query<{ title: string }>(
    `SELECT title FROM trainings WHERE id=$1`,
    [trainingId]
  );
  const prompt =
    str(fd, "prompt") ||
    `Imagem de capa ilustrativa, moderna e profissional para um curso interno chamado "${course[0]?.title ?? "Curso"}".`;
  try {
    const url = await generatePostImage(prompt);
    await query(`UPDATE trainings SET image_url=$2 WHERE id=$1`, [trainingId, url]);
    revalidatePath(`/treinamentos/${trainingId}`);
    revalidatePath("/treinamentos");
    return { ok: true };
  } catch (e: any) {
    return { error: e?.message ?? "Falha ao gerar a imagem com IA." };
  }
}

// ---- Gerar quiz com IA ----
export async function generateQuizAction(
  _prev: AiQuizState,
  fd: FormData
): Promise<AiQuizState> {
  await requireManage();
  const trainingId = str(fd, "training_id");
  const num = Math.max(1, Math.min(20, Number(str(fd, "num")) || 5));
  const difficulty = str(fd, "difficulty") || "Médio";
  if (!trainingId) return { error: "Curso inválido." };

  // Monta o conteúdo do treinamento para a IA ler
  const course = await query<{ title: string; description: string | null }>(
    `SELECT title, description FROM trainings WHERE id=$1`,
    [trainingId]
  );
  const materials = await query<{ title: string }>(
    `SELECT title FROM training_materials WHERE training_id=$1 ORDER BY "order"`,
    [trainingId]
  );
  const content =
    `Título: ${course[0]?.title ?? ""}\n` +
    `Descrição: ${course[0]?.description ?? ""}\n` +
    `Materiais: ${materials.map((m) => m.title).join("; ")}`;

  try {
    const questions = await generateQuizWithAI(content, num, difficulty);
    for (const q of questions) {
      const inserted = await query<{ id: string }>(
        `INSERT INTO training_questions (training_id, prompt, "order")
         VALUES ($1,$2,COALESCE((SELECT max("order")+1 FROM training_questions WHERE training_id=$1),0))
         RETURNING id`,
        [trainingId, q.prompt]
      );
      for (let i = 0; i < q.options.length; i++) {
        await query(
          `INSERT INTO training_options (question_id, text, is_correct, "order")
           VALUES ($1,$2,$3,$4)`,
          [inserted[0].id, q.options[i], i === q.correct, i]
        );
      }
    }
    revalidatePath(`/treinamentos/${trainingId}`);
    return { created: questions.length };
  } catch (e: any) {
    return { error: e?.message ?? "Falha ao gerar o quiz com IA." };
  }
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

  // Já estava aprovado antes? (para postar a notícia apenas na 1ª aprovação)
  const prev = await query<{ passed: boolean }>(
    `SELECT passed FROM training_completions WHERE training_id=$1 AND user_id=$2`,
    [trainingId, user.id]
  );
  const wasPassed = prev[0]?.passed ?? false;

  await query(
    `INSERT INTO training_completions (training_id, user_id, score, passed, completed_at)
     VALUES ($1,$2,$3,$4,now())
     ON CONFLICT (training_id, user_id)
     DO UPDATE SET score=GREATEST(training_completions.score, EXCLUDED.score),
       passed=(training_completions.passed OR EXCLUDED.passed), completed_at=now()`,
    [trainingId, user.id, score, passed]
  );

  // Primeira aprovação: publica notícia na Intranet (Conheça Mais)
  if (passed && !wasPassed) {
    const course = await query<{ title: string }>(
      `SELECT title FROM trainings WHERE id=$1`,
      [trainingId]
    );
    const title = course[0]?.title ?? "treinamento";
    // Replica o certificado na Time Line da Intranet
    await query(
      `INSERT INTO timeline_posts (kind, author_id, author_name, course_id, score, body)
       VALUES ('CERTIFICATE',$1,$2,$3,$4,$5)`,
      [
        user.id,
        user.name,
        trainingId,
        score,
        `🎓 Concluí o treinamento “${title}” e me tornei especialista no assunto!`,
      ]
    );
    revalidatePath("/intranet/timeline");
  }

  revalidatePath("/treinamentos");
  redirect(`/treinamentos/${trainingId}/quiz?score=${score}`);
}

// ---- Avaliação do tutor e participantes pelo aluno que concluiu ----
export async function rateTrainingAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const trainingId = str(fd, "training_id");
  if (!trainingId) return;
  // Só quem concluiu (aprovado) o curso pode avaliar.
  const done = await query(
    `SELECT 1 FROM training_completions WHERE training_id=$1 AND user_id=$2 AND passed`,
    [trainingId, user.id]
  );
  if (done.length === 0) return;

  // Cada avaliado vem como "userId:role"; a nota vem em score_<userId>.
  const ratees = fd.getAll("ratee").map(String);
  for (const r of ratees) {
    const [uid, role] = r.split(":");
    if (!uid || uid === user.id) continue;
    const raw = str(fd, `score_${uid}`);
    if (raw === "") continue; // "não avaliar"
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || score > 5) continue;
    await query(
      `INSERT INTO training_ratings (training_id, rater_id, rated_user_id, role, score)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (training_id, rater_id, rated_user_id)
       DO UPDATE SET score=EXCLUDED.score, role=EXCLUDED.role, created_at=now()`,
      [trainingId, user.id, uid, role === "TUTOR" ? "TUTOR" : "PARTICIPANT", score]
    );
  }
  revalidatePath(`/treinamentos/${trainingId}`);
}

// ---- Definir o tutor de dúvidas do curso ----
export async function setCourseTutorAction(fd: FormData) {
  await requireManage();
  const trainingId = str(fd, "training_id");
  if (!trainingId) return;
  await query(`UPDATE trainings SET tutor_id=$2 WHERE id=$1`, [
    trainingId,
    str(fd, "tutor_id") || null,
  ]);
  revalidatePath(`/treinamentos/${trainingId}`);
}

// ---- Fórum ----
export async function addForumPostAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const trainingId = str(fd, "training_id");
  const body = str(fd, "body");
  if (!trainingId || !body) return;
  const parentId = str(fd, "parent_id") || null;
  const rows = await query<{ id: string }>(
    `INSERT INTO training_forum (training_id, user_id, author_name, parent_id, body)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [trainingId, user.id, user.name, parentId, body]
  );
  const postId = rows[0]?.id;

  // Resposta (tem parent): a IA avalia a qualidade (0-100), best-effort.
  if (postId && parentId) {
    const parent = await query<{ body: string }>(
      `SELECT body FROM training_forum WHERE id=$1`,
      [parentId]
    );
    const quality = await rateForumAnswer(parent[0]?.body ?? "", body);
    if (quality != null) {
      await query(`UPDATE training_forum SET quality=$2 WHERE id=$1`, [
        postId,
        quality,
      ]);
    }
  }

  // Menções @usuário: marca cada usuário citado (recebe alerta "Fórum").
  if (postId) {
    const tokens = Array.from(
      new Set((body.match(/@([a-zA-Z0-9._-]+)/g) || []).map((t) => t.slice(1).toLowerCase()))
    );
    for (const tok of tokens) {
      const u = await query<{ id: string }>(
        `SELECT id FROM users
         WHERE lower(username) = $1 OR lower(split_part(name,' ',1)) = $1
         LIMIT 1`,
        [tok]
      );
      if (u[0] && u[0].id !== user.id) {
        await query(
          `INSERT INTO training_forum_mentions (post_id, user_id)
           VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [postId, u[0].id]
        );
      }
    }
  }
  revalidatePath(`/treinamentos/${trainingId}`);
}
