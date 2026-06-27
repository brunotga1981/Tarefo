import { query } from "./db";
import type { TLPost, TLComment } from "./timeline-types";
export type { TLPost, TLReaction, TLComment } from "./timeline-types";
export { TL_REACTIONS } from "./timeline-types";

export async function listTimeline(userId: string): Promise<TLPost[]> {
  const posts = await query<Omit<TLPost, "reactions" | "comments">>(
    `SELECT p.id, p.kind, p.author_id, p.author_name, p.body, p.image_url,
            p.course_id, t.title AS course_title, p.score, p.created_at
     FROM timeline_posts p
     LEFT JOIN trainings t ON t.id = p.course_id
     ORDER BY p.created_at DESC
     LIMIT 100`
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

  return posts.map((p) => ({
    ...p,
    reactions: reactions
      .filter((r) => r.post_id === p.id)
      .map((r) => ({ emoji: r.emoji, count: r.count, mine: r.mine })),
    comments: comments.filter((c) => (c as any).post_id === p.id),
  }));
}
