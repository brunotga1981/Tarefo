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
  reactions: TLReaction[];
  comments: TLComment[];
};

export const TL_REACTIONS = ["❤️", "👏", "🎉", "👍", "🔥"];
