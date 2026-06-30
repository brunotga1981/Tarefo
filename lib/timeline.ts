import { query } from "./db";
import type {
  TLPost,
  TLComment,
  Highlight,
  Story,
  HighlightWithStories,
} from "./timeline-types";
export type {
  TLPost,
  TLReaction,
  TLComment,
  Highlight,
  Story,
  HighlightWithStories,
} from "./timeline-types";
export { TL_REACTIONS } from "./timeline-types";

export async function listTimeline(
  userId: string,
  opts: { canModerate?: boolean; highlightId?: string } = {}
): Promise<TLPost[]> {
  const args: any[] = [];
  const conds: string[] = [];

  // Visibilidade por agendamento: ativo para todos; autor/moderador veem também
  // os agendados/expirados (com selo de status).
  if (opts.canModerate) {
    conds.push("TRUE");
  } else {
    args.push(userId);
    conds.push(
      `((p.publish_at IS NULL OR p.publish_at <= now())
        AND (p.expires_at IS NULL OR p.expires_at > now())
        OR p.author_id = $${args.length})`
    );
  }
  if (opts.highlightId) {
    args.push(opts.highlightId);
    conds.push(
      `EXISTS (SELECT 1 FROM timeline_post_highlights ph
               WHERE ph.post_id = p.id AND ph.highlight_id = $${args.length})`
    );
  }

  const posts = await query<
    Omit<TLPost, "reactions" | "comments" | "status">
  >(
    `SELECT p.id, p.kind, p.author_id, p.author_name, p.body, p.image_url,
            p.course_id, t.title AS course_title, p.score, p.created_at,
            p.publish_at, p.expires_at,
            (SELECT count(*)::int FROM story_views v WHERE v.post_id = p.id) AS view_count
     FROM timeline_posts p
     LEFT JOIN trainings t ON t.id = p.course_id
     WHERE ${conds.join(" AND ")}
     ORDER BY p.created_at DESC
     LIMIT 100`,
    args
  );
  if (posts.length === 0) return [];
  const ids = posts.map((p) => p.id);

  const reactions = await query<{
    post_id: string;
    emoji: string;
    count: number;
    mine: boolean;
  }>(
    `SELECT post_id, emoji, count(*)::int AS count, bool_or(user_id=$2) AS mine
     FROM timeline_reactions WHERE post_id = ANY($1)
     GROUP BY post_id, emoji ORDER BY emoji`,
    [ids, userId]
  );
  const comments = await query<TLComment & { post_id: string }>(
    `SELECT id, post_id, author_name, body, created_at
     FROM timeline_comments WHERE post_id = ANY($1)
     ORDER BY created_at ASC`,
    [ids]
  );

  const now = Date.now();
  return posts.map((p) => {
    let status: TLPost["status"] = null;
    if (p.publish_at && new Date(p.publish_at).getTime() > now) status = "AGENDADO";
    else if (p.expires_at && new Date(p.expires_at).getTime() <= now)
      status = "EXPIRADO";
    return {
      ...p,
      status,
      reactions: reactions
        .filter((r) => r.post_id === p.id)
        .map((r) => ({ emoji: r.emoji, count: r.count, mine: r.mine })),
      comments: comments.filter((c) => (c as any).post_id === p.id),
    };
  });
}

// ---- Destaques (stories) ----
export async function listHighlights(): Promise<Highlight[]> {
  return query<Highlight>(
    `SELECT id, title, image_url FROM highlights ORDER BY "order", created_at`
  );
}

/** Destaques com seus posts (somente posts ativos), para o visualizador de stories. */
export async function getHighlightStories(
  userId: string
): Promise<HighlightWithStories[]> {
  const hs = await query<Highlight>(
    `SELECT id, title, image_url FROM highlights ORDER BY "order", created_at`
  );
  if (hs.length === 0) return [];
  const rows = await query<Story & { highlight_id: string }>(
    `SELECT ph.highlight_id, p.id, p.body, p.image_url, p.author_name, p.created_at,
            EXISTS (SELECT 1 FROM story_views v WHERE v.post_id = p.id AND v.user_id = $1) AS seen,
            (SELECT count(*)::int FROM story_views v2 WHERE v2.post_id = p.id) AS view_count
     FROM timeline_post_highlights ph
     JOIN timeline_posts p ON p.id = ph.post_id
     WHERE (p.publish_at IS NULL OR p.publish_at <= now())
       AND (p.expires_at IS NULL OR p.expires_at > now())
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return hs.map((h) => ({
    ...h,
    posts: rows
      .filter((r) => r.highlight_id === h.id)
      .map(({ highlight_id, ...s }) => s),
  }));
}

export async function markStoryViewed(
  userId: string,
  postId: string
): Promise<void> {
  await query(
    `INSERT INTO story_views (user_id, post_id) VALUES ($1,$2)
     ON CONFLICT DO NOTHING`,
    [userId, postId]
  );
}

export async function createHighlight(
  title: string,
  imageUrl: string | null
): Promise<void> {
  await query(`INSERT INTO highlights (title, image_url) VALUES ($1,$2)`, [
    title,
    imageUrl,
  ]);
}

export async function deleteHighlight(id: string): Promise<void> {
  await query(`DELETE FROM highlights WHERE id=$1`, [id]);
}

/** Atualiza o título e, se uma nova imagem for informada, a imagem do destaque. */
export async function updateHighlight(
  id: string,
  title: string,
  imageUrl: string | null
): Promise<void> {
  if (imageUrl) {
    await query(`UPDATE highlights SET title=$2, image_url=$3 WHERE id=$1`, [
      id,
      title,
      imageUrl,
    ]);
  } else {
    await query(`UPDATE highlights SET title=$2 WHERE id=$1`, [id, title]);
  }
}

/** Move o destaque para a esquerda/direita, reordenando todos sequencialmente. */
export async function moveHighlight(
  id: string,
  dir: "left" | "right"
): Promise<void> {
  const hs = await query<{ id: string }>(
    `SELECT id FROM highlights ORDER BY "order", created_at`
  );
  const idx = hs.findIndex((h) => h.id === id);
  if (idx < 0) return;
  const j = dir === "left" ? idx - 1 : idx + 1;
  if (j < 0 || j >= hs.length) return;
  [hs[idx], hs[j]] = [hs[j], hs[idx]];
  for (let i = 0; i < hs.length; i++) {
    await query(`UPDATE highlights SET "order"=$2 WHERE id=$1`, [hs[i].id, i]);
  }
}

export async function setPostHighlights(
  postId: string,
  highlightIds: string[]
): Promise<void> {
  await query(`DELETE FROM timeline_post_highlights WHERE post_id=$1`, [postId]);
  for (const hid of highlightIds) {
    await query(
      `INSERT INTO timeline_post_highlights (post_id, highlight_id)
       VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [postId, hid]
    );
  }
}
