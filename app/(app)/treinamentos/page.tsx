export const dynamic = "force-dynamic";

import { getCurrentUser, can } from "@/lib/auth";
import { query } from "@/lib/db";
import { ResetForm } from "@/components/tarefo/ResetForm";
import { createTrainingAction, deleteTrainingAction } from "./actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

type Training = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  url: string | null;
};

export default async function TreinamentosPage() {
  const user = await getCurrentUser();
  const canManage = can(user, "trainings.manage");
  const trainings = await query<Training>(
    `SELECT id, title, category, description, url FROM trainings ORDER BY created_at DESC`
  );

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">🎓 Treinamentos</h1>
      <p className="mb-6 text-sm text-slate-500">
        Materiais e capacitações internas da equipe.
      </p>

      {canManage && (
        <details className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-azul-navy">
            + Novo treinamento
          </summary>
          <form
            action={createTrainingAction}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <input name="title" required placeholder="Título" className={field} />
            <input name="category" placeholder="Categoria (ex.: Onboarding)" className={field} />
            <input
              name="url"
              placeholder="Link do material/vídeo (opcional)"
              className={`${field} sm:col-span-2`}
            />
            <textarea
              name="description"
              rows={2}
              placeholder="Descrição"
              className={`${field} sm:col-span-2`}
            />
            <div className="sm:col-span-2">
              <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
                Cadastrar treinamento
              </button>
            </div>
          </form>
        </details>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {trainings.length === 0 && (
          <p className="text-sm text-slate-400">Nenhum treinamento cadastrado.</p>
        )}
        {trainings.map((t) => (
          <div
            key={t.id}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-azul-navy">{t.title}</h3>
              {t.category && (
                <span className="shrink-0 rounded-full bg-azul-suave/40 px-2 py-0.5 text-[11px] font-medium text-azul-navy">
                  {t.category}
                </span>
              )}
            </div>
            {t.description && (
              <p className="mt-2 flex-1 text-sm text-slate-600">{t.description}</p>
            )}
            <div className="mt-3 flex items-center justify-between">
              {t.url ? (
                <a
                  href={t.url}
                  target="_blank"
                  className="text-sm font-medium text-azul hover:underline"
                >
                  ▶ Abrir material
                </a>
              ) : (
                <span className="text-xs text-slate-400">Sem link</span>
              )}
              {canManage && (
                <form action={deleteTrainingAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="text-xs text-slate-400 hover:text-red-500">
                    excluir
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
