import { query } from "./db";

export type Conversation = {
  id: string;
  type: string;
  name: string | null;
  client_id: string | null;
  client_name?: string | null;
  started_by?: string | null;
  finalized_at?: string | null;
  other_id?: string | null; // DM: id do outro participante
  title?: string;
};

export type ReactionGroup = { emoji: string; count: number; mine: boolean };

export type Message = {
  id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  file_url: string | null;
  file_name: string | null;
  forwarded_from: string | null;
  created_at: string;
  edited_at: string | null;
  reactions?: ReactionGroup[];
};

export { PRESENCE_OPTIONS, PRESENCE_DOT } from "./chat-meta";

// Encontra ou cria a conversa 1-a-1 entre dois usuários.
export async function findOrCreateDM(a: string, b: string): Promise<string> {
  const found = await query<{ id: string }>(
    `SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = $1
     JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = $2
     WHERE c.type = 'DM' LIMIT 1`,
    [a, b]
  );
  if (found[0]) return found[0].id;

  const created = await query<{ id: string }>(
    `INSERT INTO conversations (type, started_by) VALUES ('DM', $1) RETURNING id`,
    [a]
  );
  const id = created[0].id;
  await query(
    `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
    [id, a, b]
  );
  return id;
}

// Encontra ou cria o canal (prontuário) de um cliente.
export async function findOrCreateClientChannel(clientId: string): Promise<string> {
  const found = await query<{ id: string }>(
    `SELECT id FROM conversations WHERE type = 'CLIENT' AND client_id = $1 LIMIT 1`,
    [clientId]
  );
  if (found[0]) return found[0].id;
  const created = await query<{ id: string }>(
    `INSERT INTO conversations (type, client_id) VALUES ('CLIENT', $1) RETURNING id`,
    [clientId]
  );
  return created[0].id;
}

export async function createGroup(
  name: string,
  memberIds: string[]
): Promise<string> {
  const created = await query<{ id: string }>(
    `INSERT INTO conversations (type, name) VALUES ('GROUP', $1) RETURNING id`,
    [name]
  );
  const id = created[0].id;
  const unique = Array.from(new Set(memberIds));
  for (const uid of unique) {
    await query(
      `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [id, uid]
    );
  }
  return id;
}

export async function listGroupsFor(userId: string): Promise<Conversation[]> {
  return query<Conversation>(
    `SELECT c.id, c.type, c.name, c.client_id
     FROM conversations c
     JOIN conversation_members m ON m.conversation_id = c.id
     WHERE c.type = 'GROUP' AND m.user_id = $1
     ORDER BY c.name`,
    [userId]
  );
}

export type UnreadDM = {
  count: number;
  firstAt: string; // 1ª mensagem não lida (entrada na fila — ordem de chegada)
  lastAt: string; // mensagem não lida mais recente
};

/** DMs com mensagens não lidas: mapa { outroUsuarioId -> info }.
 *  Usado para destacar o remetente e ordená-lo por ordem de chegada. */
export async function listUnreadDMSenders(
  userId: string
): Promise<Record<string, UnreadDM>> {
  const rows = await query<{
    other_id: string;
    count: number;
    first_at: string;
    last_at: string;
  }>(
    `SELECT other.user_id AS other_id, count(*)::int AS count,
            min(m.created_at) AS first_at, max(m.created_at) AS last_at
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id AND c.type = 'DM'
     JOIN conversation_members mem ON mem.conversation_id = c.id AND mem.user_id = $1
     JOIN conversation_members other ON other.conversation_id = c.id AND other.user_id <> $1
     LEFT JOIN conversation_reads r ON r.conversation_id = c.id AND r.user_id = $1
     WHERE m.author_id IS DISTINCT FROM $1
       AND m.created_at > COALESCE(r.last_read_at, to_timestamp(0))
     GROUP BY other.user_id`,
    [userId]
  );
  const map: Record<string, UnreadDM> = {};
  for (const r of rows)
    map[r.other_id] = {
      count: r.count,
      firstAt: r.first_at,
      lastAt: r.last_at,
    };
  return map;
}

/** Grupos com mensagens não lidas: mapa { conversationId -> quantidade }. */
export async function listUnreadGroups(
  userId: string
): Promise<Record<string, number>> {
  const rows = await query<{ conversation_id: string; count: number }>(
    `SELECT c.id AS conversation_id, count(*)::int AS count
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id AND c.type = 'GROUP'
     JOIN conversation_members mem ON mem.conversation_id = c.id AND mem.user_id = $1
     LEFT JOIN conversation_reads r ON r.conversation_id = c.id AND r.user_id = $1
     WHERE m.author_id IS DISTINCT FROM $1
       AND m.created_at > COALESCE(r.last_read_at, to_timestamp(0))
     GROUP BY c.id`,
    [userId]
  );
  const map: Record<string, number> = {};
  for (const r of rows) map[r.conversation_id] = r.count;
  return map;
}

// Carrega a conversa e valida acesso. CLIENT é aberto a todos os usuários internos.
export async function getConversation(
  id: string,
  userId: string
): Promise<Conversation | null> {
  const rows = await query<Conversation>(
    `SELECT c.id, c.type, c.name, c.client_id, c.started_by, c.finalized_at,
            cl.name AS client_name
     FROM conversations c
     LEFT JOIN clients cl ON cl.id = c.client_id
     WHERE c.id = $1`,
    [id]
  );
  const c = rows[0];
  if (!c) return null;

  if (c.type === "CLIENT") {
    c.title = `🏢 ${c.client_name} — R.A.C`;
    return c;
  }

  const member = await query(
    `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (member.length === 0) return null;

  if (c.type === "GROUP") {
    c.title = `👪 ${c.name}`;
  } else {
    // DM: título é o nome do outro participante
    const other = await query<{ id: string; name: string }>(
      `SELECT u.id, u.name FROM conversation_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.conversation_id = $1 AND m.user_id <> $2 LIMIT 1`,
      [id, userId]
    );
    c.title = other[0]?.name ?? "Conversa";
    c.other_id = other[0]?.id ?? null;
  }
  return c;
}

export async function getMessages(
  conversationId: string,
  userId: string
): Promise<Message[]> {
  const msgs = await query<Message>(
    `SELECT id, author_id, author_name, body, file_url, file_name, forwarded_from,
            created_at, edited_at
     FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  );
  if (msgs.length === 0) return msgs;
  const ids = msgs.map((m) => m.id);
  const reactions = await query<{
    message_id: string;
    emoji: string;
    count: number;
    mine: boolean;
  }>(
    `SELECT message_id, emoji, count(*)::int AS count, bool_or(user_id = $2) AS mine
     FROM message_reactions WHERE message_id = ANY($1)
     GROUP BY message_id, emoji ORDER BY emoji`,
    [ids, userId]
  );
  for (const m of msgs) {
    m.reactions = reactions
      .filter((r) => r.message_id === m.id)
      .map((r) => ({ emoji: r.emoji, count: r.count, mine: r.mine }));
  }
  return msgs;
}

// Tempo Médio de Resposta (em minutos) entre interlocutores diferentes.
export function computeTMR(messages: Message[]): number | null {
  let totalMs = 0;
  let n = 0;
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const cur = messages[i];
    if (prev.author_id && cur.author_id && prev.author_id !== cur.author_id) {
      const diff =
        new Date(cur.created_at).getTime() - new Date(prev.created_at).getTime();
      if (diff >= 0) {
        totalMs += diff;
        n++;
      }
    }
  }
  if (n === 0) return null;
  return Math.round(totalMs / n / 60000);
}

// Score do usuário (média das avaliações recebidas, anônima).
export async function getUserScore(
  userId: string
): Promise<{ avg: number | null; count: number }> {
  const rows = await query<{ avg: string | null; count: string }>(
    `SELECT avg(score)::numeric(10,2) AS avg, count(*)::int AS count
     FROM conversation_ratings WHERE rated_user_id = $1`,
    [userId]
  );
  return {
    avg: rows[0]?.avg != null ? Number(rows[0].avg) : null,
    count: Number(rows[0]?.count ?? 0),
  };
}

// Alvos para compartilhar/encaminhar (grupos do usuário + canais de clientes).
export async function listShareTargets(
  userId: string
): Promise<{ id: string; label: string }[]> {
  const groups = await query<{ id: string; name: string }>(
    `SELECT c.id, c.name FROM conversations c
     JOIN conversation_members m ON m.conversation_id = c.id
     WHERE c.type = 'GROUP' AND m.user_id = $1 ORDER BY c.name`,
    [userId]
  );
  const clients = await query<{ id: string; name: string }>(
    `SELECT c.id, cl.name FROM conversations c
     JOIN clients cl ON cl.id = c.client_id
     WHERE c.type = 'CLIENT' ORDER BY cl.name`
  );
  return [
    ...groups.map((g) => ({ id: g.id, label: `👪 ${g.name}` })),
    ...clients.map((c) => ({ id: c.id, label: `🏢 ${c.name}` })),
  ];
}

export async function hasRated(
  conversationId: string,
  raterId: string
): Promise<boolean> {
  const r = await query(
    `SELECT 1 FROM conversation_ratings WHERE conversation_id = $1 AND rater_id = $2`,
    [conversationId, raterId]
  );
  return r.length > 0;
}

export async function canAccessConversation(
  id: string,
  userId: string
): Promise<boolean> {
  return (await getConversation(id, userId)) !== null;
}

// Tarefas vinculadas ao cliente (para o prontuário do canal).
export async function getClientTasks(clientId: string) {
  return query<{ id: string; name: string; status: string; type: string }>(
    `SELECT id, name, status, type FROM tasks
     WHERE client_id = $1 AND parent_id IS NULL
     ORDER BY created_at DESC`,
    [clientId]
  );
}
