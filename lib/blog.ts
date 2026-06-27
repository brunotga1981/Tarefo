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
