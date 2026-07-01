"use client";

import { useState } from "react";
import type { RankRow } from "@/lib/lms";

/** Mostra o Score de Participação e, ao clicar, abre o detalhamento de como
 *  os pontos foram somados (e o que subtrai). */
export function ScoreBreakdown({ me }: { me: RankRow }) {
  const [open, setOpen] = useState(false);

  const qualityBonus = Math.round((me.answer_quality ?? 0) / 10);
  const ratingBonus = Math.round((me.rating_avg ?? 0) * 4);
  const responseBonus =
    me.avg_response_min == null
      ? 0
      : me.avg_response_min <= 60
        ? 10
        : me.avg_response_min <= 240
          ? 5
          : 0;

  const lines: { label: string; detail: string; pts: number }[] = [
    { label: "Perguntas no fórum", detail: `${me.questions} × 2`, pts: me.questions * 2 },
    { label: "Respostas no fórum", detail: `${me.answers} × 3`, pts: me.answers * 3 },
    { label: "Cursos concluídos", detail: `${me.done} × 5`, pts: me.done * 5 },
    {
      label: "Qualidade das respostas (IA)",
      detail:
        me.answer_quality == null
          ? "sem respostas avaliadas"
          : `média ${me.answer_quality}% ÷ 10 (máx +10)`,
      pts: qualityBonus,
    },
    {
      label: "Avaliação recebida dos alunos",
      detail:
        me.rating_avg == null
          ? "sem avaliações"
          : `média ${me.rating_avg}/5 × 4 (máx +20)`,
      pts: ratingBonus,
    },
    {
      label: "Agilidade de resposta (tutor)",
      detail:
        me.avg_response_min == null
          ? "não é tutor / sem respostas"
          : `~${me.avg_response_min} min (≤60=+10 · ≤240=+5)`,
      pts: responseBonus,
    },
    {
      label: "Cursos obrigatórios vencidos",
      detail: `${me.overdue} × (−15)`,
      pts: -(me.overdue * 15),
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex flex-col items-center"
        title="Ver como o score é calculado"
      >
        <span className="text-lg font-bold text-azul-navy">
          {me.participation} pts
        </span>
        <span className="text-[10px] font-medium text-azul group-hover:underline">
          ver detalhes ▾
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-azul-navy">
                Detalhamento do Score de Participação
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xl leading-none text-slate-400 hover:text-slate-600"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {lines.map((l) => (
                <div key={l.label} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700">{l.label}</p>
                    <p className="text-[11px] text-slate-400">{l.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      l.pts < 0
                        ? "text-red-600"
                        : l.pts > 0
                          ? "text-emerald-600"
                          : "text-slate-400"
                    }`}
                  >
                    {l.pts > 0 ? "+" : ""}
                    {l.pts}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-sm font-bold text-azul-navy">Total</span>
              <span className="text-lg font-bold text-azul-navy">
                {me.participation} pts
              </span>
            </div>

            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              <p className="mb-1 font-semibold text-slate-600">Como funciona</p>
              <p>
                Só reduz o score: <strong>curso obrigatório vencido</strong> (−15
                por curso não concluído no prazo). O score{" "}
                <strong>não tem teto</strong> — cresce conforme você participa
                (perguntas, respostas, cursos e desempenho como tutor).
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
