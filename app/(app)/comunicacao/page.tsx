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
} from "@/lib/chat";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { ResetForm } from "@/components/tarefo/ResetForm";
import { AutoRefresh } from "@/components/tarefo/AutoRefresh";
import {
  openDMAction,
  openClientChannelAction,
  createGroupChatAction,
  sendMessageAction,
} from "./actions";

export default async function ComunicacaoPage({
  searchParams,
}: {
  searchParams: { c?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [users, groups, clients] = await Promise.all([
    listUsersBasic(),
    listGroupsFor(user.id),
    listClients(),
  ]);
  const others = users.filter((u) => u.id !== user.id);

  const selectedId = searchParams.c;
  const conversation = selectedId
    ? await getConversation(selectedId, user.id)
    : null;
  const messages = conversation ? await getMessages(conversation.id) : [];
  const clientTasks =
    conversation?.type === "CLIENT" && conversation.client_id
      ? await getClientTasks(conversation.client_id)
      : [];

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Lista de conversas */}
      <aside className="flex w-72 flex-col overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
        <h1 className="mb-2 px-1 text-lg font-bold text-azul-navy">
          Comunicação
        </h1>

        <Section title="Mensagens diretas">
          {others.map((u) => (
            <form key={u.id} action={openDMAction}>
              <input type="hidden" name="user_id" value={u.id} />
              <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-100">
                <Avatar name={u.name} /> {u.name}
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
            <header className="border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-azul-navy">
                {conversation.title}
              </h2>
            </header>

            {/* Prontuário do cliente */}
            {conversation.type === "CLIENT" && (
              <div className="border-b border-slate-100 bg-azul-bg/60 px-5 py-3">
                <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
                  Tarefas do cliente (prontuário)
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

            {/* Mensagens */}
            <div className="flex flex-1 flex-col-reverse overflow-y-auto px-5 py-4">
              <div className="space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-slate-400">
                    Nenhuma mensagem ainda. Escreva a primeira!
                  </p>
                )}
                {messages.map((m) => {
                  const mine = m.author_id === user.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          mine
                            ? "bg-azul-navy text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {!mine && (
                          <p className="mb-0.5 text-[11px] font-semibold text-azul">
                            {m.author_name}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p
                          className={`mt-0.5 text-[10px] ${
                            mine ? "text-white/70" : "text-slate-400"
                          }`}
                        >
                          {formatDateTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Composer */}
            <ResetForm
              action={sendMessageAction}
              className="flex items-center gap-2 border-t border-slate-200 p-3"
            >
              <input type="hidden" name="conversation_id" value={conversation.id} />
              <input
                name="body"
                required
                autoComplete="off"
                placeholder="Escreva uma mensagem…"
                className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-azul"
              />
              <button className="rounded-full bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
                Enviar
              </button>
            </ResetForm>
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
