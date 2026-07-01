"use client";

import { useEffect, useState } from "react";
import type { Slide } from "@/lib/lms";

/** Apresentação de slides na tela (tela cheia, navegação por setas) + link para
 *  baixar o arquivo .pptx (PowerPoint). Disponível para todos os usuários. */
export function SlidesViewer({
  trainingId,
  slides,
}: {
  trainingId: string;
  slides: Slide[];
}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight" || e.key === " ")
        setI((n) => Math.min(slides.length - 1, n + 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, slides.length]);

  if (!slides?.length) return null;
  const s = slides[i];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase text-slate-400">
          Apresentação · {slides.length} slides
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setI(0);
              setOpen(true);
            }}
            className="rounded-lg bg-azul-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul"
          >
            ▶ Ver apresentação
          </button>
          <a
            href={`/api/trainings/${trainingId}/pptx`}
            className="rounded-lg border border-azul px-3 py-1.5 text-xs font-semibold text-azul hover:bg-azul-suave/20"
          >
            ⬇ Baixar PowerPoint (.pptx)
          </a>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
          <div className="flex items-center justify-between px-4 py-2 text-white/80">
            <span className="text-xs">
              Slide {i + 1} de {slides.length}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-2xl leading-none hover:text-white"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 pb-6">
            <div className="aspect-video w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
              {i === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 bg-azul-navy p-10 text-center text-white">
                  <h2 className="text-3xl font-bold sm:text-4xl">{s.title}</h2>
                  {s.bullets?.length > 0 && (
                    <p className="text-base text-white/80">
                      {s.bullets.join(" · ")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex h-full flex-col p-8 sm:p-10">
                  <h2 className="mb-4 border-b border-slate-200 pb-2 text-2xl font-bold text-azul-navy sm:text-3xl">
                    {s.title}
                  </h2>
                  <ul className="flex-1 space-y-3 overflow-y-auto text-lg text-slate-700">
                    {(s.bullets ?? []).map((b, k) => (
                      <li key={k} className="flex gap-3">
                        <span className="mt-1 text-azul">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Navegação */}
          <button
            type="button"
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={i === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-8 text-3xl text-white/50 hover:text-white disabled:opacity-20"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setI((n) => Math.min(slides.length - 1, n + 1))}
            disabled={i === slides.length - 1}
            className="absolute right-0 top-1/2 -translate-y-1/2 px-4 py-8 text-3xl text-white/50 hover:text-white disabled:opacity-20"
            aria-label="Próximo"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
