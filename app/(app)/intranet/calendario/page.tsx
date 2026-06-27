export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/auth";
import { query } from "@/lib/db";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { ym?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canViewAll = can(user, "tasks.view_all");

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-12
  if (searchParams.ym && /^\d{4}-\d{2}$/.test(searchParams.ym)) {
    const [y, m] = searchParams.ym.split("-").map(Number);
    year = y;
    month = m;
  }

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  // Tarefas com prazo no mês (visíveis ao usuário)
  const taskVis = canViewAll
    ? "TRUE"
    : `(t.owner_id = $2 OR EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = t.id AND tc.user_id = $2))`;
  const tasks = await query<{ id: string; name: string; day: number }>(
    `SELECT t.id, t.name, EXTRACT(DAY FROM t.due_date)::int AS day
     FROM tasks t
     WHERE t.due_date >= $1::date AND t.due_date < ($1::date + interval '1 month')
       AND ${taskVis}
     ORDER BY t.due_date`,
    canViewAll ? [monthStart] : [monthStart, user.id]
  );

  const birthdays = await query<{ name: string; day: number }>(
    `SELECT name, EXTRACT(DAY FROM birth_date)::int AS day
     FROM users WHERE birth_date IS NOT NULL
       AND EXTRACT(MONTH FROM birth_date)::int = $1`,
    [month]
  );

  const byDay: Record<number, { tasks: string[]; birthdays: string[] }> = {};
  for (const t of tasks) {
    (byDay[t.day] ??= { tasks: [], birthdays: [] }).tasks.push(t.name);
  }
  for (const b of birthdays) {
    (byDay[b.day] ??= { tasks: [], birthdays: [] }).birthdays.push(b.name);
  }

  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const isToday = (d: number) =>
    d === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-azul-navy">
          Calendário <span className="text-base font-normal text-slate-500">— {MESES[month - 1]} {year}</span>
        </h1>
        <div className="flex gap-2">
          <Link
            href={`/intranet/calendario?ym=${prev}`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-azul hover:text-azul"
          >
            ← Anterior
          </Link>
          <Link
            href={`/intranet/calendario?ym=${next}`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-azul hover:text-azul"
          >
            Próximo →
          </Link>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-azul" /> Tarefa (prazo)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Aniversário
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-semibold uppercase text-slate-400">
          {DOW.map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => (
            <div
              key={i}
              className={`min-h-24 border-b border-r border-slate-100 p-1.5 ${
                d && isToday(d) ? "bg-azul-suave/20" : ""
              }`}
            >
              {d && (
                <>
                  <div
                    className={`mb-1 text-xs ${
                      isToday(d) ? "font-bold text-azul-navy" : "text-slate-400"
                    }`}
                  >
                    {d}
                  </div>
                  <div className="space-y-0.5">
                    {byDay[d]?.birthdays.map((n, k) => (
                      <div
                        key={`b${k}`}
                        className="truncate rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-700"
                        title={`Aniversário: ${n}`}
                      >
                        🎂 {n}
                      </div>
                    ))}
                    {byDay[d]?.tasks.map((n, k) => (
                      <div
                        key={`t${k}`}
                        className="truncate rounded bg-azul-suave/40 px-1 py-0.5 text-[10px] text-azul-navy"
                        title={`Tarefa: ${n}`}
                      >
                        📋 {n}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
