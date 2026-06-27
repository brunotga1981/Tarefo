export const dynamic = "force-dynamic";

import { getCurrentUser, can } from "@/lib/auth";
import { listUsersBasic } from "@/lib/data";
import {
  listTemplates,
  listSchedules,
  runDueSchedules,
  FREQUENCY_LABELS,
} from "@/lib/templates";
import { formatDateTime } from "@/lib/format";
import { NoAccess } from "@/components/NoAccess";
import {
  createScheduleAction,
  toggleScheduleAction,
  deleteScheduleAction,
} from "../modelos/actions";

const field =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

export default async function AgendamentosPage() {
  const user = await getCurrentUser();
  if (!can(user, "templates.manage")) return <NoAccess />;

  // Gera tarefas de agendamentos vencidos ao abrir a tela.
  await runDueSchedules();

  const [templates, schedules, users] = await Promise.all([
    listTemplates(),
    listSchedules(),
    listUsersBasic(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Agendamentos</h1>
      <p className="mb-6 text-sm text-slate-500">
        Tarefas geradas automaticamente por frequência (diária, semanal, mensal,
        anual).
      </p>

      {templates.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Cadastre um modelo primeiro em “Modelos & Lotes”.
        </p>
      ) : (
        <details className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-azul-navy">
            + Novo agendamento
          </summary>
          <form
            action={createScheduleAction}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <select name="template_id" required className={field} defaultValue="">
              <option value="" disabled>
                Modelo de tarefa…
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select name="owner_id" className={field} defaultValue={user!.id}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  Responsável: {u.name}
                </option>
              ))}
            </select>
            <select name="frequency" className={field} defaultValue="MENSAL">
              {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              name="every"
              type="number"
              min="1"
              defaultValue="1"
              className={field}
              placeholder="A cada (intervalo)"
            />
            <label className="text-xs text-slate-500">
              Início
              <input name="start_date" type="date" required className={`${field} w-full`} />
            </label>
            <label className="text-xs text-slate-500">
              Fim (opcional)
              <input name="end_date" type="date" className={`${field} w-full`} />
            </label>
            <label className="text-xs text-slate-500">
              Hora
              <input name="run_time" type="time" defaultValue="08:00" className={`${field} w-full`} />
            </label>
            <div className="flex items-end">
              <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
                Criar agendamento
              </button>
            </div>
          </form>
        </details>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Modelo</th>
              <th className="px-4 py-3 font-medium">Frequência</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 font-medium">Próxima execução</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Nenhum agendamento.
                </td>
              </tr>
            )}
            {schedules.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-700">
                  {s.template_name}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {FREQUENCY_LABELS[s.frequency]}
                  {s.every > 1 ? ` (a cada ${s.every})` : ""}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {s.owner_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDateTime(s.next_run)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      s.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <form action={toggleScheduleAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-xs text-azul hover:underline">
                        {s.active ? "Pausar" : "Ativar"}
                      </button>
                    </form>
                    <form action={deleteScheduleAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-xs text-slate-400 hover:text-red-500">
                        excluir
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
