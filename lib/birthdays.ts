import { query } from "./db";
export { BIRTHDAY_CARDS } from "./birthday-cards";

const TZ = "America/Sao_Paulo";

export type BirthdayUser = {
  id: string;
  name: string;
  day: number;
  month: number;
  vertical: string[];
  work_location: string | null;
  team: string | null;
};

/** Aniversariantes ativos (todos), com dados para o grid por mês. */
export async function listBirthdays(): Promise<BirthdayUser[]> {
  return query<BirthdayUser>(
    `SELECT id, name, vertical, work_location, team,
       EXTRACT(DAY FROM birth_date)::int AS day,
       EXTRACT(MONTH FROM birth_date)::int AS month
     FROM users WHERE birth_date IS NOT NULL AND active
     ORDER BY EXTRACT(MONTH FROM birth_date), EXTRACT(DAY FROM birth_date), name`
  );
}

/**
 * Publica automaticamente, na Time Line, o cartão dos aniversariantes do dia
 * (um cartão aleatório por pessoa). Idempotente: 1 post por aniversariante/dia.
 * "Cron preguiçoso": roda no primeiro acesso do dia.
 */
export async function runBirthdayPosts(): Promise<void> {
  await query(
    `INSERT INTO timeline_posts (kind, author_id, author_name, body, image_url)
     SELECT 'BIRTHDAY', u.id, u.name,
       '🎉 Hoje é aniversário de ' || u.name || '! (' ||
         to_char(u.birth_date, 'DD/MM') || ') Felicidades! 🥳🎂',
       '/cards/aniversario-' || (1 + floor(random() * 3))::int || '.png'
     FROM users u
     WHERE u.active AND u.birth_date IS NOT NULL
       AND EXTRACT(MONTH FROM u.birth_date) = EXTRACT(MONTH FROM (now() AT TIME ZONE $1))
       AND EXTRACT(DAY FROM u.birth_date) = EXTRACT(DAY FROM (now() AT TIME ZONE $1))
       AND NOT EXISTS (
         SELECT 1 FROM timeline_posts p
         WHERE p.kind = 'BIRTHDAY' AND p.author_id = u.id
           AND (p.created_at AT TIME ZONE $1)::date = (now() AT TIME ZONE $1)::date
       )`,
    [TZ]
  );
}
