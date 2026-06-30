export const dynamic = "force-dynamic";

import { query } from "@/lib/db";
import { PRESENCE_DOT } from "@/lib/chat";

type Contact = {
  id: string;
  name: string;
  email: string;
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

export default async function ContatosPage() {
  const contacts = await query<Contact>(
    `SELECT u.id, u.name, u.email, u.phone, u.ramal, u.team, u.work_location,
            u.vertical, COALESCE(u.presence,'Disponível') AS presence,
            p.name AS profile_name
     FROM users u LEFT JOIN profiles p ON p.id = u.profile_id
     WHERE u.active
     ORDER BY u.work_location NULLS LAST, u.name`
  );

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
      <p className="mb-6 text-sm text-slate-500">
        Lista de contatos da equipe — {contacts.length} pessoas.
      </p>

      {Array.from(groups.entries()).map(([local, list]) => (
        <section key={local} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase text-azul">
            📍 {local}{" "}
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

      {contacts.length === 0 && (
        <p className="text-sm text-slate-400">Nenhum contato cadastrado.</p>
      )}
    </div>
  );
}
