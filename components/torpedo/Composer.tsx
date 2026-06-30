"use client";

import { useRef, useState } from "react";
import { EMOJIS } from "@/components/EmojiInsert";
import { sendMessageAction } from "@/app/(app)/comunicacao/actions";

export function Composer({
  conversationId,
  shareTargets,
}: {
  conversationId: string;
  shareTargets: { id: string; label: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [shares, setShares] = useState<{ id: string; label: string }[]>([]);
  const [showSlash, setShowSlash] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  function onChange(v: string) {
    setValue(v);
    setShowSlash(v.trim().startsWith("/"));
  }

  function wrap(marker: string) {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart ?? value.length;
    const e = ta.selectionEnd ?? value.length;
    const sel = value.slice(s, e) || "texto";
    const next = value.slice(0, s) + marker + sel + marker + value.slice(e);
    setValue(next);
    ta.focus();
  }

  function insert(text: string) {
    setValue((v) => v + text);
    taRef.current?.focus();
  }

  function addShare(t: { id: string; label: string }) {
    setShares((s) => (s.find((x) => x.id === t.id) ? s : [...s, t]));
    onChange("");
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await sendMessageAction(fd);
        setValue("");
        setShares([]);
        setShowEmoji(false);
        formRef.current?.reset();
      }}
      className="border-t border-slate-200 p-3"
    >
      <input type="hidden" name="conversation_id" value={conversationId} />
      {shares.map((s) => (
        <input key={s.id} type="hidden" name="share_targets" value={s.id} />
      ))}

      {shares.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
          Compartilhar também com:
          {shares.map((s) => (
            <span
              key={s.id}
              className="flex items-center gap-1 rounded-full bg-azul-suave/40 px-2 py-0.5 text-azul-navy"
            >
              {s.label}
              <button
                type="button"
                onClick={() =>
                  setShares((cur) => cur.filter((x) => x.id !== s.id))
                }
                className="text-azul-navy/60 hover:text-red-500"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {showSlash && shareTargets.length > 0 && (
        <div className="mb-2 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 text-sm shadow">
          <p className="px-2 py-1 text-[11px] text-slate-400">
            Compartilhar esta mensagem com:
          </p>
          {shareTargets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => addShare(t)}
              className="block w-full rounded px-2 py-1 text-left hover:bg-slate-100"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {showEmoji && (
        <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => insert(e)}
              className="rounded p-1 text-lg hover:bg-slate-100"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="mb-1 flex items-center gap-1 text-slate-400">
        <button type="button" onClick={() => wrap("**")} className="rounded px-1.5 font-bold hover:bg-slate-100">
          B
        </button>
        <button type="button" onClick={() => wrap("*")} className="rounded px-1.5 italic hover:bg-slate-100">
          I
        </button>
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className="rounded px-1.5 hover:bg-slate-100"
          title="Emojis"
        >
          😀
        </button>
        <label className="cursor-pointer rounded px-1.5 hover:bg-slate-100" title="Anexar arquivo">
          📎
          <input type="file" name="file" className="hidden" />
        </label>
        <span className="ml-auto text-[10px] text-slate-300">
          Digite “/” para compartilhar · **negrito** *itálico*
        </span>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          ref={taRef}
          name="body"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={1}
          placeholder="Escreva uma mensagem…"
          className="max-h-32 flex-1 resize-none rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-azul"
        />
        <button className="rounded-full bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
          Enviar
        </button>
      </div>
    </form>
  );
}
