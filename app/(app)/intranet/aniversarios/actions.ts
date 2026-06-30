"use server";

import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { findOrCreateDM } from "@/lib/chat";
import { BIRTHDAY_CARDS } from "@/lib/birthday-cards";

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

/** Envia um cartão de aniversário (imagem + dizeres) via Torpedo (DM). */
export async function sendBirthdayCardAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const toUserId = str(fd, "user_id");
  if (!toUserId || toUserId === user.id) return;

  const idx = Math.min(2, Math.max(0, (Number(str(fd, "card")) || 1) - 1));
  const cardUrl = BIRTHDAY_CARDS[idx];
  const message = str(fd, "message") || "Feliz aniversário! 🎉🎂";

  const convId = await findOrCreateDM(user.id, toUserId);
  await query(
    `INSERT INTO messages (conversation_id, author_id, author_name, body, file_url, file_name)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [convId, user.id, user.name, message, cardUrl, "Cartão de aniversário"]
  );
  redirect(`/comunicacao?c=${convId}`);
}
