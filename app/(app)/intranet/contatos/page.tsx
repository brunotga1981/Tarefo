export const dynamic = "force-dynamic";

import { query } from "@/lib/db";
import { PRESENCE_DOT } from "@/lib/chat";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profile_name: string | null;
  presence: string;
};

export default async function ContatosPage() {
  const contacts = await query<Contact>(
    `SELECT u.id, u.name, u.email, u.phone, COALESCE(u.presence,'Disponível') AS presence,
       p.name AS profile_name
     FROM users u LEFT JOIN profiles p ON p.id = u.profile_id
     ORDER BY u.name`
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Contatos</h1>
      <p className="mb-6 text-sm text-slate-500">
        Lista de contatos da equipe.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {contacts.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-azul-suave text-sm font-bold text-azul-navy">
                {c.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${PRESENCE_DOT[c.presence]}`}
                title={c.presence}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">{c.name}</p>
              {c.profile_name && (
                <p className="text-[11px] text-slate-400">{c.profile_name}</p>
              )}
              <a
                href={`mailto:${c.email}`}
                className="block truncate text-xs text-azul hover:underline"
              >
                {c.email}
              </a>
              {c.phone && (
                <p className="text-xs text-slate-500">📞 {c.phone}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
