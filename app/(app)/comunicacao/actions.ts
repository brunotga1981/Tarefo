"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  if (!conversationId || !body) return;
  if (!(await canAccessConversation(conversationId, user.id))) return;

  await query(
    `INSERT INTO messages (conversation_id, author_id, author_name, body)
     VALUES ($1,$2,$3,$4)`,
    [conversationId, user.id, user.name, body]
  );
  revalidatePath("/comunicacao");
}
