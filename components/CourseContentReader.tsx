"use client";

import { useState } from "react";

/** Leitura do conteúdo do curso (aluno): mostra ~10 linhas e expande com
 *  "Veja mais ▼" / recolhe com "Veja menos ▲". */
export function CourseContentReader({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const isLong = content.split("\n").length > 10 || content.length > 700;

  return (
    <div className="mb-3 rounded-lg border border-slate-100 bg-white p-4">
      <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400">
        Conteúdo do curso
      </h4>
      <div
        className={`whitespace-pre-wrap text-sm leading-relaxed text-slate-700 ${
          isLong && !open ? "max-h-[14.25rem] overflow-hidden" : ""
        }`}
      >
        {content}
      </div>
      {isLong && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-xs font-semibold text-azul hover:underline"
        >
          Veja mais ▼
        </button>
      )}
      {isLong && open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-2 text-xs font-semibold text-azul hover:underline"
        >
          Veja menos ▲
        </button>
      )}
    </div>
  );
}
