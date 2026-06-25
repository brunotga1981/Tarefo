export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/auth";
import { listVisibleTasks, type TaskRow } from "@/lib/data";
import { STATUS_LABELS, TYPE_LABELS, TYPE_BADGE } from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/format";
import { StatusSelect } from "@/components/tarefo/StatusSelect";

const SORTS = [
  { key: "priority", label: "Prioridade" },
  { key: "due", label: "Data de finalização" },
  { key: "client", label: "Cliente" },
  { key: "responsavel", label: "Responsável" },
  { key: "recent", label: "Mais recentes" },
];

const COLUMNS = [
  { key: "A_FAZER", label: "A Fazer", kind: "status" as const },
  { key: "EM_ANDAMENTO", label: "Em Andamento", kind: "status" as const },
  { key: "MD", label: "Marcação de Tarefa - MD", kind: "mentions" as const },
  { key: "CONCLUIDA", label: "Concluída", kind: "status" as const },
];

function bucketOf(t: TaskRow): string {
  if ((t.pending_mentions ?? 0) > 0) return "MD";
  return t.status;
}

export default async function MeuTarefoPage({
  searchParams,
}: {
  searchParams: { view?: string; sort?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canViewAll = can(user, "tasks.view_all");

  const view = searchParams.view === "lista" ? "lista" : "kanban";
  const sort = searchParams.sort ?? "priority";
  const tasks = await listVisibleTasks(user.id, canViewAll, sort);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-azul-navy">Meu Tarefo</h1>
          <p className="text-sm text-slate-500">
            {tasks.length} tarefa{tasks.length === 1 ? "" : "s"}
            {canViewAll ? " · visão de todas as tarefas" : " · suas tarefas"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <Link
              href={`/meu-tarefo?view=kanban&sort=${sort}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === "kanban"
                  ? "bg-azul-navy text-white"
                  : "text-slate-500 hover:text-azul-navy"
              }`}
            >
              Kanban
            </Link>
            <Link
              href={`/meu-tarefo?view=lista&sort=${sort}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === "lista"
                  ? "bg-azul-navy text-white"
                  : "text-slate-500 hover:text-azul-navy"
              }`}
            >
              Lista
            </Link>
          </div>

          <Link
            href="/meu-tarefo/nova"
            className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white transition hover:bg-azul-navy"
          >
            + Nova tarefa
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-400">Ordenar por:</span>
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={`/meu-tarefo?view=${view}&sort=${s.key}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              sort === s.key
                ? "border-azul bg-azul-suave/30 text-azul-navy"
                : "border-slate-200 bg-white text-slate-500 hover:border-azul hover:text-azul"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Legenda */}
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-l-4 border-emerald-500 bg-emerald-50" />
          Você é colaborador
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-azul-suave" />
          Marcação de Tarefa (MD): você foi @mencionado
        </span>
      </div>

      {view === "kanban" ? (
        <KanbanView tasks={tasks} />
      ) : (
        <ListView tasks={tasks} />
      )}
    </div>
  );
}

function KanbanView({ tasks }: { tasks: TaskRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => bucketOf(t) === col.key);
        const isMD = col.kind === "mentions";
        return (
          <div
            key={col.key}
            className={`rounded-xl border p-3 ${
              isMD
                ? "border-azul-claro bg-azul-suave/20"
                : "border-slate-200 bg-white/60"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-azul-navy">
                {col.label}
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.length === 0 && (
                <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-400">
                  {isMD ? "Sem marcações" : "Sem tarefas"}
                </div>
              )}
              {items.map((t) => (
                <KanbanCard key={t.id} task={t} showMention={isMD} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  task,
  showMention,
}: {
  task: TaskRow;
  showMention?: boolean;
}) {
  const overdue = isOverdue(task.due_date, task.status);
  const collab = task.is_collaborator;
  return (
    <div
      className={`rounded-lg border bg-white p-3 shadow-sm transition hover:shadow ${
        collab ? "border-l-4 border-l-emerald-500 border-slate-200" : "border-slate-200"
      }`}
    >
      <Link href={`/meu-tarefo/${task.id}`} className="block">
        <div className="mb-2 flex flex-wrap items-center gap-1">
          <span
            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_BADGE[task.type]}`}
          >
            {TYPE_LABELS[task.type]}
          </span>
          {collab && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              Colaborador
            </span>
          )}
          {showMention && (
            <span className="rounded bg-azul px-1.5 py-0.5 text-[10px] font-semibold text-white">
              @você
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-slate-800">{task.name}</p>
        <div className="mt-2 space-y-0.5 text-[11px] text-slate-400">
          {task.client_name && <p>🏢 {task.client_name}</p>}
          {task.responsavel && <p>👤 {task.responsavel}</p>}
          <p className={overdue ? "text-red-500 font-medium" : ""}>
            📅 {formatDate(task.due_date)}
            {overdue && " (atrasada)"}
          </p>
          {!!task.subtask_count && <p>🧩 {task.subtask_count} subtarefa(s)</p>}
        </div>
      </Link>
      {!showMention && (
        <div className="mt-2">
          <StatusSelect id={task.id} status={task.status} />
        </div>
      )}
      {showMention && (
        <Link
          href={`/meu-tarefo/${task.id}`}
          className="mt-2 block rounded-md bg-azul-navy py-1 text-center text-[11px] font-semibold text-white hover:bg-azul"
        >
          Verificar marcação →
        </Link>
      )}
    </div>
  );
}

function ListView({ tasks }: { tasks: TaskRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Tarefa</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Responsável</th>
            <th className="px-4 py-3 font-medium">Finalização</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                Nenhuma tarefa visível para você. Clique em “+ Nova tarefa”.
              </td>
            </tr>
          )}
          {tasks.map((t) => {
            const overdue = isOverdue(t.due_date, t.status);
            return (
              <tr
                key={t.id}
                className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                  t.is_collaborator ? "border-l-4 border-l-emerald-500" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/meu-tarefo/${t.id}`}
                    className="font-medium text-azul-navy hover:underline"
                  >
                    {t.name}
                  </Link>
                  {t.is_collaborator && (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Colaborador
                    </span>
                  )}
                  {!!t.pending_mentions && (
                    <span className="ml-1 rounded bg-azul px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      MD
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_BADGE[t.type]}`}
                  >
                    {TYPE_LABELS[t.type]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {t.client_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {t.responsavel ?? "—"}
                </td>
                <td
                  className={`px-4 py-3 ${overdue ? "font-medium text-red-500" : "text-slate-600"}`}
                >
                  {formatDate(t.due_date)}
                </td>
                <td className="px-4 py-3 w-40">
                  <StatusSelect id={t.id} status={t.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
