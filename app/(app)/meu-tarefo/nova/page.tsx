export const dynamic = "force-dynamic";

import Link from "next/link";
import { listClients, listProjects } from "@/lib/data";
import { listTemplates, listBatches } from "@/lib/templates";
import { TASK_TYPES, TYPE_LABELS } from "@/lib/constants";
import { Tabs } from "@/components/tarefo/Tabs";
import { createTaskAction } from "../actions";
import {
  instantiateTemplateAction,
  instantiateBatchAction,
} from "../../modelos/actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave";
const label = "mb-1 block text-sm font-medium text-slate-700";

export default async function NovaTarefaPage() {
  const [clients, projects, templates, batches] = await Promise.all([
    listClients(),
    listProjects(),
    listTemplates(),
    listBatches(),
  ]);

  const avulsa = (
    <form action={createTaskAction} className="space-y-4">
      <div>
        <label className={label}>Nome da tarefa *</label>
        <input name="name" required className={field} autoFocus />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Tipo</label>
          <select name="type" className={field} defaultValue="PADRAO">
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Responsável</label>
          <input name="responsavel" className={field} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Data de início</label>
          <input type="date" name="start_date" className={field} />
        </div>
        <div>
          <label className={label}>Data de finalização</label>
          <input type="date" name="due_date" className={field} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Cliente</label>
          <select name="client_id" className={field} defaultValue="">
            <option value="">— Nenhum —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Projeto</label>
          <select name="project_id" className={field} defaultValue="">
            <option value="">— Nenhum —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Descrição</label>
        <textarea name="description" rows={4} className={field} />
      </div>

      <div>
        <label className={label}>Tags (separadas por vírgula)</label>
        <input name="tags" className={field} placeholder="financeiro, mensal" />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/meu-tarefo"
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          className="rounded-lg bg-azul-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-azul"
        >
          Criar tarefa
        </button>
      </div>
    </form>
  );

  const porModelo = (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        Cria uma tarefa já com o tipo, prazo, responsável e as etapas
        (subtarefas) definidos no modelo.
      </p>
      {templates.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Nenhum modelo cadastrado. Cadastre em{" "}
          <Link href="/modelos" className="font-semibold underline">
            Modelos &amp; Lotes
          </Link>
          .
        </p>
      ) : (
        <form action={instantiateTemplateAction} className="flex gap-2">
          <select
            name="template_id"
            required
            defaultValue=""
            className={field}
          >
            <option value="" disabled>
              Escolha um modelo…
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.step_count ? ` (${t.step_count} etapas)` : ""}
              </option>
            ))}
          </select>
          <button className="whitespace-nowrap rounded-lg bg-azul-navy px-5 py-2 text-sm font-semibold text-white hover:bg-azul">
            Criar tarefa
          </button>
        </form>
      )}
    </div>
  );

  const emLote = (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        Cria de uma vez todas as tarefas dos modelos que compõem o lote.
      </p>
      {batches.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Nenhum lote cadastrado. Cadastre em{" "}
          <Link href="/modelos" className="font-semibold underline">
            Modelos &amp; Lotes
          </Link>
          .
        </p>
      ) : (
        <form action={instantiateBatchAction} className="flex gap-2">
          <select name="batch_id" required defaultValue="" className={field}>
            <option value="" disabled>
              Escolha um lote…
            </option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.template_count ? ` (${b.template_count} tarefas)` : ""}
              </option>
            ))}
          </select>
          <button className="whitespace-nowrap rounded-lg bg-azul-navy px-5 py-2 text-sm font-semibold text-white hover:bg-azul">
            Criar lote de tarefas
          </button>
        </form>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/meu-tarefo" className="text-sm text-slate-400 hover:text-azul">
          ← Voltar
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-azul-navy">Nova tarefa</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <Tabs
          tabs={[
            { key: "avulsa", label: "Tarefa avulsa", content: avulsa },
            { key: "modelo", label: "A partir de modelo", content: porModelo },
            { key: "lote", label: "Em lote", content: emLote },
          ]}
        />
      </div>
    </div>
  );
}
