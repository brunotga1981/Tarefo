"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";

async function requireManage() {
  const user = await getCurrentUser();
  if (!can(user, "blog.manage")) throw new Error("Sem permissão.");
}
function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

export async function createBlogPostAction(fd: FormData) {
  await requireManage();
  const title = str(fd, "title");
  if (!title) return;
  let imageUrl = str(fd, "image_url") || null;
  const file = fd.get("image");
  if (file instanceof File && file.size > 0) {
    imageUrl = (await saveUpload(file, "blog")).url;
  }
  await query(
    `INSERT INTO blog_posts (title, theme, summary, content, image_url)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      title,
      str(fd, "theme") || null,
      str(fd, "summary") || null,
      str(fd, "content") || null,
      imageUrl,
    ]
  );
  revalidatePath("/intranet/conheca-mais");
}

export async function deleteBlogPostAction(fd: FormData) {
  await requireManage();
  await query(`DELETE FROM blog_posts WHERE id=$1`, [str(fd, "id")]);
  revalidatePath("/intranet/conheca-mais");
}
