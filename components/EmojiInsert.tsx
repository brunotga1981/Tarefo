"use client";

import { useState } from "react";

export const EMOJIS = [
  "😀", "😂", "😍", "🥰", "😎", "🤔", "👍", "👏",
  "🙌", "🎉", "❤️", "🔥", "💡", "🙏", "😢", "😮",
];

/**
 * Botão de emoji reutilizável. Renderiza um 😊 que abre uma paleta;
 * ao clicar num emoji, chama onInsert(emoji) (ex.: anexar ao texto).
 */
export function EmojiInsert({
  onInsert,
  className = "",
}: {
  onInsert: (emoji: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    // className posiciona o botão (ex.: absolute dentro do input);
    // o span interno (relative) é o contexto de posicionamento da paleta.
    <span className={className}>
      <span className="relative inline-block">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-lg"
          title="Emojis"
        >
          😊
        </button>
        {open && (
          <div className="absolute bottom-full right-0 z-20 mb-1 flex w-56 flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onInsert(e);
                  setOpen(false);
                }}
                className="rounded px-1 text-lg hover:bg-slate-100"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </span>
    </span>
  );
}
