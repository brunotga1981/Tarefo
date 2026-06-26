import { query } from "./db";

export type Conversation = {
  id: string;
  type: string;
  name: string | null;
  client_id: string | null;
  client_name?: string | null;
  title?: string;
};

export type Message = {
  id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
};

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
    `INSERT INTO conversations (type) VALUES ('DM') RETURNING id`
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

// Carrega a conversa e valida acesso. CLIENT é aberto a todos os usuários internos.
export async function getConversation(
  id: string,
  userId: string
): Promise<Conversation | null> {
  const rows = await query<Conversation>(
    `SELECT c.id, c.type, c.name, c.client_id, cl.name AS client_name
     FROM conversations c
     LEFT JOIN clients cl ON cl.id = c.client_id
     WHERE c.id = $1`,
    [id]
  );
  const c = rows[0];
  if (!c) return null;

  if (c.type === "CLIENT") {
    c.title = `🏢 ${c.client_name} — Prontuário`;
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
    const other = await query<{ name: string }>(
      `SELECT u.name FROM conversation_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.conversation_id = $1 AND m.user_id <> $2 LIMIT 1`,
      [id, userId]
    );
    c.title = other[0]?.name ?? "Conversa";
  }
  return c;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  return query<Message>(
    `SELECT id, author_id, author_name, body, created_at
     FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  );
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
