"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { storeImageBuffer, storeDataUrl } from "@/lib/images";
import {
  setPostHighlights,
  createHighlight,
  deleteHighlight,
  updateHighlight,
  moveHighlight,
  markStoryViewed,
  getStoryViewers,
} from "@/lib/timeline";
import { generatePostCopy, generatePostImage } from "@/lib/ai";

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

/** Resolve a imagem do formulário para uma URL persistida (/api/img/<id>):
 *  arquivo enviado → banco; data URL colada → banco; URL curta/externa → mantém. */
async function resolveFormImage(fd: FormData): Promise<string | null> {
  const file = fd.get("image");
  if (file instanceof File && file.size > 0) {
    return storeImageBuffer(
      file.type || "image/png",
      Buffer.from(await file.arrayBuffer())
    );
  }
  const url = str(fd, "image_url");
  if (!url) return null;
  if (url.startsWith("data:")) return (await storeDataUrl(url)) ?? null;
  return url;
}

export async function createTimelinePostAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!can(user, "timeline.post")) throw new Error("Sem permissão para publicar.");
  const body = str(fd, "body");
  if (!body) return; // texto é obrigatório
  const imageUrl = await resolveFormImage(fd);
  const publishAt = str(fd, "publish_at") || null;
  const expiresAt = str(fd, "expires_at") || null;
  // O datetime-local vem como hora local (BRT) sem fuso; interpretamos como
  // America/Sao_Paulo para gravar o instante correto (a sessão do banco é UTC).
  const rows = await query<{ id: string }>(
    `INSERT INTO timeline_posts (kind, author_id, author_name, body, image_url, publish_at, expires_at)
     VALUES ('POST',$1,$2,$3,$4,
             $5::timestamp AT TIME ZONE 'America/Sao_Paulo',
             $6::timestamp AT TIME ZONE 'America/Sao_Paulo') RETURNING id`,
    [user!.id, user!.name, body, imageUrl, publishAt, expiresAt]
  );
  const highlightIds = fd.getAll("highlight_ids").map(String).filter(Boolean);
  if (rows[0] && highlightIds.length) {
    await setPostHighlights(rows[0].id, highlightIds);
  }
  revalidatePath("/intranet/timeline");
}

// ---- Destaques (stories) ----
export async function createHighlightAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!can(user, "highlights.manage")) throw new Error("Sem permissão.");
  const title = str(fd, "title");
  if (!title) return;
  const imageUrl = await resolveFormImage(fd);
  await createHighlight(title, imageUrl);
  revalidatePath("/intranet/timeline");
}

export async function deleteHighlightAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!can(user, "highlights.manage")) throw new Error("Sem permissão.");
  await deleteHighlight(str(fd, "id"));
  revalidatePath("/intranet/timeline");
}

export async function updateHighlightAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!can(user, "highlights.manage")) throw new Error("Sem permissão.");
  const id = str(fd, "id");
  const title = str(fd, "title");
  if (!id || !title) return;
  const imageUrl = await resolveFormImage(fd); // null se não enviou nova imagem
  await updateHighlight(id, title, imageUrl);
  revalidatePath("/intranet/timeline");
}

export async function moveHighlightAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!can(user, "highlights.manage")) throw new Error("Sem permissão.");
  const id = str(fd, "id");
  const dir = str(fd, "dir") === "left" ? "left" : "right";
  if (!id) return;
  await moveHighlight(id, dir);
  revalidatePath("/intranet/timeline");
}

// Marca um story (post) como visto pelo usuário atual.
export async function markStoryViewedAction(postId: string) {
  const user = await getCurrentUser();
  if (!user || !postId) return;
  await markStoryViewed(user.id, postId);
}

// Lista quem viu um story — só o autor do post ou um moderador.
export async function getStoryViewersAction(
  postId: string
): Promise<{ name: string; viewed_at: string }[]> {
  const user = await getCurrentUser();
  if (!user || !postId) return [];
  const owner = await query<{ author_id: string | null }>(
    `SELECT author_id FROM timeline_posts WHERE id=$1`,
    [postId]
  );
  const isOwner = owner[0]?.author_id === user.id;
  if (!isOwner && !can(user, "blog.manage")) return [];
  return getStoryViewers(postId);
}

// Editar o próprio post (autor a qualquer momento) ou quem gerencia conteúdo.
// Permite alterar o texto e trocar/remover a imagem.
export async function updateTimelinePostAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = str(fd, "id");
  const body = str(fd, "body");
  if (!id || !body) return;

  // Imagem: upload novo > URL informada > remover > manter (undefined)
  let newImage: string | null | undefined = undefined;
  const file = fd.get("image");
  if (file instanceof File && file.size > 0) {
    newImage = await storeImageBuffer(
      file.type || "image/png",
      Buffer.from(await file.arrayBuffer())
    );
  } else {
    const url = str(fd, "image_url");
    if (url) newImage = url.startsWith("data:") ? (await storeDataUrl(url)) ?? null : url;
    else if (str(fd, "remove_image") === "1") newImage = null;
  }

  const sets = ["body=$2"];
  const args: any[] = [id, body];
  if (newImage !== undefined) {
    args.push(newImage);
    sets.push(`image_url=$${args.length}`);
  }
  // Agendamento (início/fim) — interpretado como America/Sao_Paulo; vazio = limpar
  args.push(str(fd, "publish_at") || null);
  sets.push(`publish_at=$${args.length}::timestamp AT TIME ZONE 'America/Sao_Paulo'`);
  args.push(str(fd, "expires_at") || null);
  sets.push(`expires_at=$${args.length}::timestamp AT TIME ZONE 'America/Sao_Paulo'`);

  let sql = `UPDATE timeline_posts SET ${sets.join(", ")} WHERE id=$1`;
  if (!can(user, "blog.manage")) {
    args.push(user.id);
    sql += ` AND author_id=$${args.length}`;
  }
  await query(sql, args);
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
