export const dynamic = "force-dynamic";

import { getCurrentUser, can } from "@/lib/auth";
import { listProjectsWithCounts } from "@/lib/admin-data";
import { NoAccess } from "@/components/NoAccess";
import { ResetForm } from "@/components/tarefo/ResetForm";
import { createProjectAction } from "../admin-actions";

export default async function ProjetosPage() {
  const user = await getCurrentUser();
  if (!can(user, "projects.view")) return <NoAccess />;
  const canManage = can(user, "projects.manage");
  const projects = await listProjectsWithCounts();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Projetos</h1>
      <p className="mb-6 text-sm text-slate-500">
        Agrupe tarefas relacionadas a um mesmo projeto.
      </p>

      {canManage && (
        <ResetForm
          action={createProjectAction}
          className="mb-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-4"
        >
          <input
            name="name"
            required
            placeholder="Nome do projeto"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul"
          />
          <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
            Adicionar
          </button>
        </ResetForm>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Projeto</th>
              <th className="px-4 py-3 font-medium">Tarefas</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center text-slate-400">
                  Nenhum projeto cadastrado.
                </td>
              </tr>
            )}
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-700">
                  {p.name}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.task_count} tarefa(s)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
