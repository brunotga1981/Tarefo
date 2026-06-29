export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentUser, can } from "@/lib/auth";
import { listClients } from "@/lib/data";
import {
  listTickets,
  SAC_CHANNELS,
  CHANNEL_LABEL,
  CHANNEL_ICON,
  SAC_STATUS_LABEL,
} from "@/lib/sac";
import { NoAccess } from "@/components/NoAccess";
import { ResetForm } from "@/components/tarefo/ResetForm";
import { formatDateTime } from "@/lib/format";
import {
  registerTicketAction,
  convertTicketAction,
  closeTicketAction,
} from "./actions";

const field =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

const STATUS_BADGE: Record<string, string> = {
  ABERTO: "bg-amber-100 text-amber-700",
  CONVERTIDO: "bg-emerald-100 text-emerald-700",
  FECHADO: "bg-slate-100 text-slate-500",
};

export default async function SacPage({
  searchParams,
}: {
  searchParams: { canal?: string; status?: string };
}) {
  const user = await getCurrentUser();
  if (!can(user, "sac.manage")) return <NoAccess />;

  const channel = SAC_CHANNELS.includes(searchParams.canal as any)
    ? searchParams.canal
    : undefined;
  const status = ["ABERTO", "CONVERTIDO", "FECHADO"].includes(
    searchParams.status ?? ""
  )
    ? searchParams.status
    : undefined;

  const [tickets, clients] = await Promise.all([
    listTickets({ channel, status }),
    listClients(),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">📨 SAC</h1>
      <p className="mb-6 text-sm text-slate-500">
        Atendimentos recebidos por e-mail, Superlógica e WhatsApp — transforme em
        tarefas.
      </p>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterLink label="Todos os canais" href="/sac" active={!channel && !status} />
        {SAC_CHANNELS.map((c) => (
          <FilterLink
            key={c}
            label={`${CHANNEL_ICON[c]} ${CHANNEL_LABEL[c]}`}
            href={`/sac?canal=${c}`}
            active={channel === c}
          />
        ))}
        <span className="mx-1 text-slate-300">|</span>
        <FilterLink label="Abertos" href="/sac?status=ABERTO" active={status === "ABERTO"} />
      </div>

      {/* Registrar atendimento (manual / simulação de recebimento) */}
      <details className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold text-azul-navy">
          + Registrar atendimento
        </summary>
        <ResetForm
          action={registerTicketAction}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <select name="channel" className={field} defaultValue="EMAIL">
            {SAC_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABEL[c]}
              </option>
            ))}
          </select>
          <input name="requester" placeholder="Solicitante (nome/e-mail/telefone)" className={field} />
          <input name="subject" placeholder="Assunto" className={`${field} sm:col-span-2`} />
          <textarea name="body" rows={2} placeholder="Mensagem" className={`${field} sm:col-span-2`} />
          <select name="client_id" className={field} defaultValue="">
            <option value="">— Cliente (opcional) —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="conversation_status" className={field} defaultValue="ABERTA">
            <option value="ABERTA">Conversa aberta (WhatsApp)</option>
            <option value="FECHADA">Conversa fechada (WhatsApp)</option>
          </select>
          <div className="sm:col-span-2">
            <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
              Registrar
            </button>
          </div>
        </ResetForm>
      </details>

      {/* Lista de tickets */}
      <div className="space-y-3">
        {tickets.length === 0 && (
          <p className="text-sm text-slate-400">Nenhum atendimento.</p>
        )}
        {tickets.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {CHANNEL_ICON[t.channel]} {CHANNEL_LABEL[t.channel]}
                  </span>
                  {t.conversation_status && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                      {t.conversation_status === "FECHADA" ? "Conversa fechada" : "Conversa aberta"}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[t.status]}`}
                  >
                    {SAC_STATUS_LABEL[t.status]}
                  </span>
                </div>
                <p className="font-semibold text-slate-800">
                  {t.subject || "(sem assunto)"}
                </p>
                <p className="text-xs text-slate-500">
                  {t.requester ?? "—"} · {formatDateTime(t.created_at)}
                </p>
                {t.body && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{t.body}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {t.status === "ABERTO" ? (
                  <>
                    <form action={convertTicketAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                        ▶ Transformar em tarefa
                      </button>
                    </form>
                    <form action={closeTicketAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-[11px] text-slate-400 hover:text-red-500">
                        fechar
                      </button>
                    </form>
                  </>
                ) : (
                  t.task_id && (
                    <Link
                      href={`/meu-tarefo/${t.task_id}`}
                      className="text-xs font-medium text-azul hover:underline"
                    >
                      ver tarefa →
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-azul bg-azul-suave/30 text-azul-navy"
          : "border-slate-200 bg-white text-slate-500 hover:border-azul hover:text-azul"
      }`}
    >
      {label}
    </Link>
  );
}
