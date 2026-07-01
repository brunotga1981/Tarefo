export const dynamic = "force-dynamic";

import Link from "next/link";
import { query } from "@/lib/db";
import { PRESENCE_DOT } from "@/lib/chat";
import { listGroupNames } from "@/lib/admin-data";
import { VERTICALS, WORK_LOCATIONS } from "@/lib/users-meta";

type Contact = {
  id: string;
  name: string;
  email: string;
  cargo: string | null;
  phone: string | null;
  ramal: string | null;
  team: string | null;
  work_location: string | null;
  vertical: string[];
  profile_name: string | null;
  presence: string;
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const sel =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

export default async function ContatosPage({
  searchParams,
}: {
  searchParams: { local?: string; equipe?: string; vertical?: string };
}) {
  const teams = await listGroupNames();
  const local = WORK_LOCATIONS.includes(searchParams.local as any)
    ? searchParams.local
    : "";
  const equipe = teams.includes(searchParams.equipe ?? "")
    ? searchParams.equipe
    : "";
  const vertical = VERTICALS.includes(searchParams.vertical as any)
    ? searchParams.vertical
    : "";

  const conds = ["u.active"];
  const args: any[] = [];
  if (local) {
    args.push(local);
    conds.push(`u.work_location = $${args.length}`);
  }
  if (equipe) {
    args.push(equipe);
    conds.push(`u.team = $${args.length}`);
  }
  if (vertical) {
    args.push(vertical);
    conds.push(`$${args.length} = ANY(u.vertical)`);
  }

  const contacts = await query<Contact>(
    `SELECT u.id, u.name, u.email, u.cargo, u.phone, u.ramal, u.team, u.work_location,
            u.vertical, COALESCE(u.presence,'Disponível') AS presence,
            p.name AS profile_name
     FROM users u LEFT JOIN profiles p ON p.id = u.profile_id
     WHERE ${conds.join(" AND ")}
     ORDER BY u.work_location NULLS LAST, u.name`,
    args
  );
  const hasFilter = !!(local || equipe || vertical);

  // Agrupa por local de trabalho
  const groups = new Map<string, Contact[]>();
  for (const c of contacts) {
    const key = c.work_location || "Sem local definido";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Contatos</h1>
      <p className="mb-4 text-sm text-slate-500">
        Lista de contatos da equipe — {contacts.length} pessoas.
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
          {teams.map((t) => (
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
            href="/intranet/contatos"
            className="px-2 py-2 text-sm text-slate-400 hover:text-azul"
          >
            limpar
          </Link>
        )}
      </form>

      {contacts.length === 0 && (
        <p className="text-sm text-slate-400">
          Nenhum contato com os filtros selecionados.
        </p>
      )}

      {Array.from(groups.entries()).map(([loc, list]) => (
        <section key={loc} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase text-azul">
            📍 {loc}{" "}
            <span className="text-xs font-normal text-slate-400">
              ({list.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {list.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="relative shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-azul-suave text-sm font-bold text-azul-navy">
                    {initials(c.name)}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${PRESENCE_DOT[c.presence]}`}
                    title={c.presence}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{c.name}</p>
                  {c.cargo && (
                    <p className="truncate text-xs font-semibold text-azul-navy">
                      💼 {c.cargo}
                    </p>
                  )}
                  {(c.profile_name || c.team) && (
                    <p className="text-[11px] text-slate-400">
                      {[c.profile_name, c.team].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <a
                    href={`mailto:${c.email}`}
                    className="block truncate text-xs text-azul hover:underline"
                  >
                    ✉️ {c.email}
                  </a>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}
                      className="block text-xs text-slate-500 hover:text-azul"
                    >
                      📱 {c.phone}
                    </a>
                  )}
                  {c.ramal && (
                    <p className="text-xs text-slate-500">☎️ Ramal {c.ramal}</p>
                  )}
                  {c.vertical.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.vertical.map((v) => (
                        <span
                          key={v}
                          className="rounded-full bg-azul-suave/40 px-2 py-0.5 text-[10px] font-medium text-azul-navy"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
