export const dynamic = "force-dynamic";

import { getCurrentUser, can } from "@/lib/auth";
import { listClients } from "@/lib/data";
import {
  listTemplates,
  listBatches,
  getBatchTemplateIds,
  getTemplateSteps,
} from "@/lib/templates";
import { TASK_TYPES, TYPE_LABELS } from "@/lib/constants";
import { NoAccess } from "@/components/NoAccess";
import { ResetForm } from "@/components/tarefo/ResetForm";
import {
  createTemplateAction,
  addTemplateStepAction,
  deleteTemplateStepAction,
  createBatchAction,
} from "./actions";

const field =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

export default async function ModelosPage() {
  const user = await getCurrentUser();
  if (!can(user, "templates.manage")) return <NoAccess />;

  const [templates, batches, clients] = await Promise.all([
    listTemplates(),
    listBatches(),
    listClients(),
  ]);
  const steps = await Promise.all(templates.map((t) => getTemplateSteps(t.id)));
  const stepsByTemplate = Object.fromEntries(
    templates.map((t, i) => [t.id, steps[i]])
  );
  const batchTemplateIds = await Promise.all(
    batches.map((b) => getBatchTemplateIds(b.id))
  );

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Modelos & Lotes</h1>
      <p className="mb-6 text-sm text-slate-500">
        Tarefas pré-cadastradas com fluxos, responsáveis, prazos e procedimentos.
      </p>

      {/* Novo modelo */}
      <details className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold text-azul-navy">
          + Novo modelo
        </summary>
        <form
          action={createTemplateAction}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <input name="name" required placeholder="Nome do modelo" className={field} />
          <select name="type" className={field} defaultValue="PADRAO">
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <input name="responsavel" placeholder="Responsável padrão" className={field} />
          <input
            name="due_days"
            type="number"
            min="0"
            placeholder="Prazo (dias após criação)"
            className={field}
          />
          <select name="client_id" className={field} defaultValue="">
            <option value="">— Cliente (opcional) —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="tags" placeholder="Tags (vírgula)" className={field} />
          <textarea
            name="description"
            placeholder="Descrição / procedimentos"
            className={`${field} sm:col-span-2`}
            rows={2}
          />
          <div className="sm:col-span-2">
            <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
              Criar modelo
            </button>
          </div>
        </form>
      </details>

      {/* Modelos existentes */}
      <h2 className="mb-2 text-sm font-semibold uppercase text-slate-400">
        Modelos
      </h2>
      <div className="mb-8 space-y-4">
        {templates.length === 0 && (
          <p className="text-sm text-slate-400">Nenhum modelo cadastrado.</p>
        )}
        {templates.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-azul-navy">{t.name}</h3>
                <p className="text-xs text-slate-500">
                  {TYPE_LABELS[t.type]}
                  {t.responsavel && ` · 👤 ${t.responsavel}`}
                  {t.due_days != null && ` · prazo ${t.due_days} dia(s)`}
                  {t.client_name && ` · 🏢 ${t.client_name}`}
                </p>
              </div>
            </div>

            {/* Etapas / procedimentos */}
            <div className="mt-3">
              <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
                Etapas (subtarefas)
              </p>
              <div className="space-y-1">
                {stepsByTemplate[t.id].length === 0 && (
                  <p className="text-xs text-slate-400">Sem etapas.</p>
                )}
                {stepsByTemplate[t.id].map((s, i) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-sm text-slate-600"
                  >
                    <span>
                      {i + 1}. {s.name}
                      {s.sequential && (
                        <span className="ml-1 text-[10px] text-slate-400">
                          (sequencial)
                        </span>
                      )}
                    </span>
                    <form action={deleteTemplateStepAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-[11px] text-slate-400 hover:text-red-500">
                        remover
                      </button>
                    </form>
                  </div>
                ))}
              </div>
              <ResetForm
                action={addTemplateStepAction}
                className="mt-2 flex items-center gap-2"
              >
                <input type="hidden" name="template_id" value={t.id} />
                <input
                  name="name"
                  required
                  placeholder="Nova etapa…"
                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-azul"
                />
                <label className="flex items-center gap-1 text-xs text-slate-500">
                  <input type="checkbox" name="sequential" /> seq.
                </label>
                <button className="rounded-lg bg-azul px-2 py-1 text-xs font-semibold text-white hover:bg-azul-navy">
                  +
                </button>
              </ResetForm>
            </div>
          </div>
        ))}
      </div>

      {/* Lotes */}
      <h2 className="mb-2 text-sm font-semibold uppercase text-slate-400">
        Lotes
      </h2>

      <details className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold text-azul-navy">
          + Novo lote
        </summary>
        <form action={createBatchAction} className="mt-4 space-y-3">
          <input name="name" required placeholder="Nome do lote" className={`${field} w-full`} />
          <input
            name="description"
            placeholder="Descrição (opcional)"
            className={`${field} w-full`}
          />
          <div>
            <p className="mb-1 text-xs text-slate-500">Modelos no lote:</p>
            <div className="space-y-1">
              {templates.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <input type="checkbox" name="template_ids" value={t.id} />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
          <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
            Criar lote
          </button>
        </form>
      </details>

      <div className="space-y-3">
        {batches.length === 0 && (
          <p className="text-sm text-slate-400">Nenhum lote cadastrado.</p>
        )}
        {batches.map((b, i) => (
          <div
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div>
              <h3 className="font-semibold text-azul-navy">{b.name}</h3>
              <p className="text-xs text-slate-500">
                {b.description ? `${b.description} · ` : ""}
                {batchTemplateIds[i].length} modelo(s)
              </p>
            </div>
            <span className="text-xs text-slate-400">
              Para criar as tarefas, use “Nova tarefa → Em lote”.
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
