"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { storeImageBuffer, storeDataUrl } from "@/lib/images";
import { addBlogComment } from "@/lib/blog";
import { generatePostCopy, generatePostImage } from "@/lib/ai";

async function requireManage() {
  const user = await getCurrentUser();
  if (!can(user, "blog.manage")) throw new Error("Sem permissão.");
}
function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

/** Resolve a mídia (imagem/vídeo) para uma URL persistida no banco
 *  (/api/img/<id>) e detecta o tipo. Igual ao padrão da Time Line, para que o
 *  upload funcione no Render (o filesystem público é efêmero). */
async function resolveFormMedia(
  fd: FormData
): Promise<{ url: string | null; type: "image" | "video" }> {
  const file = fd.get("image");
  if (file instanceof File && file.size > 0) {
    const mime = file.type || "image/png";
    const url = await storeImageBuffer(mime, Buffer.from(await file.arrayBuffer()));
    return { url, type: mime.startsWith("video/") ? "video" : "image" };
  }
  const url = str(fd, "image_url");
  if (!url) return { url: null, type: "image" };
  if (url.startsWith("data:")) {
    return {
      url: (await storeDataUrl(url)) ?? null,
      type: url.startsWith("data:video") ? "video" : "image",
    };
  }
  return {
    url,
    type: /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(url) ? "video" : "image",
  };
}

export async function createBlogPostAction(fd: FormData) {
  await requireManage();
  const title = str(fd, "title");
  if (!title) return;
  const { url: imageUrl, type: mediaType } = await resolveFormMedia(fd);
  const publishAt = str(fd, "publish_at") || null;
  await query(
    `INSERT INTO blog_posts (title, theme, summary, content, image_url, media_type, publish_at)
     VALUES ($1,$2,$3,$4,$5,$6,
             $7::timestamp AT TIME ZONE 'America/Sao_Paulo')`,
    [
      title,
      str(fd, "theme") || null,
      str(fd, "summary") || null,
      str(fd, "content") || null,
      imageUrl,
      mediaType,
      publishAt,
    ]
  );
  revalidatePath("/intranet/conheca-mais");
}

// ---- IA: copywriting e imagem (mesmo padrão da Time Line) ----
export type AiBlogState = { error?: string; copy?: string; imageUrl?: string };

export async function aiBlogCopyAction(
  _prev: AiBlogState,
  fd: FormData
): Promise<AiBlogState> {
  const user = await getCurrentUser();
  if (!can(user, "blog.manage")) return { error: "Sem permissão." };
  const topic = str(fd, "topic");
  if (!topic) return { error: "Informe um tema para a IA." };
  try {
    return { copy: await generatePostCopy(topic) };
  } catch (e: any) {
    return { error: e?.message ?? "Falha na IA." };
  }
}

export async function aiBlogImageAction(
  _prev: AiBlogState,
  fd: FormData
): Promise<AiBlogState> {
  const user = await getCurrentUser();
  if (!can(user, "blog.manage")) return { error: "Sem permissão." };
  try {
    return { imageUrl: await generatePostImage(str(fd, "topic")) };
  } catch (e: any) {
    return { error: e?.message ?? "Falha na IA." };
  }
}

export async function deleteBlogPostAction(fd: FormData) {
  await requireManage();
  await query(`DELETE FROM blog_posts WHERE id=$1`, [str(fd, "id")]);
  revalidatePath("/intranet/conheca-mais");
}

// Comentar em uma postagem do blog — qualquer usuário autenticado.
export async function addBlogCommentAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autenticado.");
  const postId = str(fd, "post_id");
  const body = str(fd, "body");
  if (!postId || !body) return;
  await addBlogComment(postId, user.id, user.name, body);
  revalidatePath(`/intranet/conheca-mais/${postId}`);
}
