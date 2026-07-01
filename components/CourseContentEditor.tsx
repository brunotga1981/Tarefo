"use client";

import { updateCourseContentAction } from "@/app/(app)/treinamentos/actions";
import { SubmitButton } from "@/components/tarefo/SubmitButton";

/** Exibe o conteúdo do curso. Para quem gerencia, permite editar e salvar
 *  (o conteúdo gerado pela IA fica na tela para ajustes antes de prosseguir). */
export function CourseContentEditor({
  trainingId,
  content,
  canManage,
}: {
  trainingId: string;
  content: string | null;
  canManage: boolean;
}) {
  if (!canManage) {
    if (!content) return null;
    return (
      <div className="mb-3 rounded-lg border border-slate-100 bg-white p-4">
        <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400">
          Conteúdo do curso
        </h4>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {content}
        </div>
      </div>
    );
  }

  return (
    <form
      action={updateCourseContentAction}
      className="mb-3 space-y-2 rounded-lg border border-slate-100 bg-white p-4"
    >
      <input type="hidden" name="training_id" value={trainingId} />
      <h4 className="text-xs font-semibold uppercase text-slate-400">
        Conteúdo do curso — edite à vontade e salve
      </h4>
      <textarea
        // key força o textarea a recarregar quando a IA gera um novo conteúdo
        key={content ?? "vazio"}
        name="content"
        defaultValue={content ?? ""}
        rows={16}
        placeholder="Gere o conteúdo com a IA abaixo ou escreva aqui…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-azul"
      />
      <SubmitButton
        pendingText="Salvando…"
        className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy disabled:opacity-60"
      >
        💾 Salvar conteúdo
      </SubmitButton>
    </form>
  );
}
