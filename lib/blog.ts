import { query } from "./db";

export type BlogPost = {
  id: string;
  title: string;
  theme: string | null;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
};

export async function listBlogPosts(): Promise<BlogPost[]> {
  return query<BlogPost>(
    `SELECT id, title, theme, summary, content, image_url, created_at
     FROM blog_posts ORDER BY created_at DESC`
  );
}

export async function getBlogPost(id: string): Promise<BlogPost | null> {
  const rows = await query<BlogPost>(
    `SELECT id, title, theme, summary, content, image_url, created_at
     FROM blog_posts WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
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
