"use client";

import { useFormState, useFormStatus } from "react-dom";
import { generateQuizAction, type AiQuizState } from "@/app/(app)/treinamentos/actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy disabled:opacity-60"
    >
      {pending ? "Gerando com IA…" : "🤖 Gerar quiz com IA"}
    </button>
  );
}

export function AiQuizForm({ trainingId }: { trainingId: string }) {
  const [state, action] = useFormState<AiQuizState, FormData>(
    generateQuizAction,
    {}
  );
  return (
    <form action={action} className="space-y-2 rounded-lg border border-azul-suave bg-azul-suave/10 p-3">
      <input type="hidden" name="training_id" value={trainingId} />
      <p className="text-xs font-semibold text-azul-navy">
        Gerar perguntas automaticamente (IA lê o conteúdo do curso)
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-500">
          Nº mínimo de perguntas
          <input
            name="num"
            type="number"
            min="1"
            max="20"
            defaultValue="5"
            className={`${field} mt-1`}
          />
        </label>
        <label className="text-xs text-slate-500">
          Grau de dificuldade
          <select name="difficulty" defaultValue="Médio" className={`${field} mt-1`}>
            <option>Fácil</option>
            <option>Médio</option>
            <option>Difícil</option>
          </select>
        </label>
      </div>
      <Submit />
      {state.error && (
        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">
          {state.error}
        </p>
      )}
      {state.created != null && (
        <p className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
          {state.created} pergunta(s) geradas com sucesso!
        </p>
      )}
    </form>
  );
}
