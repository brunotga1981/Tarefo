import { query } from "./db";

export type Notifications = {
  torpedo: number; // mensagens não lidas em DMs/grupos
  canal: number; // mensagens não lidas em canais de cliente (seguidos)
  tarefa: number; // novas tarefas atribuídas a você desde a última visita ao quadro
  mt: number; // Marcações de Tarefas (MT) pendentes
  treino: number; // treinamentos disponíveis ainda não aprovados
  forum: number; // dúvidas do fórum para você (tutor) ou menções (@você)
  forumLink: string; // link direto para o fórum da dúvida pendente
};

const ZERO: Notifications = {
  torpedo: 0,
  canal: 0,
  tarefa: 0,
  mt: 0,
  treino: 0,
  forum: 0,
  forumLink: "/treinamentos",
};

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

  // Treinamentos que são OBRIGATÓRIOS para este usuário (pelo seu público-alvo:
  // vertical ou equipe) e que ele ainda não concluiu. Curso não obrigatório não
  // é cobrado de ninguém. Obrigatório sem público definido = para todos.
  const treino = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM trainings t
     WHERE t.published AND t.mandatory
       AND NOT EXISTS (
         SELECT 1 FROM training_completions c
         WHERE c.training_id = t.id AND c.user_id = $1 AND c.passed
       )
       AND (
         (t.group_id IS NULL AND coalesce(cardinality(t.verticals),0) = 0)
         OR EXISTS (SELECT 1 FROM group_members gm
                    WHERE gm.group_id = t.group_id AND gm.user_id = $1)
         OR EXISTS (SELECT 1 FROM users u
                    WHERE u.id = $1 AND u.vertical && t.verticals)
       )`,
    [userId]
  );

  // Fórum: (a) como TUTOR, dúvidas do meu curso que eu ainda não respondi — o
  // alerta só cai depois que eu publico a resposta; (b) menções (@mim) ainda não
  // lidas. Cada item traz o curso, para o link direto e a contagem (união dedup).
  const forumItems = await query<{ training_id: string; created_at: string }>(
    `SELECT f.training_id, f.created_at FROM training_forum f
       JOIN trainings t ON t.id = f.training_id AND t.tutor_id = $1
       WHERE f.parent_id IS NULL AND f.user_id IS DISTINCT FROM $1
         AND NOT EXISTS (SELECT 1 FROM training_forum a
                         WHERE a.parent_id = f.id AND a.user_id = $1)
     UNION
     SELECT f.training_id, f.created_at FROM training_forum_mentions m
       JOIN training_forum f ON f.id = m.post_id
       LEFT JOIN training_forum_reads r
         ON r.training_id = f.training_id AND r.user_id = $1
       WHERE m.user_id = $1 AND f.user_id IS DISTINCT FROM $1
         AND f.created_at > COALESCE(r.last_read_at, to_timestamp(0))
     ORDER BY created_at DESC`,
    [userId]
  );
  const forumLink =
    forumItems.length > 0
      ? `/treinamentos/${forumItems[0].training_id}?tab=forum`
      : "/treinamentos";

  return {
    torpedo: torpedo[0]?.count ?? 0,
    canal: canal[0]?.count ?? 0,
    tarefa: tarefa[0]?.count ?? 0,
    mt: mt[0]?.count ?? 0,
    treino: treino[0]?.count ?? 0,
    forum: forumItems.length,
    forumLink,
  };
}

/** Marca o fórum de um curso como lido pelo usuário (limpa o alerta "Fórum"). */
export async function markForumRead(
  userId: string,
  trainingId: string
): Promise<void> {
  await query(
    `INSERT INTO training_forum_reads (user_id, training_id, last_read_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, training_id)
     DO UPDATE SET last_read_at = now()`,
    [userId, trainingId]
  );
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
