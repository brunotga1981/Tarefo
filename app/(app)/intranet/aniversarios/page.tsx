export const dynamic = "force-dynamic";

import Link from "next/link";
import { runBirthdayPosts, listBirthdays, type BirthdayUser } from "@/lib/birthdays";
import { listGroupNames } from "@/lib/admin-data";
import { VERTICALS, WORK_LOCATIONS } from "@/lib/users-meta";
import { BirthdayCardSender } from "@/components/intranet/BirthdayCardSender";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const sel =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

function UserCard({ u }: { u: BirthdayUser }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-slate-800">{u.name}</span>
        <span className="shrink-0 rounded-full bg-azul-suave/40 px-2 py-0.5 text-[11px] font-semibold text-azul-navy">
          {String(u.day).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-0.5 text-[11px] text-slate-500">
        {[u.team, u.work_location].filter(Boolean).join(" · ") || "—"}
      </div>
      {u.vertical.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {u.vertical.map((v) => (
            <span
              key={v}
              className="rounded-full bg-azul-suave/30 px-1.5 py-0.5 text-[9px] font-medium text-azul-navy"
            >
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function AniversariosPage({
  searchParams,
}: {
  searchParams: { local?: string; equipe?: string; vertical?: string };
}) {
  await runBirthdayPosts(); // publica o cartão dos aniversariantes do dia (1x/dia)

  const [all, teams] = await Promise.all([listBirthdays(), listGroupNames()]);

  const local = WORK_LOCATIONS.includes(searchParams.local as any) ? searchParams.local : "";
  const equipe = teams.includes(searchParams.equipe ?? "") ? searchParams.equipe : "";
  const vertical = VERTICALS.includes(searchParams.vertical as any) ? searchParams.vertical : "";
  const hasFilter = !!(local || equipe || vertical);

  const list = all.filter(
    (u) =>
      (!local || u.work_location === local) &&
      (!equipe || u.team === equipe) &&
      (!vertical || u.vertical.includes(vertical))
  );

  const now = new Date();
  const todayM = now.getMonth() + 1;
  const todayD = now.getDate();
  const today = list.filter((u) => u.month === todayM && u.day === todayD);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Aniversários</h1>
      <p className="mb-4 text-sm text-slate-500">
        Datas de aniversário da equipe, por mês.
      </p>

      {/* Destaque: aniversariantes de hoje */}
      {today.length > 0 && (
        <section className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
          <h2 className="mb-3 text-sm font-semibold text-amber-800">
            🎉 Aniversariantes de hoje
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {today.map((u) => (
              <div
                key={u.id}
                className="rounded-lg border border-amber-200 bg-white p-3"
              >
                <p className="font-semibold text-slate-800">🎂 {u.name}</p>
                <p className="text-xs text-slate-500">
                  {[u.team, u.work_location].filter(Boolean).join(" · ")}
                </p>
                <BirthdayCardSender userId={u.id} userName={u.name} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filtros */}
      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3"
      >
        <select name="local" defaultValue={local} className={sel}>
          <option value="">Local — todos</option>
          {WORK_LOCATIONS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select name="equipe" defaultValue={equipe} className={sel}>
          <option value="">Equipe — todas</option>
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select name="vertical" defaultValue={vertical} className={sel}>
          <option value="">Vertical — todas</option>
          {VERTICALS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
          Filtrar
        </button>
        {hasFilter && (
          <Link href="/intranet/aniversarios" className="px-2 py-2 text-sm text-slate-400 hover:text-azul">
            limpar
          </Link>
        )}
      </form>

      {/* Grid por mês */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MESES.map((mes, i) => {
          const month = i + 1;
          const users = list.filter((u) => u.month === month);
          const isCurrent = month === todayM;
          return (
            <section
              key={mes}
              className={`rounded-xl border bg-white p-4 ${
                isCurrent ? "border-azul" : "border-slate-200"
              }`}
            >
              <h3 className="mb-2 text-sm font-semibold uppercase text-azul">
                {mes}{" "}
                <span className="text-xs font-normal text-slate-400">
                  ({users.length})
                </span>
              </h3>
              {users.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhum aniversariante.</p>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <UserCard key={u.id} u={u} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
