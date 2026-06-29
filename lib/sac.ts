import { query } from "./db";

export const SAC_CHANNELS = ["EMAIL", "SUPERLOGICA", "WHATSAPP"] as const;
export const CHANNEL_LABEL: Record<string, string> = {
  EMAIL: "E-mail",
  SUPERLOGICA: "Superlógica",
  WHATSAPP: "WhatsApp",
};
export const CHANNEL_ICON: Record<string, string> = {
  EMAIL: "📧",
  SUPERLOGICA: "🎫",
  WHATSAPP: "💬",
};
export const SAC_STATUS_LABEL: Record<string, string> = {
  ABERTO: "Aberto",
  CONVERTIDO: "Convertido em tarefa",
  FECHADO: "Fechado",
};

export type Ticket = {
  id: string;
  channel: string;
  external_id: string | null;
  subject: string | null;
  requester: string | null;
  body: string | null;
  conversation_status: string | null;
  status: string;
  client_id: string | null;
  task_id: string | null;
  created_at: string;
};

export async function listTickets(filter?: {
  channel?: string;
  status?: string;
}): Promise<Ticket[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter?.channel) {
    params.push(filter.channel);
    where.push(`channel = $${params.length}`);
  }
  if (filter?.status) {
    params.push(filter.status);
    where.push(`status = $${params.length}`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return query<Ticket>(
    `SELECT * FROM sac_tickets ${clause} ORDER BY created_at DESC LIMIT 200`,
    params
  );
}

// Cria um ticket de SAC (entrada via webhook ou manual).
export async function createTicket(data: {
  channel: string;
  external_id?: string | null;
  subject?: string | null;
  requester?: string | null;
  body?: string | null;
  conversation_status?: string | null;
  client_id?: string | null;
}): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO sac_tickets
       (channel, external_id, subject, requester, body, conversation_status, client_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [
      data.channel,
      data.external_id ?? null,
      data.subject ?? null,
      data.requester ?? null,
      data.body ?? null,
      data.conversation_status ?? null,
      data.client_id ?? null,
    ]
  );
  return rows[0].id;
}

// Transforma o ticket em tarefa e marca como convertido.
export async function convertTicketToTask(
  ticketId: string,
  ownerId: string | null
): Promise<string | null> {
  const rows = await query<Ticket>(`SELECT * FROM sac_tickets WHERE id=$1`, [
    ticketId,
  ]);
  const t = rows[0];
  if (!t || t.task_id) return t?.task_id ?? null;

  const type = t.channel === "WHATSAPP" ? "URGENTE" : "PADRAO";
  const name = t.subject || `${CHANNEL_LABEL[t.channel]} — ${t.requester ?? "SAC"}`;
  const tag = `sac,${t.channel.toLowerCase()}`;

  const task = await query<{ id: string }>(
    `INSERT INTO tasks (name, type, status, description, responsavel, tags, client_id, owner_id)
     VALUES ($1,$2,'A_FAZER',$3,$4,$5,$6,$7) RETURNING id`,
    [name, type, t.body, t.requester, tag, t.client_id, ownerId]
  );
  const taskId = task[0].id;

  await query(
    `UPDATE sac_tickets SET status='CONVERTIDO', task_id=$2 WHERE id=$1`,
    [ticketId, taskId]
  );
  return taskId;
}

export async function closeTicket(ticketId: string): Promise<void> {
  await query(`UPDATE sac_tickets SET status='FECHADO' WHERE id=$1`, [ticketId]);
}

export async function countOpenTickets(): Promise<number> {
  const r = await query<{ c: number }>(
    `SELECT count(*)::int AS c FROM sac_tickets WHERE status='ABERTO'`
  );
  return r[0]?.c ?? 0;
}
