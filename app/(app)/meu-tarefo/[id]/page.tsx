export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/auth";
import {
  getTask,
  getSubtasks,
  getComments,
  getAttachments,
  getCollaborators,
  listUsersBasic,
  canViewTask,
} from "@/lib/data";
import { TYPE_LABELS, TYPE_BADGE, STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime, isOverdue } from "@/lib/format";
import { StatusSelect } from "@/components/tarefo/StatusSelect";
import { ResetForm } from "@/components/tarefo/ResetForm";
import {
  addCommentAction,
  createTaskAction,
  uploadAttachmentAction,
  addCollaboratorAction,
  removeCollaboratorAction,
  resolveMentionAction,
} from "../actions";

// Destaca @menções no texto do comentário.
function renderBody(body: string) {
  const parts = body.split(/(@[a-z0-9_.-]+)/gi);
  return parts.map((p, i) =>
    /^@[a-z0-9_.-]+$/i.test(p) ? (
      <span key={i} className="font-semibold text-azul">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default async function TaskDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canViewAll = can(user, "tasks.view_all");

  if (!(await canViewTask(params.id, user.id, canViewAll))) notFound();

  const task = await getTask(params.id);
  if (!task) notFound();

  const [subtasks, comments, attachments, collaborators, users] =
    await Promise.all([
      getSubtasks(task.id),
      getComments(task.id, user.id),
      getAttachments(task.id),
      getCollaborators(task.id),
      listUsersBasic(),
    ]);

  const collabIds = new Set(collaborators.map((c) => c.id));
  const addable = users.filter(
    (u) => !collabIds.has(u.id) && u.id !== task.owner_id
  );
  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <Link
          href="/meu-tarefo"
          className="text-sm text-slate-400 hover:text-azul"
        >
          ← Meu Tarefo
        </Link>
      </div>

      {/* Cabeçalho */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span
              className={`mb-2 inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[task.type]}`}
            >
              {TYPE_LABELS[task.type]}
            </span>
            <h1 className="text-2xl font-bold text-azul-navy">{task.name}</h1>
            {task.parent_id && (
              <Link
                href={`/meu-tarefo/${task.parent_id}`}
                className="text-xs text-azul hover:underline"
              >
                ↑ Pertence a uma tarefa principal
              </Link>
            )}
          </div>
          <div className="w-44">
            <span className="mb-1 block text-xs text-slate-400">Status</span>
            <StatusSelect id={task.id} status={task.status} />
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Info label="Cliente" value={task.client_name ?? "—"} />
          <Info label="Projeto" value={task.project_name ?? "—"} />
          <Info label="Responsável" value={task.responsavel ?? "—"} />
          <Info label="Solicitação" value={formatDate(task.request_date)} />
          <Info label="Início" value={formatDate(task.start_date)} />
          <Info
            label="Finalização"
            value={formatDate(task.due_date)}
            danger={overdue}
          />
        </dl>

        {task.tags && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {task.tags.split(",").map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-azul-suave/30 px-2 py-0.5 text-[11px] text-azul-navy"
              >
                #{tag.trim()}
              </span>
            ))}
          </div>
        )}

        {task.description && (
          <div className="mt-5">
            <h3 className="mb-1 text-xs font-semibold uppercase text-slate-400">
              Descrição
            </h3>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {task.description}
            </p>
          </div>
        )}
      </div>

      {/* Colaboradores */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-azul-navy">
          🤝 Colaboradores de tarefas
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {collaborators.length === 0 && (
            <p className="text-xs text-slate-400">
              Nenhum colaborador. Adicione usuários para colaborar nesta tarefa.
            </p>
          )}
          {collaborators.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
            >
              {c.name}
              <form action={removeCollaboratorAction} className="inline">
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="user_id" value={c.id} />
                <button className="ml-1 text-emerald-500 hover:text-red-500">
                  ✕
                </button>
              </form>
            </span>
          ))}
        </div>

        {addable.length > 0 && (
          <form
            action={addCollaboratorAction}
            className="mt-3 flex max-w-sm gap-2"
          >
            <input type="hidden" name="task_id" value={task.id} />
            <select
              name="user_id"
              defaultValue=""
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul"
            >
              <option value="" disabled>
                Adicionar colaborador…
              </option>
              {addable.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Adicionar
            </button>
          </form>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Subtarefas */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-azul-navy">
            🧩 Subtarefas
          </h2>
          <div className="space-y-2">
            {subtasks.length === 0 && (
              <p className="text-xs text-slate-400">Nenhuma subtarefa.</p>
            )}
            {subtasks.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <Link
                  href={`/meu-tarefo/${s.id}`}
                  className="flex-1 text-sm text-slate-700 hover:text-azul"
                >
                  <span className="text-slate-400">{i + 1}.</span> {s.name}
                  {s.sequential && (
                    <span className="ml-1 text-[10px] text-slate-400">
                      (sequencial)
                    </span>
                  )}
                </Link>
                <span className="text-[11px] text-slate-400">
                  {STATUS_LABELS[s.status]}
                </span>
              </div>
            ))}
          </div>

          <ResetForm action={createTaskAction} className="mt-4 space-y-2">
            <input type="hidden" name="parent_id" value={task.id} />
            <input
              name="name"
              required
              placeholder="Nova subtarefa…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input type="checkbox" name="sequential" /> Sequencial
              </label>
              <button className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy">
                Adicionar
              </button>
            </div>
          </ResetForm>
        </section>

        {/* Anexos */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-azul-navy">
            📎 Anexos
          </h2>
          <div className="space-y-2">
            {attachments.length === 0 && (
              <p className="text-xs text-slate-400">Nenhum anexo.</p>
            )}
            {attachments.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-azul hover:underline"
              >
                <span className="truncate">{a.filename}</span>
                <span className="text-[11px] text-slate-400">
                  {(a.size / 1024).toFixed(0)} KB
                </span>
              </a>
            ))}
          </div>

          <ResetForm
            action={uploadAttachmentAction}
            className="mt-4 flex items-center gap-2"
          >
            <input type="hidden" name="task_id" value={task.id} />
            <input
              type="file"
              name="file"
              required
              className="flex-1 text-xs text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-azul-suave/40 file:px-2 file:py-1 file:text-azul-navy"
            />
            <button className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy">
              Enviar
            </button>
          </ResetForm>
        </section>
      </div>

      {/* Comentários / evolução */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-azul-navy">
          💬 Comentários de evolução
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Use <span className="font-semibold text-azul">@usuario</span> para
          marcar alguém — a tarefa aparecerá na coluna “Marcação de Tarefa - MD”
          dessa pessoa.
        </p>

        <ResetForm action={addCommentAction} className="mb-5 space-y-2">
          <input type="hidden" name="task_id" value={task.id} />
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Registrar evolução… (ex.: @atendimento favor verificar)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul"
          />
          <div className="flex justify-end">
            <button className="rounded-lg bg-azul-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-azul">
              Comentar
            </button>
          </div>
        </ResetForm>

        <div className="space-y-3">
          {comments.length === 0 && (
            <p className="text-xs text-slate-400">Nenhum comentário ainda.</p>
          )}
          {comments.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg border p-3 ${
                c.mentions_me_pending
                  ? "border-azul-claro bg-azul-suave/20"
                  : "border-slate-100 bg-slate-50"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-azul-navy">
                  {c.author_name}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatDateTime(c.created_at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {renderBody(c.body)}
              </p>
              {c.mentions_me_pending && (
                <form action={resolveMentionAction} className="mt-2">
                  <input type="hidden" name="comment_id" value={c.id} />
                  <input type="hidden" name="task_id" value={task.id} />
                  <button className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                    ✓ Check — baixar marcação
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Info({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={danger ? "font-medium text-red-500" : "text-slate-700"}>
        {value}
      </dd>
    </div>
  );
}
