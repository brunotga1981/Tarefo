"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  generateContentAction,
  type AiContentState,
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
      {pending ? "Gerando conteúdo…" : "🤖 Elaborar conteúdo com IA"}
    </button>
  );
}

export function AiContentForm({ trainingId }: { trainingId: string }) {
  const [state, action] = useFormState<AiContentState, FormData>(
    generateContentAction,
    {}
  );
  return (
    <form
      action={action}
      className="space-y-2 rounded-lg border border-azul-suave bg-azul-suave/10 p-3"
    >
      <input type="hidden" name="training_id" value={trainingId} />
      <p className="text-xs font-semibold text-azul-navy">
        Elaborar o conteúdo do curso com IA
      </p>
      <textarea
        name="reference"
        rows={3}
        placeholder="Texto de referência / observações para a IA…"
        className={field}
      />
      <label className="block text-xs text-slate-500">
        Anexos de apoio (a IA usa como base; também viram material do curso)
        <input type="file" name="attachments" multiple className={`${field} mt-1`} />
      </label>
      <label className="block text-xs text-slate-500">
        Nível
        <select name="difficulty" defaultValue="Médio" className={`${field} mt-1`}>
          <option>Fácil</option>
          <option>Médio</option>
          <option>Difícil</option>
        </select>
      </label>
      <Submit />
      {state.error && (
        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
          Conteúdo gerado e salvo com sucesso!
        </p>
      )}
    </form>
  );
}
