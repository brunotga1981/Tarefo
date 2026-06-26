"use client";

import { useState, type ReactNode } from "react";
import { formatDateTime } from "@/lib/format";
import {
  toggleReactionAction,
  forwardMessagesAction,
} from "@/app/(app)/comunicacao/actions";
import type { Message } from "@/lib/chat";

const QUICK = ["👍", "❤️", "😂", "✅", "🎉", "🙏"];

function renderRich(body: string): ReactNode {
  // **negrito**, *itálico*
  const tokens = body.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((tk, i) => {
    if (/^\*\*[^*]+\*\*$/.test(tk))
      return <strong key={i}>{tk.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(tk)) return <em key={i}>{tk.slice(1, -1)}</em>;
    return <span key={i}>{tk}</span>;
  });
}

export function MessageList({
  messages,
  userId,
  shareTargets,
}: {
  messages: Message[];
  userId: string;
  shareTargets: { id: string; label: string }[];
}) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reactFor, setReactFor] = useState<string | null>(null);

  function toggleSel(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-1.5 text-xs">
        <button
          onClick={() => {
            setSelecting((v) => !v);
            setSelected(new Set());
          }}
          className="text-slate-500 hover:text-azul"
        >
          {selecting ? "Cancelar seleção" : "↗ Encaminhar mensagens"}
        </button>
        {selecting && selected.size > 0 && (
          <form action={forwardMessagesAction} className="flex items-center gap-2">
            {Array.from(selected).map((id) => (
              <input key={id} type="hidden" name="message_ids" value={id} />
            ))}
            <select
              name="target"
              required
              defaultValue=""
              className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
              <option value="" disabled>
                Encaminhar {selected.size} para…
              </option>
              {shareTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <button className="rounded bg-azul px-2 py-1 text-xs font-semibold text-white hover:bg-azul-navy">
              Encaminhar
            </button>
          </form>
        )}
      </div>

      <div className="flex flex-1 flex-col-reverse overflow-y-auto px-5 py-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-xs text-slate-400">
              Nenhuma mensagem ainda. Escreva a primeira!
            </p>
          )}
          {messages.map((m) => {
            const mine = m.author_id === userId;
            return (
              <div
                key={m.id}
                className={`flex items-start gap-2 ${mine ? "justify-end" : "justify-start"}`}
              >
                {selecting && (
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggleSel(m.id)}
                    className="mt-3"
                  />
                )}
                <div className={`max-w-[75%]`}>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      mine ? "bg-azul-navy text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {!mine && (
                      <p className="mb-0.5 text-[11px] font-semibold text-azul">
                        {m.author_name}
                      </p>
                    )}
                    {m.forwarded_from && (
                      <p
                        className={`mb-0.5 text-[10px] italic ${mine ? "text-white/70" : "text-slate-400"}`}
                      >
                        ↪ encaminhada
                      </p>
                    )}
                    {m.body && (
                      <p className="whitespace-pre-wrap">{renderRich(m.body)}</p>
                    )}
                    {m.file_url && (
                      <a
                        href={m.file_url}
                        target="_blank"
                        className={`mt-1 block text-xs underline ${mine ? "text-white" : "text-azul"}`}
                      >
                        📎 {m.file_name}
                      </a>
                    )}
                    <p
                      className={`mt-0.5 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}
                    >
                      {formatDateTime(m.created_at)}
                    </p>
                  </div>

                  {/* Reações */}
                  <div
                    className={`mt-1 flex items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}
                  >
                    {m.reactions?.map((r) => (
                      <form key={r.emoji} action={toggleReactionAction}>
                        <input type="hidden" name="message_id" value={m.id} />
                        <input type="hidden" name="emoji" value={r.emoji} />
                        <button
                          className={`rounded-full border px-1.5 py-0.5 text-[11px] ${
                            r.mine
                              ? "border-azul bg-azul-suave/40"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          {r.emoji} {r.count}
                        </button>
                      </form>
                    ))}
                    <button
                      onClick={() =>
                        setReactFor(reactFor === m.id ? null : m.id)
                      }
                      className="rounded-full px-1 text-[11px] text-slate-300 hover:text-slate-500"
                    >
                      ＋
                    </button>
                  </div>
                  {reactFor === m.id && (
                    <div
                      className={`mt-1 flex gap-1 ${mine ? "justify-end" : "justify-start"}`}
                    >
                      {QUICK.map((e) => (
                        <form key={e} action={toggleReactionAction}>
                          <input type="hidden" name="message_id" value={m.id} />
                          <input type="hidden" name="emoji" value={e} />
                          <button className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-sm hover:bg-slate-50">
                            {e}
                          </button>
                        </form>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
