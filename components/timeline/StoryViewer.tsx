"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { TL_REACTIONS, type HighlightWithStories } from "@/lib/timeline-types";
import { toggleTimelineReactionAction } from "@/app/(app)/intranet/timeline/actions";

const DURATION = 6000; // ms por story

export function StoryViewer({
  highlights,
  startIndex,
  onClose,
  onView,
}: {
  highlights: HighlightWithStories[];
  startIndex: number;
  onClose: () => void;
  onView?: (postId: string) => void;
}) {
  const [hi, setHi] = useState(startIndex); // índice do destaque
  const [si, setSi] = useState(0); // índice do story dentro do destaque
  const [progress, setProgress] = useState(0);
  const [reacted, setReacted] = useState<string | null>(null);

  const highlight = highlights[hi];
  const stories = highlight?.posts ?? [];
  const story = stories[si];

  // Marca como visto ao exibir cada story
  useEffect(() => {
    setReacted(null);
    if (story && onView) onView(story.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hi, si]);

  async function react(emoji: string) {
    if (!story) return;
    setReacted(emoji);
    const fd = new FormData();
    fd.set("post_id", story.id);
    fd.set("emoji", emoji);
    await toggleTimelineReactionAction(fd);
  }

  function nextHighlight() {
    if (hi < highlights.length - 1) {
      setHi(hi + 1);
      setSi(0);
    } else onClose();
  }
  function prevHighlight() {
    if (hi > 0) {
      setHi(hi - 1);
      setSi(0);
    }
  }
  function next() {
    if (si < stories.length - 1) setSi(si + 1);
    else nextHighlight();
  }
  function prev() {
    if (si > 0) setSi(si - 1);
    else prevHighlight();
  }

  // Auto-avanço com barra de progresso
  useEffect(() => {
    setProgress(0);
    if (!story) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const pct = Math.min(100, ((t - start) / DURATION) * 100);
      setProgress(pct);
      if (pct >= 100) next();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hi, si]);

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hi, si]);

  if (!highlight) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="relative flex h-full w-full max-w-md flex-col">
        {/* Barras de progresso */}
        <div className="absolute left-0 right-0 top-0 z-10 flex gap-1 p-2">
          {stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{
                  width: i < si ? "100%" : i === si ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Cabeçalho */}
        <div className="absolute left-0 right-0 top-4 z-10 flex items-center justify-between px-3 pt-2 text-white">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/60 bg-white/10 text-sm">
              {highlight.image_url ? (
                <img src={highlight.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                "⭐"
              )}
            </span>
            <span className="text-sm font-semibold">{highlight.title}</span>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-white/90 hover:text-white">
            ✕
          </button>
        </div>

        {/* Conteúdo do story */}
        <div className="flex flex-1 items-center justify-center">
          {story?.image_url ? (
            <img
              src={story.image_url}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-azul-navy p-8 text-center text-lg text-white">
              {story?.body}
            </div>
          )}
        </div>

        {/* Legenda */}
        {story?.image_url && story?.body && (
          <div className="absolute bottom-16 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-sm text-white">
            <span className="font-semibold">{story.author_name}</span> {story.body}
          </div>
        )}

        {/* Reações */}
        <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-3">
          {TL_REACTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => react(e)}
              className={`rounded-full px-2 py-1 text-2xl transition ${
                reacted === e ? "scale-125 bg-white/20" : "hover:scale-110"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Zonas de toque (esquerda/direita) */}
        <button
          onClick={prev}
          aria-label="Anterior"
          className="absolute bottom-16 left-0 top-14 w-1/3"
        />
        <button
          onClick={next}
          aria-label="Próximo"
          className="absolute bottom-16 right-0 top-14 w-1/3"
        />
      </div>
    </div>
  );
}
