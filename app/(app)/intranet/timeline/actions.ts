"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";
import { generatePostCopy, generatePostImage } from "@/lib/ai";

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

export async function createTimelinePostAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!can(user, "timeline.post")) throw new Error("Sem permissão para publicar.");
  const body = str(fd, "body");
  let imageUrl = str(fd, "image_url") || null;
  const file = fd.get("image");
  if (file instanceof File && file.size > 0) {
    imageUrl = (await saveUpload(file, "tl")).url;
  }
  if (!body) return; // texto é obrigatório
  await query(
    `INSERT INTO timeline_posts (kind, author_id, author_name, body, image_url)
     VALUES ('POST',$1,$2,$3,$4)`,
    [user!.id, user!.name, body, imageUrl]
  );
  revalidatePath("/intranet/timeline");
}

// Editar o próprio post (autor a qualquer momento) ou quem gerencia conteúdo.
export async function updateTimelinePostAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = str(fd, "id");
  const body = str(fd, "body");
  if (!id || !body) return;
  if (can(user, "blog.manage")) {
    await query(`UPDATE timeline_posts SET body=$2 WHERE id=$1`, [id, body]);
  } else {
    await query(
      `UPDATE timeline_posts SET body=$2 WHERE id=$1 AND author_id=$3`,
      [id, body, user.id]
    );
  }
  revalidatePath("/intranet/timeline");
}

export async function deleteTimelinePostAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = str(fd, "id");
  // Autor ou quem gerencia conteúdo pode excluir
  if (can(user, "blog.manage")) {
    await query(`DELETE FROM timeline_posts WHERE id=$1`, [id]);
  } else {
    await query(`DELETE FROM timeline_posts WHERE id=$1 AND author_id=$2`, [
      id,
      user.id,
    ]);
  }
  revalidatePath("/intranet/timeline");
}

export async function toggleTimelineReactionAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const postId = str(fd, "post_id");
  const emoji = str(fd, "emoji");
  if (!postId || !emoji) return;
  const exists = await query(
    `SELECT 1 FROM timeline_reactions WHERE post_id=$1 AND user_id=$2 AND emoji=$3`,
    [postId, user.id, emoji]
  );
  if (exists.length) {
    await query(
      `DELETE FROM timeline_reactions WHERE post_id=$1 AND user_id=$2 AND emoji=$3`,
      [postId, user.id, emoji]
    );
  } else {
    await query(
      `INSERT INTO timeline_reactions (post_id, user_id, emoji) VALUES ($1,$2,$3)`,
      [postId, user.id, emoji]
    );
  }
  revalidatePath("/intranet/timeline");
}

export async function addTimelineCommentAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const postId = str(fd, "post_id");
  const body = str(fd, "body");
  if (!postId || !body) return;
  await query(
    `INSERT INTO timeline_comments (post_id, user_id, author_name, body)
     VALUES ($1,$2,$3,$4)`,
    [postId, user.id, user.name, body]
  );
  revalidatePath("/intranet/timeline");
}

// ---- IA: copywriting e imagem ----
export type AiPostState = { error?: string; copy?: string; imageUrl?: string };

export async function aiPostCopyAction(
  _prev: AiPostState,
  fd: FormData
): Promise<AiPostState> {
  const user = await getCurrentUser();
  if (!can(user, "timeline.post")) return { error: "Sem permissão." };
  const topic = str(fd, "topic");
  if (!topic) return { error: "Informe um tema para a IA." };
  try {
    return { copy: await generatePostCopy(topic) };
  } catch (e: any) {
    return { error: e?.message ?? "Falha na IA." };
  }
}

export async function aiPostImageAction(
  _prev: AiPostState,
  fd: FormData
): Promise<AiPostState> {
  const user = await getCurrentUser();
  if (!can(user, "timeline.post")) return { error: "Sem permissão." };
  try {
    return { imageUrl: await generatePostImage(str(fd, "topic")) };
  } catch (e: any) {
    return { error: e?.message ?? "Falha na IA." };
  }
}
