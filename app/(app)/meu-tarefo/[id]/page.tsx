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
  getParticipants,
  listUsersBasic,
  canViewTask,
} from "@/lib/data";
import { TYPE_LABELS, TYPE_BADGE, STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime, isOverdue } from "@/lib/format";
import { StatusSelect } from "@/components/tarefo/StatusSelect";
import { FinishTask } from "@/components/tarefo/FinishTask";
import { ResetForm } from "@/components/tarefo/ResetForm";
import { Tabs } from "@/components/tarefo/Tabs";
import {
  addCommentAction,
  createTaskAction,
  uploadAttachmentAction,
  addCollaboratorAction,
  removeCollaboratorAction,
  resolveMentionAction,
} from "../actions";

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

  const [subtasks, comments, attachments, collaborators, users, participants] =
    await Promise.all([
      getSubtasks(task.id),
      getComments(task.id, user.id),
      getAttachments(task.id),
      getCollaborators(task.id),
      listUsersBasic(),
      getParticipants(task.id),
    ]);

  const collabIds = new Set(collaborators.map((c) => c.id));
  const addable = users.filter(
    (u) => !collabIds.has(u.id) && u.id !== task.owner_id
  );
  const overdue = isOverdue(task.due_date, task.status);

  const total = participants.length;
  const doneCount = participants.filter((p) => p.done).length;
  const sharePct = total > 0 ? Math.round(100 / total) : 0;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const me = participants.find((p) => p.id === user.id);
  const isParticipant = !!me;
  const isOwner = task.owner_id === user.id;
  const concluded = task.status === "CONCLUIDA";
  const canManageSub = (isOwner || canViewAll) && (task.depth ?? 0) < 2;

  // ---------- Conteúdo das abas ----------
  const visaoGeral = (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
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
        <div className="flex flex-wrap gap-1.5">
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
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase text-slate-400">
          Descrição
        </h3>
        <p className="whitespace-pre-wrap text-sm text-slate-700">
          {task.description || "Sem descrição."}
        </p>
      </div>
    </div>
  );

  const subtarefas = (
    <div>
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
              {s.owner_name && (
                <span className="ml-1 text-[10px] text-azul">
                  → {s.owner_name}
                </span>
              )}
            </Link>
            <span className="text-[11px] text-slate-400">
              {STATUS_LABELS[s.status]}
            </span>
          </div>
        ))}
      </div>

      {canManageSub ? (
        <ResetForm action={createTaskAction} className="mt-4 space-y-2">
          <input type="hidden" name="parent_id" value={task.id} />
          <input
            name="name"
            required
            placeholder="Nova subtarefa…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul"
          />
          <select
            name="owner_id"
            defaultValue={user.id}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                Atribuir a: {u.name}
              </option>
            ))}
          </select>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input type="checkbox" name="sequential" /> Sequencial
            </label>
            <button className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy">
              Adicionar
            </button>
          </div>
        </ResetForm>
      ) : (
        <p className="mt-4 text-xs text-slate-400">
          {(task.depth ?? 0) >= 2
            ? "Limite de 2 níveis de subtarefa atingido."
            : "Somente o dono da tarefa pode abrir subtarefas."}
        </p>
      )}
    </div>
  );

  const equipe = (
    <div className="space-y-5">
      {/* Responsabilidade dividida */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-slate-400">
            Responsabilidade dividida
          </h3>
          <span className="text-xs text-slate-500">
            {total} participante{total === 1 ? "" : "s"} · {sharePct}% cada ·{" "}
            {progressPct}% concluído
          </span>
        </div>
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <span
              key={p.id}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                p.done
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {p.done ? "✓" : "•"} {p.name}
              {p.is_owner && (
                <span className="text-[10px] text-slate-400">(dono)</span>
              )}
              <span className="text-[10px] text-slate-400">{sharePct}%</span>
            </span>
          ))}
        </div>
      </div>

      {/* Colaboradores */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">
          Colaboradores
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {collaborators.length === 0 && (
            <p className="text-xs text-slate-400">Nenhum colaborador.</p>
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
          <form action={addCollaboratorAction} className="mt-3 flex max-w-sm gap-2">
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
      </div>
    </div>
  );

  const anexos = (
    <div>
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
    </div>
  );

  const comentarios = (
    <div>
      <p className="mb-3 text-xs text-slate-400">
        Use <span className="font-semibold text-azul">@usuario</span> para marcar
        alguém — a tarefa aparecerá na coluna “Marcação de Tarefa - MD” dessa
        pessoa.
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
    </div>
  );

  const TabLabel = ({ text, count }: { text: string; count?: number }) => (
    <span className="flex items-center gap-1.5">
      {text}
      {typeof count === "number" && count > 0 && (
        <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-500">
          {count}
        </span>
      )}
    </span>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3">
        <Link
          href="/meu-tarefo"
          className="text-sm text-slate-400 hover:text-azul"
        >
          ← Meu Tarefo
        </Link>
      </div>

      {/* Cabeçalho compacto */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_BADGE[task.type]}`}
              >
                {TYPE_LABELS[task.type]}
              </span>
              {task.parent_id && (
                <Link
                  href={`/meu-tarefo/${task.parent_id}`}
                  className="rounded bg-azul-suave/50 px-1.5 py-0.5 text-[10px] font-semibold text-azul-navy hover:underline"
                >
                  🧩 Subtarefa de {task.parent_name}
                </Link>
              )}
              {concluded && (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Concluída
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-azul-navy">{task.name}</h1>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
              <span>🏢 {task.client_name ?? "—"}</span>
              <span>📁 {task.project_name ?? "—"}</span>
              <span>👤 {task.responsavel ?? "—"}</span>
              <span className={overdue ? "font-medium text-red-500" : ""}>
                📅 {formatDate(task.due_date)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-36">
              <StatusSelect id={task.id} status={task.status} />
            </div>
            {!concluded && (
              <FinishTask
                taskId={task.id}
                canFinishMine={isParticipant}
                canFinishAll={isOwner || canViewAll}
                myDone={!!me?.done}
              />
            )}
          </div>
        </div>

        {/* Progresso resumido */}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400">
            {doneCount}/{total} ({progressPct}%)
          </span>
        </div>
      </div>

      {/* Abas compactas */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <Tabs
          tabs={[
            { key: "geral", label: <TabLabel text="Visão geral" />, content: visaoGeral },
            {
              key: "subtarefas",
              label: <TabLabel text="Subtarefas" count={subtasks.length} />,
              content: subtarefas,
            },
            {
              key: "equipe",
              label: (
                <TabLabel text="Equipe & Responsabilidade" count={total} />
              ),
              content: equipe,
            },
            {
              key: "anexos",
              label: <TabLabel text="Anexos" count={attachments.length} />,
              content: anexos,
            },
            {
              key: "comentarios",
              label: (
                <TabLabel text="Comentários" count={comments.length} />
              ),
              content: comentarios,
            },
          ]}
        />
      </div>
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
