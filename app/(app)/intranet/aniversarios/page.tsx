export const dynamic = "force-dynamic";

import Link from "next/link";
import { query } from "@/lib/db";
import { TEAMS, VERTICALS, WORK_LOCATIONS } from "@/lib/users-meta";

type Aniv = {
  id: string;
  name: string;
  day: number;
  month: number;
  work_location: string | null;
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const sel =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

export default async function AniversariosPage({
  searchParams,
}: {
  searchParams: { local?: string; equipe?: string; vertical?: string };
}) {
  const local = WORK_LOCATIONS.includes(searchParams.local as any)
    ? searchParams.local
    : "";
  const equipe = TEAMS.includes(searchParams.equipe as any)
    ? searchParams.equipe
    : "";
  const vertical = VERTICALS.includes(searchParams.vertical as any)
    ? searchParams.vertical
    : "";

  const conds = ["birth_date IS NOT NULL", "active"];
  const args: any[] = [];
  if (local) {
    args.push(local);
    conds.push(`work_location = $${args.length}`);
  }
  if (equipe) {
    args.push(equipe);
    conds.push(`team = $${args.length}`);
  }
  if (vertical) {
    args.push(vertical);
    conds.push(`$${args.length} = ANY(vertical)`);
  }
  const hasFilter = !!(local || equipe || vertical);

  const rows = await query<Aniv>(
    `SELECT id, name, work_location,
       EXTRACT(DAY FROM birth_date)::int AS day,
       EXTRACT(MONTH FROM birth_date)::int AS month
     FROM users WHERE ${conds.join(" AND ")}`,
    args
  );

  const now = new Date();
  const todayM = now.getMonth() + 1;
  const todayD = now.getDate();

  // dias até o próximo aniversário (para ordenar)
  function daysUntil(m: number, d: number) {
    let next = new Date(now.getFullYear(), m - 1, d);
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (next < t) next = new Date(now.getFullYear() + 1, m - 1, d);
    return Math.round((+next - +t) / 86400000);
  }

  const list = rows
    .map((r) => ({ ...r, until: daysUntil(r.month, r.day) }))
    .sort((a, b) => a.until - b.until);

  const today = list.filter((r) => r.month === todayM && r.day === todayD);
  const thisMonth = list.filter(
    (r) => r.month === todayM && !(r.day === todayD)
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Aniversários</h1>
      <p className="mb-4 text-sm text-slate-500">
        Datas de aniversário da equipe.
      </p>

      {/* Filtros */}
      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3"
      >
        <select name="local" defaultValue={local} className={sel}>
          <option value="">Local — todos</option>
          {WORK_LOCATIONS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select name="equipe" defaultValue={equipe} className={sel}>
          <option value="">Equipe — todas</option>
          {TEAMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select name="vertical" defaultValue={vertical} className={sel}>
          <option value="">Vertical — todas</option>
          {VERTICALS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
          Filtrar
        </button>
        {hasFilter && (
          <Link
            href="/intranet/aniversarios"
            className="px-2 py-2 text-sm text-slate-400 hover:text-azul"
          >
            limpar
          </Link>
        )}
      </form>

      {today.length > 0 && (
        <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-2 text-sm font-semibold text-amber-800">
            🎉 Aniversariantes de hoje
          </h2>
          <div className="flex flex-wrap gap-2">
            {today.map((r) => (
              <span
                key={r.id}
                className="rounded-full bg-white px-3 py-1 text-sm font-medium text-amber-700 shadow-sm"
              >
                🎂 {r.name}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase text-azul">
          Aniversariantes de {MESES[todayM - 1]}
        </h2>
        {thisMonth.length === 0 && today.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum aniversário neste mês.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-700">
            {thisMonth.map((r) => (
              <li key={r.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {r.name}
                  {r.work_location && (
                    <span className="text-xs text-slate-400"> · {r.work_location}</span>
                  )}
                </span>
                <span className="shrink-0 text-slate-400">
                  {String(r.day).padStart(2, "0")}/{String(r.month).padStart(2, "0")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase text-azul">
          Próximos aniversários
        </h2>
        <ul className="space-y-1 text-sm text-slate-700">
          {list.map((r) => (
            <li key={r.id} className="flex justify-between gap-2">
              <span className="truncate">
                {r.name}
                {r.work_location && (
                  <span className="text-xs text-slate-400"> · {r.work_location}</span>
                )}
              </span>
              <span className="shrink-0 text-slate-400">
                {String(r.day).padStart(2, "0")}/{String(r.month).padStart(2, "0")}
                {r.until === 0
                  ? " · hoje"
                  : r.until === 1
                    ? " · amanhã"
                    : ` · em ${r.until} dias`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
