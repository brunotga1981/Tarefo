"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  createTimelinePostAction,
  aiPostCopyAction,
  aiPostImageAction,
  type AiPostState,
} from "@/app/(app)/intranet/timeline/actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

export function TimelineComposer() {
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("");
  const [copyState, copyAction] = useFormState<AiPostState, FormData>(
    aiPostCopyAction,
    {}
  );
  const [imgState, imgAction] = useFormState<AiPostState, FormData>(
    aiPostImageAction,
    {}
  );

  return (
    <div className="mx-auto mb-6 max-w-lg rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-azul-navy">
        Publicar na Time Line
      </h2>

      {/* Apoio de IA */}
      <div className="mb-3 rounded-lg border border-azul-suave bg-azul-suave/10 p-3">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Tema para a IA (copy/imagem)…"
          className={field}
        />
        <div className="mt-2 flex gap-2">
          <form action={copyAction}>
            <input type="hidden" name="topic" value={topic} />
            <button className="rounded-lg bg-azul px-2 py-1 text-xs font-semibold text-white hover:bg-azul-navy">
              ✍️ Gerar texto (IA)
            </button>
          </form>
          <form action={imgAction}>
            <input type="hidden" name="topic" value={topic} />
            <button className="rounded-lg bg-azul px-2 py-1 text-xs font-semibold text-white hover:bg-azul-navy">
              🎨 Gerar imagem (IA)
            </button>
          </form>
        </div>
        {copyState.copy && (
          <div className="mt-2 text-xs">
            <p className="rounded bg-white p-2 text-slate-700">{copyState.copy}</p>
            <button
              onClick={() => setBody(copyState.copy!)}
              className="mt-1 text-azul hover:underline"
            >
              usar este texto
            </button>
          </div>
        )}
        {(copyState.error || imgState.error) && (
          <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
            {copyState.error || imgState.error}
          </p>
        )}
      </div>

      {/* Publicação */}
      <form action={createTimelinePostAction} className="space-y-2">
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Escreva a notícia/legenda…"
          className={field}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-500">
            Imagem (upload)
            <input type="file" name="image" accept="image/*" className={`${field} mt-1`} />
          </label>
          <input name="image_url" placeholder="ou URL de imagem" className={field} />
        </div>
        <button className="rounded-lg bg-azul-navy px-4 py-2 text-sm font-semibold text-white hover:bg-azul">
          Publicar
        </button>
      </form>
    </div>
  );
}
