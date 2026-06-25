export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentUser, can } from "@/lib/auth";
import { listClientsWithCounts } from "@/lib/admin-data";
import { NoAccess } from "@/components/NoAccess";
import { ResetForm } from "@/components/tarefo/ResetForm";
import { createClientAction } from "../admin-actions";

export default async function ClientesPage() {
  const user = await getCurrentUser();
  if (!can(user, "clients.view")) return <NoAccess />;
  const canManage = can(user, "clients.manage");
  const clients = await listClientsWithCounts();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Clientes</h1>
      <p className="mb-6 text-sm text-slate-500">
        Cada cliente reúne suas tarefas e (em breve) seu canal de comunicação.
      </p>

      {canManage && (
        <ResetForm
          action={createClientAction}
          className="mb-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-4"
        >
          <input
            name="name"
            required
            placeholder="Nome do cliente"
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
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Tarefas</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center text-slate-400">
                  Nenhum cliente cadastrado.
                </td>
              </tr>
            )}
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-700">
                  {c.name}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/meu-tarefo?view=lista`}
                    className="text-azul hover:underline"
                  >
                    {c.task_count} tarefa(s)
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
