export const dynamic = "force-dynamic";

import { query } from "@/lib/db";

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

export default async function AniversariosPage() {
  const rows = await query<Aniv>(
    `SELECT id, name, work_location,
       EXTRACT(DAY FROM birth_date)::int AS day,
       EXTRACT(MONTH FROM birth_date)::int AS month
     FROM users WHERE birth_date IS NOT NULL AND active`
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
      <p className="mb-6 text-sm text-slate-500">
        Datas de aniversário da equipe.
      </p>

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
