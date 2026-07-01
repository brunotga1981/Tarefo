"use client";

import { useFormState } from "react-dom";
import {
  publishCourseAction,
  type PublishState,
} from "@/app/(app)/treinamentos/actions";
import { SubmitButton } from "@/components/tarefo/SubmitButton";

/** Botão "Publicar Treinamento" — só publica se os itens obrigatórios estiverem
 *  completos; caso contrário lista o que falta. */
export function PublishCourseForm({
  trainingId,
  published,
  missing,
}: {
  trainingId: string;
  published: boolean;
  missing: string[];
}) {
  const [state, action] = useFormState<PublishState, FormData>(
    publishCourseAction,
    {}
  );

  if (published) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
        ✓ Treinamento publicado e disponível para os usuários.
      </div>
    );
  }

  const pending = state.missing ?? missing;

  return (
    <form
      action={action}
      className="space-y-2 rounded-lg border border-azul-navy/20 bg-azul-suave/10 p-3"
    >
      <input type="hidden" name="training_id" value={trainingId} />
      <p className="text-sm font-semibold text-azul-navy">
        Publicação do treinamento
      </p>
      {pending.length > 0 ? (
        <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
          ⚠️ Itens obrigatórios pendentes: <strong>{pending.join(", ")}</strong>.
          Conclua todos para publicar.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Todos os itens obrigatórios estão completos. Ao publicar, o curso fica
          visível aos usuários e é anunciado na Time Line.
        </p>
      )}
      <SubmitButton
        pendingText="Publicando…"
        className="rounded-lg bg-azul-navy px-4 py-2 text-sm font-semibold text-white hover:bg-azul disabled:opacity-60"
      >
        🚀 Publicar Treinamento
      </SubmitButton>
      {state.error && !state.missing && (
        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
