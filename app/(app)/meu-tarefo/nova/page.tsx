export const dynamic = "force-dynamic";

import Link from "next/link";
import { listClients, listProjects } from "@/lib/data";
import { TASK_TYPES, TYPE_LABELS } from "@/lib/constants";
import { createTaskAction } from "../actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave";
const label = "mb-1 block text-sm font-medium text-slate-700";

export default async function NovaTarefaPage() {
  const [clients, projects] = await Promise.all([
    listClients(),
    listProjects(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/meu-tarefo"
          className="text-sm text-slate-400 hover:text-azul"
        >
          ← Voltar
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-azul-navy">Nova tarefa</h1>
      </div>

      <form
        action={createTaskAction}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
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
    </div>
  );
}
