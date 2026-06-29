"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/auth";
import { createTicket, convertTicketToTask, closeTicket } from "@/lib/sac";

async function requireSac() {
  const user = await getCurrentUser();
  if (!can(user, "sac.manage")) throw new Error("Sem permissão.");
  return user!;
}
function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

export async function registerTicketAction(fd: FormData) {
  await requireSac();
  const channel = str(fd, "channel") || "EMAIL";
  await createTicket({
    channel,
    requester: str(fd, "requester") || null,
    subject: str(fd, "subject") || null,
    body: str(fd, "body") || null,
    client_id: str(fd, "client_id") || null,
    conversation_status: channel === "WHATSAPP" ? str(fd, "conversation_status") || "ABERTA" : null,
  });
  revalidatePath("/sac");
}

export async function convertTicketAction(fd: FormData) {
  const user = await requireSac();
  const taskId = await convertTicketToTask(str(fd, "id"), user.id);
  revalidatePath("/sac");
  revalidatePath("/meu-tarefo");
  if (taskId) redirect(`/meu-tarefo/${taskId}`);
}

export async function closeTicketAction(fd: FormData) {
  await requireSac();
  await closeTicket(str(fd, "id"));
  revalidatePath("/sac");
}
