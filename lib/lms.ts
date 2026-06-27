import { query } from "./db";

export const MATERIAL_KINDS = ["VIDEO", "PDF", "PPT", "LINK", "OUTRO"] as const;
export const MATERIAL_LABEL: Record<string, string> = {
  VIDEO: "Vídeo",
  PDF: "PDF",
  PPT: "Apresentação",
  LINK: "Link",
  OUTRO: "Outro",
};
export const MATERIAL_ICON: Record<string, string> = {
  VIDEO: "🎬",
  PDF: "📄",
  PPT: "📊",
  LINK: "🔗",
  OUTRO: "📎",
};

export const PASS_SCORE = 70;

// Converte URLs de YouTube/Vimeo em URL de player incorporado (embed).
export function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export type Course = {
  id: string;
  title: string;
  theme: string | null;
  subtheme: string | null;
  description: string | null;
  content: string | null;
  image_url: string | null;
  mandatory: boolean;
  group_id: string | null;
  group_name?: string | null;
  deadline: string | null;
  material_count?: number;
  question_count?: number;
  my_passed?: boolean;
  my_score?: number | null;
};

export type Material = {
  id: string;
  kind: string;
  title: string;
  url: string;
  order: number;
};

export type Question = {
  id: string;
  prompt: string;
  order: number;
  options: { id: string; text: string; is_correct: boolean; order: number }[];
};

export async function listCourses(userId: string): Promise<Course[]> {
  return query<Course>(
    `SELECT t.id, t.title, t.theme, t.subtheme, t.description, t.content, t.image_url,
       t.mandatory, t.group_id, t.deadline, g.name AS group_name,
       (SELECT count(*)::int FROM training_materials m WHERE m.training_id=t.id) AS material_count,
       (SELECT count(*)::int FROM training_questions q WHERE q.training_id=t.id) AS question_count,
       COALESCE((SELECT passed FROM training_completions c WHERE c.training_id=t.id AND c.user_id=$1), false) AS my_passed,
       (SELECT score FROM training_completions c WHERE c.training_id=t.id AND c.user_id=$1) AS my_score
     FROM trainings t
     LEFT JOIN groups g ON g.id = t.group_id
     ORDER BY t.theme NULLS LAST, t.subtheme NULLS LAST, t.title`,
    [userId]
  );
}

export async function getCourse(id: string): Promise<Course | null> {
  const rows = await query<Course>(
    `SELECT t.id, t.title, t.theme, t.subtheme, t.description, t.content, t.image_url,
       t.mandatory, t.group_id, t.deadline, g.name AS group_name
     FROM trainings t LEFT JOIN groups g ON g.id = t.group_id
     WHERE t.id=$1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getMaterials(courseId: string): Promise<Material[]> {
  return query<Material>(
    `SELECT id, kind, title, url, "order" FROM training_materials
     WHERE training_id=$1 ORDER BY "order", title`,
    [courseId]
  );
}

export async function getQuestions(courseId: string): Promise<Question[]> {
  const qs = await query<Omit<Question, "options">>(
    `SELECT id, prompt, "order" FROM training_questions
     WHERE training_id=$1 ORDER BY "order"`,
    [courseId]
  );
  if (qs.length === 0) return [];
  const opts = await query<{
    id: string;
    question_id: string;
    text: string;
    is_correct: boolean;
    order: number;
  }>(
    `SELECT id, question_id, text, is_correct, "order" FROM training_options
     WHERE question_id = ANY($1) ORDER BY "order"`,
    [qs.map((q) => q.id)]
  );
  return qs.map((q) => ({
    ...q,
    options: opts.filter((o) => o.question_id === q.id),
  }));
}

export async function getCompletion(
  courseId: string,
  userId: string
): Promise<{ score: number; passed: boolean; completed_at: string } | null> {
  const rows = await query<{
    score: number;
    passed: boolean;
    completed_at: string;
  }>(
    `SELECT score, passed, completed_at FROM training_completions
     WHERE training_id=$1 AND user_id=$2`,
    [courseId, userId]
  );
  return rows[0] ?? null;
}

// ---- Fórum ----
export type ForumPost = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
  parent_id: string | null;
};

export async function getForum(courseId: string): Promise<{
  question: ForumPost;
  answers: ForumPost[];
}[]> {
  const all = await query<ForumPost>(
    `SELECT id, author_name, body, created_at, parent_id FROM training_forum
     WHERE training_id=$1 ORDER BY created_at ASC`,
    [courseId]
  );
  const questions = all.filter((p) => !p.parent_id);
  return questions.map((q) => ({
    question: q,
    answers: all.filter((a) => a.parent_id === q.id),
  }));
}

// ---- Ranking / categorias ----
export type RankRow = {
  id: string;
  name: string;
  done: number;
  total: number;
  percent: number;
  tier: string;
  avg_score: number | null;
  questions: number;
  answers: number;
  overdue: number;
  participation: number;
};

export const OVERDUE_PENALTY = 15;

export function tierOf(percent: number): string {
  if (percent < 51) return "Bronze";
  if (percent < 71) return "Prata";
  if (percent < 91) return "Ouro";
  return "Diamante";
}

export const TIER_STYLE: Record<string, string> = {
  Bronze: "bg-amber-700/10 text-amber-800 border-amber-700/30",
  Prata: "bg-slate-200 text-slate-600 border-slate-300",
  Ouro: "bg-amber-100 text-amber-700 border-amber-300",
  Diamante: "bg-sky-100 text-sky-700 border-sky-300",
};

export async function getRanking(): Promise<RankRow[]> {
  const total =
    (await query<{ c: number }>(`SELECT count(*)::int AS c FROM trainings`))[0]
      ?.c ?? 0;

  const rows = await query<{
    id: string;
    name: string;
    done: number;
    avg_score: number | null;
    questions: number;
    answers: number;
    overdue: number;
  }>(
    `SELECT u.id, u.name,
       (SELECT count(*)::int FROM training_completions c WHERE c.user_id=u.id AND c.passed) AS done,
       (SELECT round(avg(score))::int FROM training_completions c WHERE c.user_id=u.id) AS avg_score,
       (SELECT count(*)::int FROM training_forum f WHERE f.user_id=u.id AND f.parent_id IS NULL) AS questions,
       (SELECT count(*)::int FROM training_forum f WHERE f.user_id=u.id AND f.parent_id IS NOT NULL) AS answers,
       (SELECT count(*)::int FROM trainings t
          JOIN group_members gm ON gm.group_id=t.group_id AND gm.user_id=u.id
          WHERE t.mandatory AND t.deadline IS NOT NULL AND t.deadline < now()::date
            AND NOT EXISTS (SELECT 1 FROM training_completions c
                            WHERE c.training_id=t.id AND c.user_id=u.id AND c.passed)
       ) AS overdue
     FROM users u`
  );

  return rows
    .map((r) => {
      const percent = total > 0 ? Math.round((r.done / total) * 100) : 0;
      // Participação: perguntas (+2), respostas (+3), bônus por curso aprovado (+5)
      // e penalidade por curso obrigatório vencido (-15)
      const participation =
        r.questions * 2 + r.answers * 3 + r.done * 5 - r.overdue * OVERDUE_PENALTY;
      return {
        ...r,
        total,
        percent,
        tier: tierOf(percent),
        participation,
      };
    })
    .sort(
      (a, b) =>
        b.percent - a.percent ||
        b.participation - a.participation ||
        (b.avg_score ?? 0) - (a.avg_score ?? 0)
    );
}
