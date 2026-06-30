// Tipos e constantes da Time Line (sem dependência de banco — seguro no client).
export type TLReaction = { emoji: string; count: number; mine: boolean };
export type TLComment = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
};
export type TLPost = {
  id: string;
  kind: string;
  author_id: string | null;
  author_name: string;
  body: string | null;
  image_url: string | null;
  course_id: string | null;
  course_title?: string | null;
  score: number | null;
  created_at: string;
  publish_at: string | null;
  expires_at: string | null;
  status?: "AGENDADO" | "EXPIRADO" | null; // calculado para autor/moderador
  reactions: TLReaction[];
  comments: TLComment[];
};

export type Highlight = {
  id: string;
  title: string;
  image_url: string | null;
};

export type Story = {
  id: string;
  body: string | null;
  image_url: string | null;
  author_name: string;
  created_at: string;
};
export type HighlightWithStories = Highlight & { posts: Story[] };

export const TL_REACTIONS = ["❤️", "👏", "🎉", "👍", "🔥"];
