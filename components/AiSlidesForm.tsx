"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  generateSlidesAction,
  type AiSlidesState,
} from "@/app/(app)/treinamentos/actions";

function Submit({ has }: { has: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy disabled:opacity-60"
    >
      {pending
        ? "Gerando apresentação…"
        : has
          ? "🔄 Regerar apresentação (IA)"
          : "🖼️ Gerar apresentação (IA)"}
    </button>
  );
}

export function AiSlidesForm({
  trainingId,
  hasSlides,
}: {
  trainingId: string;
  hasSlides: boolean;
}) {
  const [state, action] = useFormState<AiSlidesState, FormData>(
    generateSlidesAction,
    {}
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="training_id" value={trainingId} />
      <Submit has={hasSlides} />
      {state.error && (
        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">
          {state.error}
        </p>
      )}
      {state.created ? (
        <p className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
          Apresentação gerada com {state.created} slides!
        </p>
      ) : null}
    </form>
  );
}
