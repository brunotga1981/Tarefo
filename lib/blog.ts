import { query } from "./db";

export type BlogPost = {
  id: string;
  title: string;
  theme: string | null;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  media_type: string | null; // 'image' | 'video'
  publish_at: string | null;
  created_at: string;
  view_count?: number;
};

/** Lista as postagens. Por padrão oculta as agendadas para o futuro; quem
 *  gerencia (canManage) vê todas, inclusive as agendadas (com selo). */
export async function listBlogPosts(
  opts: { canManage?: boolean } = {}
): Promise<BlogPost[]> {
  const where = opts.canManage
    ? ""
    : "WHERE p.publish_at IS NULL OR p.publish_at <= now()";
  return query<BlogPost>(
    `SELECT p.id, p.title, p.theme, p.summary, p.content, p.image_url, p.media_type,
            p.publish_at, p.created_at,
            (SELECT count(*)::int FROM blog_views v WHERE v.post_id = p.id) AS view_count
     FROM blog_posts p ${where}
     ORDER BY COALESCE(p.publish_at, p.created_at) DESC`
  );
}

export async function getBlogPost(id: string): Promise<BlogPost | null> {
  const rows = await query<BlogPost>(
    `SELECT p.id, p.title, p.theme, p.summary, p.content, p.image_url, p.media_type,
            p.publish_at, p.created_at,
            (SELECT count(*)::int FROM blog_views v WHERE v.post_id = p.id) AS view_count
     FROM blog_posts p WHERE p.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

/** Registra a visualização de uma postagem por um usuário (1 por usuário).
 *  Retorna true se foi uma visualização nova (contabilizada). */
export async function markBlogViewed(
  postId: string,
  userId: string
): Promise<boolean> {
  const rows = await query(
    `INSERT INTO blog_views (post_id, user_id) VALUES ($1,$2)
     ON CONFLICT DO NOTHING RETURNING post_id`,
    [postId, userId]
  );
  return rows.length > 0;
}

export type BlogComment = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
};

export async function listBlogComments(postId: string): Promise<BlogComment[]> {
  return query<BlogComment>(
    `SELECT id, author_name, body, created_at
     FROM blog_comments WHERE post_id = $1 ORDER BY created_at ASC`,
    [postId]
  );
}

export async function addBlogComment(
  postId: string,
  userId: string,
  authorName: string,
  body: string
): Promise<void> {
  await query(
    `INSERT INTO blog_comments (post_id, user_id, author_name, body)
     VALUES ($1, $2, $3, $4)`,
    [postId, userId, authorName, body]
  );
}
