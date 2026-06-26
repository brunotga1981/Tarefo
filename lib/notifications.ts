import { query } from "./db";

export type Notifications = {
  torpedo: number; // mensagens não lidas em DMs/grupos
  canal: number; // mensagens não lidas em canais de cliente (seguidos)
  tarefa: number; // marcações (MD) pendentes
};

export async function getNotifications(userId: string): Promise<Notifications> {
  const torpedo = await query<{ count: number }>(
    `SELECT count(*)::int AS count
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     JOIN conversation_members mem ON mem.conversation_id = c.id AND mem.user_id = $1
     LEFT JOIN conversation_reads r ON r.conversation_id = c.id AND r.user_id = $1
     WHERE c.type IN ('DM','GROUP')
       AND m.author_id IS DISTINCT FROM $1
       AND m.created_at > COALESCE(r.last_read_at, to_timestamp(0))`,
    [userId]
  );

  const canal = await query<{ count: number }>(
    `SELECT count(*)::int AS count
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     JOIN conversation_reads r ON r.conversation_id = c.id AND r.user_id = $1
     WHERE c.type = 'CLIENT'
       AND m.author_id IS DISTINCT FROM $1
       AND m.created_at > r.last_read_at`,
    [userId]
  );

  const tarefa = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM mentions
     WHERE user_id = $1 AND resolved = false`,
    [userId]
  );

  return {
    torpedo: torpedo[0]?.count ?? 0,
    canal: canal[0]?.count ?? 0,
    tarefa: tarefa[0]?.count ?? 0,
  };
}

export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  await query(
    `INSERT INTO conversation_reads (conversation_id, user_id, last_read_at)
     VALUES ($1, $2, now())
     ON CONFLICT (conversation_id, user_id)
     DO UPDATE SET last_read_at = now()`,
    [conversationId, userId]
  );
}
