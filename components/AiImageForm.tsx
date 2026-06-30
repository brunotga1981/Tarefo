"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  generateCourseImageAction,
  type AiImageState,
} from "@/app/(app)/treinamentos/actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy disabled:opacity-60"
    >
      {pending ? "Gerando imagem…" : "🎨 Gerar capa com IA (ChatGPT)"}
    </button>
  );
}

export function AiImageForm({ trainingId }: { trainingId: string }) {
  const [state, action] = useFormState<AiImageState, FormData>(
    generateCourseImageAction,
    {}
  );
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="training_id" value={trainingId} />
      <input
        name="prompt"
        placeholder="Descreva a imagem da capa (opcional — a IA usa o título do curso)…"
        className={field}
      />
      <Submit />
      {state.error && (
        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
          Imagem gerada e salva como capa do curso!
        </p>
      )}
    </form>
  );
}
