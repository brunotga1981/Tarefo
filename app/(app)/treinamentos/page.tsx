/* eslint-disable @next/next/no-img-element */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentUser, can } from "@/lib/auth";
import { query } from "@/lib/db";
import { listCourses, getRanking, TIER_STYLE, type Course } from "@/lib/lms";
import { createCourseAction } from "./actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

export default async function TreinamentosPage() {
  const user = await getCurrentUser();
  const canManage = can(user, "trainings.manage");
  const [courses, ranking, groups] = await Promise.all([
    listCourses(user!.id),
    getRanking(),
    canManage
      ? query<{ id: string; name: string }>(`SELECT id, name FROM groups ORDER BY name`)
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);
  const me = ranking.find((r) => r.id === user!.id);

  // Agrupa cursos por tema > subtema
  const byTheme: Record<string, Course[]> = {};
  for (const c of courses) {
    const key = c.theme || "Geral";
    (byTheme[key] ??= []).push(c);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">🎓 Treinamentos</h1>
      <p className="mb-6 text-sm text-slate-500">
        Ranking de engajamento e catálogo de cursos.
      </p>

      {/* Meu painel */}
      {me && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Sua categoria">
            <span
              className={`rounded-full border px-2 py-0.5 text-sm font-bold ${TIER_STYLE[me.tier]}`}
            >
              {me.tier}
            </span>
          </Stat>
          <Stat label="Cursos concluídos">
            <span className="text-lg font-bold text-azul-navy">
              {me.done}/{me.total} · {me.percent}%
            </span>
          </Stat>
          <Stat label="Média das avaliações">
            <span className="text-lg font-bold text-azul-navy">
              {me.avg_score == null ? "—" : `${me.avg_score}%`}
            </span>
          </Stat>
          <Stat label="Score de participação">
            <span className="text-lg font-bold text-azul-navy">
              {me.participation} pts
            </span>
          </Stat>
        </div>
      )}

      {/* Ranking */}
      <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Concluídos</th>
              <th className="px-4 py-3 font-medium">Média</th>
              <th className="px-4 py-3 font-medium">Participação</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr
                key={r.id}
                className={`border-b border-slate-100 last:border-0 ${
                  r.id === user!.id ? "bg-azul-suave/10" : ""
                }`}
              >
                <td className="px-4 py-3 text-slate-400">{i + 1}º</td>
                <td className="px-4 py-3 font-medium text-slate-700">{r.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TIER_STYLE[r.tier]}`}
                  >
                    {r.tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.done}/{r.total} ({r.percent}%)
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.avg_score == null ? "—" : `${r.avg_score}%`}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.participation} pts</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Catálogo */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-azul-navy">Cursos</h2>
        {canManage && (
          <details className="relative">
            <summary className="cursor-pointer rounded-lg bg-azul px-3 py-1.5 text-sm font-semibold text-white">
              + Novo curso
            </summary>
            <form
              action={createCourseAction}
              className="absolute right-0 z-10 mt-2 w-80 space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
            >
              <input name="title" required placeholder="Título do curso" className={field} />
              <input name="theme" placeholder="Tema" className={field} />
              <input name="subtheme" placeholder="Subtema" className={field} />
              <textarea name="description" rows={2} placeholder="Descrição" className={field} />
              <input name="image_url" placeholder="URL de imagem (opcional)" className={field} />
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" name="mandatory" /> Curso obrigatório
              </label>
              <select name="group_id" className={field} defaultValue="">
                <option value="">Equipe obrigada (se obrigatório)…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <label className="block text-xs text-slate-500">
                Prazo para concluir (se obrigatório)
                <input type="date" name="deadline" className={`${field} mt-1`} />
              </label>
              <button className="w-full rounded-lg bg-azul-navy px-3 py-2 text-sm font-semibold text-white hover:bg-azul">
                Criar e configurar
              </button>
            </form>
          </details>
        )}
      </div>

      <div className="space-y-6">
        {courses.length === 0 && (
          <p className="text-sm text-slate-400">Nenhum curso cadastrado.</p>
        )}
        {Object.entries(byTheme).map(([theme, list]) => (
          <div key={theme}>
            <h3 className="mb-2 text-sm font-semibold uppercase text-slate-400">
              {theme}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <Link
                  key={c.id}
                  href={`/treinamentos/${c.id}`}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow"
                >
                  <div className="h-32 w-full bg-azul-suave/30">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.title} className="h-32 w-full object-cover" />
                    ) : (
                      <div className="flex h-32 items-center justify-center text-4xl text-azul-claro">
                        🎓
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    {c.subtheme && (
                      <span className="mb-1 w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                        {c.subtheme}
                      </span>
                    )}
                    <h4 className="font-semibold text-azul-navy">{c.title}</h4>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {c.material_count} material(is) · {c.question_count} questões
                      </span>
                      {c.my_passed ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                          ✓ {c.my_score}%
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                          pendente
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <div className="mb-1">{children}</div>
      <div className="text-[10px] uppercase text-slate-400">{label}</div>
    </div>
  );
}
