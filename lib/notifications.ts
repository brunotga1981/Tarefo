import { query } from "./db";

export type Notifications = {
  torpedo: number; // mensagens não lidas em DMs/grupos
  canal: number; // mensagens não lidas em canais de cliente (seguidos)
  tarefa: number; // novas tarefas atribuídas a você desde a última visita ao quadro
  mt: number; // Marcações de Tarefas (MT) pendentes
  treino: number; // treinamentos disponíveis ainda não aprovados
};

const ZERO: Notifications = { torpedo: 0, canal: 0, tarefa: 0, mt: 0, treino: 0 };

export async function getNotifications(userId: string): Promise<Notifications> {
  try {
    return await computeNotifications(userId);
  } catch (e) {
    // Notificações são não essenciais: nunca devem derrubar o layout/app.
    console.error("getNotifications falhou (ignorado):", e);
    return ZERO;
  }
}

async function computeNotifications(userId: string): Promise<Notifications> {
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

  const mt = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM mentions
     WHERE user_id = $1 AND resolved = false`,
    [userId]
  );

  // Novas tarefas atribuídas a você (dono ou colaborador) desde a última visita ao quadro.
  const tarefa = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM tasks t
     WHERE t.created_at > COALESCE((SELECT tasks_seen_at FROM users WHERE id = $1), to_timestamp(0))
       AND (t.owner_id = $1
            OR EXISTS (SELECT 1 FROM task_collaborators tc
                       WHERE tc.task_id = t.id AND tc.user_id = $1))`,
    [userId]
  );

  // Treinamentos disponíveis ainda não aprovados pelo usuário (some quando aprova).
  const treino = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM trainings t
     WHERE NOT EXISTS (
       SELECT 1 FROM training_completions c
       WHERE c.training_id = t.id AND c.user_id = $1 AND c.passed
     )`,
    [userId]
  );

  return {
    torpedo: torpedo[0]?.count ?? 0,
    canal: canal[0]?.count ?? 0,
    tarefa: tarefa[0]?.count ?? 0,
    mt: mt[0]?.count ?? 0,
    treino: treino[0]?.count ?? 0,
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

// Marca o quadro de tarefas como visto (zera o alerta de novas tarefas).
export async function markTasksSeen(userId: string): Promise<void> {
  await query(`UPDATE users SET tasks_seen_at = now() WHERE id = $1`, [userId]);
}
