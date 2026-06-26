export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listUsersBasic, listClients } from "@/lib/data";
import {
  listGroupsFor,
  getConversation,
  getMessages,
  getClientTasks,
  getUserScore,
  computeTMR,
  listShareTargets,
  hasRated,
  PRESENCE_OPTIONS,
  PRESENCE_DOT,
} from "@/lib/chat";
import { STATUS_LABELS } from "@/lib/constants";
import { MessageList } from "@/components/torpedo/MessageList";
import { Composer } from "@/components/torpedo/Composer";
import { AutoRefresh } from "@/components/tarefo/AutoRefresh";
import {
  openDMAction,
  openClientChannelAction,
  createGroupChatAction,
  setPresenceAction,
  finalizeConversationAction,
  rateConversationAction,
} from "./actions";

export default async function TorpedoPage({
  searchParams,
}: {
  searchParams: { c?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [users, groups, clients, shareTargets] = await Promise.all([
    listUsersBasic(),
    listGroupsFor(user.id),
    listClients(),
    listShareTargets(user.id),
  ]);
  const others = users.filter((u) => u.id !== user.id);
  const me = users.find((u) => u.id === user.id);

  const selectedId = searchParams.c;
  const conversation = selectedId
    ? await getConversation(selectedId, user.id)
    : null;
  const messages = conversation
    ? await getMessages(conversation.id, user.id)
    : [];
  const clientTasks =
    conversation?.type === "CLIENT" && conversation.client_id
      ? await getClientTasks(conversation.client_id)
      : [];

  const tmr = conversation ? computeTMR(messages) : null;
  const otherScore =
    conversation?.type === "DM" && conversation.other_id
      ? await getUserScore(conversation.other_id)
      : null;
  const canRate =
    conversation?.type === "DM" &&
    !!conversation.finalized_at &&
    !(await hasRated(conversation.id, user.id));

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Lista de conversas */}
      <aside className="flex w-72 flex-col overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
        <h1 className="mb-1 px-1 text-lg font-bold text-azul-navy">Torpedo</h1>

        {/* Status de presença */}
        <form action={setPresenceAction} className="mb-3 px-1">
          <label className="mb-1 block text-[11px] text-slate-400">
            Seu status
          </label>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${PRESENCE_DOT[me?.presence ?? "Disponível"]}`}
            />
            <select
              name="presence"
              defaultValue={me?.presence ?? "Disponível"}
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-azul"
            >
              {PRESENCE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-azul px-2 py-1 text-xs font-semibold text-white hover:bg-azul-navy">
              OK
            </button>
          </div>
        </form>

        <Section title="Mensagens diretas">
          {others.map((u) => (
            <form key={u.id} action={openDMAction}>
              <input type="hidden" name="user_id" value={u.id} />
              <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-100">
                <span className="relative">
                  <Avatar name={u.name} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${PRESENCE_DOT[u.presence]}`}
                  />
                </span>
                {u.name}
              </button>
            </form>
          ))}
        </Section>

        <Section title="Grupos">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/comunicacao?c=${g.id}`}
              className={`block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 ${
                selectedId === g.id ? "bg-azul-suave/30 text-azul-navy" : "text-slate-600"
              }`}
            >
              👪 {g.name}
            </Link>
          ))}
          <details className="mt-1">
            <summary className="cursor-pointer px-2 text-xs text-azul">
              + Novo grupo
            </summary>
            <form action={createGroupChatAction} className="mt-2 space-y-2 px-1">
              <input
                name="name"
                required
                placeholder="Nome do grupo"
                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-azul"
              />
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {others.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-1.5 text-xs text-slate-600"
                  >
                    <input type="checkbox" name="member_ids" value={u.id} />
                    {u.name}
                  </label>
                ))}
              </div>
              <button className="w-full rounded-lg bg-azul px-2 py-1 text-xs font-semibold text-white hover:bg-azul-navy">
                Criar grupo
              </button>
            </form>
          </details>
        </Section>

        <Section title="Canais de clientes">
          {clients.map((c) => (
            <form key={c.id} action={openClientChannelAction}>
              <input type="hidden" name="client_id" value={c.id} />
              <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-100">
                🏢 {c.name}
              </button>
            </form>
          ))}
        </Section>
      </aside>

      {/* Conversa selecionada */}
      <section className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        {!conversation ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Selecione uma conversa, grupo ou canal de cliente.
          </div>
        ) : (
          <>
            <AutoRefresh />
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-azul-navy">
                {conversation.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span title="Tempo médio de resposta">
                  ⏱ TMR:{" "}
                  <strong>
                    {tmr == null ? "—" : tmr < 1 ? "< 1 min" : `${tmr} min`}
                  </strong>
                </span>
                {otherScore && (
                  <span title="Score de atendimento (anônimo)">
                    ⭐ Score:{" "}
                    <strong>
                      {otherScore.avg == null
                        ? "—"
                        : `${otherScore.avg.toFixed(1)}/5`}
                    </strong>{" "}
                    ({otherScore.count})
                  </span>
                )}
                {conversation.type === "DM" && !conversation.finalized_at && (
                  <form action={finalizeConversationAction}>
                    <input
                      type="hidden"
                      name="conversation_id"
                      value={conversation.id}
                    />
                    <button className="rounded-lg border border-azul px-2 py-1 font-semibold text-azul hover:bg-azul-suave/20">
                      Finalizar Conversa
                    </button>
                  </form>
                )}
              </div>
            </header>

            {/* Pedido de avaliação */}
            {canRate && (
              <div className="border-b border-amber-100 bg-amber-50 px-5 py-3">
                <p className="mb-2 text-sm text-amber-800">
                  Como você avalia este atendimento? (0 a 5)
                </p>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <form key={n} action={rateConversationAction}>
                      <input
                        type="hidden"
                        name="conversation_id"
                        value={conversation.id}
                      />
                      <input type="hidden" name="score" value={n} />
                      <button className="h-8 w-8 rounded-full border border-amber-300 bg-white text-sm font-semibold text-amber-700 hover:bg-amber-100">
                        {n}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            )}

            {/* R.A.C do cliente */}
            {conversation.type === "CLIENT" && (
              <div className="border-b border-slate-100 bg-azul-bg/60 px-5 py-3">
                <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
                  R.A.C — Relatório de Acompanhamento de Cliente
                </p>
                {clientTasks.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Nenhuma tarefa vinculada a este cliente.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {clientTasks.map((t) => (
                      <Link
                        key={t.id}
                        href={`/meu-tarefo/${t.id}`}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:border-azul hover:text-azul"
                      >
                        {t.name}{" "}
                        <span className="text-[10px] text-slate-400">
                          · {STATUS_LABELS[t.status]}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            <MessageList
              messages={messages}
              userId={user.id}
              shareTargets={shareTargets}
            />

            <Composer conversationId={conversation.id} shareTargets={shareTargets} />
          </>
        )}
      </section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <p className="mb-1 px-1 text-[11px] font-semibold uppercase text-slate-400">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-azul-suave text-[10px] font-bold text-azul-navy">
      {initials}
    </span>
  );
}
