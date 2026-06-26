"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  findOrCreateDM,
  findOrCreateClientChannel,
  createGroup,
  canAccessConversation,
} from "@/lib/chat";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

async function saveUpload(file: File): Promise<{ url: string; name: string }> {
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stored = `msg-${Date.now()}-${safe}`;
  await writeFile(path.join(dir, stored), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${stored}`, name: file.name };
}

export async function openDMAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const other = str(fd, "user_id");
  if (!other || other === user.id) return;
  const id = await findOrCreateDM(user.id, other);
  redirect(`/comunicacao?c=${id}`);
}

export async function openClientChannelAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const clientId = str(fd, "client_id");
  if (!clientId) return;
  const id = await findOrCreateClientChannel(clientId);
  redirect(`/comunicacao?c=${id}`);
}

export async function createGroupChatAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const name = str(fd, "name");
  if (!name) return;
  const members = fd.getAll("member_ids").map(String);
  const id = await createGroup(name, [user.id, ...members]);
  redirect(`/comunicacao?c=${id}`);
}

export async function sendMessageAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const conversationId = str(fd, "conversation_id");
  const body = str(fd, "body");
  if (!conversationId) return;
  if (!(await canAccessConversation(conversationId, user.id))) return;

  let fileUrl: string | null = null;
  let fileName: string | null = null;
  const file = fd.get("file");
  if (file instanceof File && file.size > 0) {
    const saved = await saveUpload(file);
    fileUrl = saved.url;
    fileName = saved.name;
  }
  if (!body && !fileUrl) return;

  await query(
    `INSERT INTO messages (conversation_id, author_id, author_name, body, file_url, file_name)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [conversationId, user.id, user.name, body, fileUrl, fileName]
  );

  // Compartilhar com canais/grupos selecionados via "/"
  for (const target of fd.getAll("share_targets").map(String)) {
    if (target && (await canAccessConversation(target, user.id))) {
      await query(
        `INSERT INTO messages (conversation_id, author_id, author_name, body, file_url, file_name, forwarded_from)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [target, user.id, user.name, body, fileUrl, fileName, conversationId]
      );
    }
  }
  revalidatePath("/comunicacao");
}

export async function toggleReactionAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const messageId = str(fd, "message_id");
  const emoji = str(fd, "emoji");
  if (!messageId || !emoji) return;
  const exists = await query(
    `SELECT 1 FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3`,
    [messageId, user.id, emoji]
  );
  if (exists.length) {
    await query(
      `DELETE FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3`,
      [messageId, user.id, emoji]
    );
  } else {
    await query(
      `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1,$2,$3)`,
      [messageId, user.id, emoji]
    );
  }
  revalidatePath("/comunicacao");
}

export async function forwardMessagesAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const target = str(fd, "target");
  const ids = fd.getAll("message_ids").map(String).filter(Boolean);
  if (!target || ids.length === 0) return;
  if (!(await canAccessConversation(target, user.id))) return;

  const msgs = await query<{
    body: string;
    file_url: string | null;
    file_name: string | null;
    conversation_id: string;
  }>(
    `SELECT body, file_url, file_name, conversation_id FROM messages
     WHERE id = ANY($1) ORDER BY created_at ASC`,
    [ids]
  );
  for (const m of msgs) {
    await query(
      `INSERT INTO messages (conversation_id, author_id, author_name, body, file_url, file_name, forwarded_from)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [target, user.id, user.name, m.body, m.file_url, m.file_name, m.conversation_id]
    );
  }
  redirect(`/comunicacao?c=${target}`);
}

export async function setPresenceAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const presence = str(fd, "presence");
  await query(`UPDATE users SET presence = $2 WHERE id = $1`, [
    user.id,
    presence,
  ]);
  revalidatePath("/comunicacao");
}

export async function finalizeConversationAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const conversationId = str(fd, "conversation_id");
  if (!(await canAccessConversation(conversationId, user.id))) return;
  await query(
    `UPDATE conversations SET finalized_at = now() WHERE id = $1`,
    [conversationId]
  );
  revalidatePath("/comunicacao");
}

export async function rateConversationAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const conversationId = str(fd, "conversation_id");
  const score = Number(str(fd, "score"));
  if (!conversationId || !(score >= 0 && score <= 5)) return;
  if (!(await canAccessConversation(conversationId, user.id))) return;

  // Avalia o atendimento do OUTRO participante (anônimo).
  const other = await query<{ user_id: string }>(
    `SELECT user_id FROM conversation_members
     WHERE conversation_id = $1 AND user_id <> $2 LIMIT 1`,
    [conversationId, user.id]
  );
  const ratedId = other[0]?.user_id ?? null;

  const already = await query(
    `SELECT 1 FROM conversation_ratings WHERE conversation_id=$1 AND rater_id=$2`,
    [conversationId, user.id]
  );
  if (already.length) return;

  await query(
    `INSERT INTO conversation_ratings (conversation_id, rated_user_id, rater_id, score)
     VALUES ($1,$2,$3,$4)`,
    [conversationId, ratedId, user.id, score]
  );
  revalidatePath("/comunicacao");
}
