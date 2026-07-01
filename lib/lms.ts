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

export type Slide = { title: string; bullets: string[] };

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
  verticals?: string[];
  deadline: string | null;
  tutor_id?: string | null;
  tutor_name?: string | null;
  slides?: Slide[] | null;
  published?: boolean;
  material_count?: number;
  question_count?: number;
  my_passed?: boolean;
  my_score?: number | null;
};

/** Itens obrigatórios que faltam para o curso poder ser publicado. */
export function courseMissingItems(
  course: Course,
  questionCount: number
): string[] {
  const missing: string[] = [];
  if (!course.image_url) missing.push("Imagem");
  if (!course.content?.trim()) missing.push("Conteúdo");
  if (!course.slides?.length) missing.push("Apresentação");
  if (questionCount < 1) missing.push("Quiz");
  if (!course.tutor_id) missing.push("Tutor");
  return missing;
}

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

export async function listCourses(
  userId: string,
  opts: { canManage?: boolean } = {}
): Promise<Course[]> {
  // Usuários comuns só veem cursos publicados; quem gerencia vê todos (rascunhos incluídos).
  const where = opts.canManage ? "" : "WHERE t.published";
  return query<Course>(
    `SELECT t.id, t.title, t.theme, t.subtheme, t.description, t.content, t.image_url,
       t.mandatory, t.group_id, t.deadline, t.published, g.name AS group_name,
       (SELECT count(*)::int FROM training_materials m WHERE m.training_id=t.id) AS material_count,
       (SELECT count(*)::int FROM training_questions q WHERE q.training_id=t.id) AS question_count,
       COALESCE((SELECT passed FROM training_completions c WHERE c.training_id=t.id AND c.user_id=$1), false) AS my_passed,
       (SELECT score FROM training_completions c WHERE c.training_id=t.id AND c.user_id=$1) AS my_score
     FROM trainings t
     LEFT JOIN groups g ON g.id = t.group_id
     ${where}
     ORDER BY t.theme NULLS LAST, t.subtheme NULLS LAST, t.title`,
    [userId]
  );
}

export async function getCourse(id: string): Promise<Course | null> {
  const rows = await query<Course>(
    `SELECT t.id, t.title, t.theme, t.subtheme, t.description, t.content, t.image_url,
       t.mandatory, t.group_id, t.verticals, t.deadline, t.slides, t.tutor_id, t.published,
       g.name AS group_name, tu.name AS tutor_name
     FROM trainings t
     LEFT JOIN groups g ON g.id = t.group_id
     LEFT JOIN users tu ON tu.id = t.tutor_id
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

// ---- Acessos ao conteúdo (quem acessou e quantas vezes) ----
/** Registra um acesso ao curso. Para não inflar com o auto-refresh da página,
 *  só conta como novo acesso se o último foi há mais de 30 minutos. */
export async function registerCourseView(
  courseId: string,
  userId: string
): Promise<void> {
  await query(
    `INSERT INTO training_views (training_id, user_id, count)
     VALUES ($1,$2,1)
     ON CONFLICT (training_id, user_id) DO UPDATE
       SET count = training_views.count
                 + CASE WHEN training_views.last_viewed_at < now() - interval '30 minutes'
                        THEN 1 ELSE 0 END,
           last_viewed_at = now()`,
    [courseId, userId]
  );
}

export type CourseAccess = {
  user_id: string;
  name: string;
  count: number;
  last_viewed_at: string;
  passed: boolean;
};

export async function getCourseAccesses(
  courseId: string
): Promise<CourseAccess[]> {
  return query<CourseAccess>(
    `SELECT v.user_id, u.name, v.count, v.last_viewed_at,
            COALESCE(c.passed, false) AS passed
     FROM training_views v
     JOIN users u ON u.id = v.user_id
     LEFT JOIN training_completions c
       ON c.training_id = v.training_id AND c.user_id = v.user_id
     WHERE v.training_id = $1
     ORDER BY v.count DESC, v.last_viewed_at DESC`,
    [courseId]
  );
}

// ---- Fórum ----
export type ForumPost = {
  id: string;
  user_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  quality?: number | null;
};

export async function getForum(courseId: string): Promise<{
  question: ForumPost;
  answers: ForumPost[];
}[]> {
  const all = await query<ForumPost>(
    `SELECT id, user_id, author_name, body, created_at, parent_id, quality
     FROM training_forum
     WHERE training_id=$1 ORDER BY created_at ASC`,
    [courseId]
  );
  const questions = all.filter((p) => !p.parent_id);
  return questions.map((q) => ({
    question: q,
    answers: all.filter((a) => a.parent_id === q.id),
  }));
}

/** Notas que o usuário já deu (por avaliado) neste curso, para pré-preencher. */
export async function getMyTrainingRatings(
  trainingId: string,
  raterId: string
): Promise<Record<string, number>> {
  const rows = await query<{ rated_user_id: string; score: number }>(
    `SELECT rated_user_id, score FROM training_ratings
     WHERE training_id=$1 AND rater_id=$2`,
    [trainingId, raterId]
  );
  const map: Record<string, number> = {};
  for (const r of rows) map[r.rated_user_id] = r.score;
  return map;
}

/** Dúvidas do fórum aguardando resposta do tutor (para o painel do tutor). */
export type PendingForum = {
  training_id: string;
  course_title: string;
  post_id: string;
  author_name: string;
  body: string;
  created_at: string;
};
export async function getPendingForumForUser(
  userId: string
): Promise<PendingForum[]> {
  return query<PendingForum>(
    `SELECT f.training_id, t.title AS course_title, f.id AS post_id,
            f.author_name, f.body, f.created_at
     FROM training_forum f
     JOIN trainings t ON t.id = f.training_id AND t.tutor_id = $1
     WHERE f.parent_id IS NULL AND f.user_id IS DISTINCT FROM $1
       AND NOT EXISTS (SELECT 1 FROM training_forum a
                       WHERE a.parent_id = f.id AND a.user_id = $1)
     ORDER BY f.created_at ASC`,
    [userId]
  );
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
  // Métricas do fórum
  answer_quality: number | null; // média da qualidade (IA) das respostas
  rating_avg: number | null; // média das notas recebidas (0-5)
  avg_response_min: number | null; // tempo médio de resposta como tutor (min)
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
    (
      await query<{ c: number }>(
        `SELECT count(*)::int AS c FROM trainings WHERE published`
      )
    )[0]?.c ?? 0;

  const rows = await query<{
    id: string;
    name: string;
    done: number;
    avg_score: number | null;
    questions: number;
    answers: number;
    overdue: number;
    answer_quality: number | null;
    rating_avg: number | null;
    avg_response_min: number | null;
  }>(
    `SELECT u.id, u.name,
       (SELECT count(*)::int FROM training_completions c WHERE c.user_id=u.id AND c.passed) AS done,
       (SELECT round(avg(score))::int FROM training_completions c WHERE c.user_id=u.id) AS avg_score,
       (SELECT count(*)::int FROM training_forum f WHERE f.user_id=u.id AND f.parent_id IS NULL) AS questions,
       (SELECT count(*)::int FROM training_forum f WHERE f.user_id=u.id AND f.parent_id IS NOT NULL) AS answers,
       (SELECT count(*)::int FROM trainings t
          WHERE t.mandatory AND t.deadline IS NOT NULL AND t.deadline < now()::date
            AND NOT EXISTS (SELECT 1 FROM training_completions c
                            WHERE c.training_id=t.id AND c.user_id=u.id AND c.passed)
            AND ( EXISTS (SELECT 1 FROM group_members gm
                          WHERE gm.group_id=t.group_id AND gm.user_id=u.id)
                  OR u.vertical && t.verticals )
       ) AS overdue,
       (SELECT round(avg(quality))::int FROM training_forum f
          WHERE f.user_id=u.id AND f.parent_id IS NOT NULL AND f.quality IS NOT NULL) AS answer_quality,
       (SELECT round(avg(score)::numeric,1)::float FROM training_ratings tr WHERE tr.rated_user_id=u.id) AS rating_avg,
       (SELECT round(avg(EXTRACT(EPOCH FROM (fa.first_ans - q.created_at))/60))::int
          FROM training_forum q
          JOIN trainings t ON t.id=q.training_id AND t.tutor_id=u.id
          JOIN LATERAL (SELECT min(a.created_at) AS first_ans FROM training_forum a
                        WHERE a.parent_id=q.id AND a.user_id=u.id) fa ON true
          WHERE q.parent_id IS NULL AND fa.first_ans IS NOT NULL) AS avg_response_min
     FROM users u`
  );

  return rows
    .map((r) => {
      const percent = total > 0 ? Math.round((r.done / total) * 100) : 0;
      // Bônus do fórum: qualidade média das respostas (IA), nota recebida dos
      // alunos e agilidade de resposta como tutor.
      const qualityBonus = Math.round((r.answer_quality ?? 0) / 10); // 0-10
      const ratingBonus = Math.round((r.rating_avg ?? 0) * 4); // 0-20
      const responseBonus =
        r.avg_response_min == null
          ? 0
          : r.avg_response_min <= 60
            ? 10
            : r.avg_response_min <= 240
              ? 5
              : 0;
      // Participação: perguntas (+2), respostas (+3), curso aprovado (+5),
      // qualidade/nota/agilidade do fórum e penalidade por obrigatório vencido (-15)
      const participation =
        r.questions * 2 +
        r.answers * 3 +
        r.done * 5 +
        qualityBonus +
        ratingBonus +
        responseBonus -
        r.overdue * OVERDUE_PENALTY;
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
