"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ResetForm } from "@/components/tarefo/ResetForm";
import { StoryViewer } from "@/components/timeline/StoryViewer";
import type { HighlightWithStories } from "@/lib/timeline-types";
import {
  createHighlightAction,
  deleteHighlightAction,
} from "@/app/(app)/intranet/timeline/actions";

export function HighlightsBar({
  highlights,
  canManage,
}: {
  highlights: HighlightWithStories[];
  canManage: boolean;
}) {
  const withPosts = highlights.filter((h) => h.posts.length > 0);
  const [openId, setOpenId] = useState<string | null>(null);

  if (highlights.length === 0 && !canManage) return null;

  const startIndex = openId
    ? Math.max(0, withPosts.findIndex((h) => h.id === openId))
    : 0;

  return (
    <div className="mb-5 flex gap-3 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
      {highlights.map((h) => {
        const has = h.posts.length > 0;
        return (
          <div key={h.id} className="flex shrink-0 flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => has && setOpenId(h.id)}
              className={`block ${has ? "cursor-pointer" : "cursor-default"}`}
              title={has ? `${h.posts.length} publicação(ões)` : "Sem publicações"}
            >
              <span
                className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 ${
                  has ? "border-azul" : "border-slate-200"
                }`}
              >
                {h.image_url ? (
                  <img src={h.image_url} alt={h.title} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl">⭐</span>
                )}
              </span>
            </button>
            <span className="w-16 truncate text-center text-[10px] text-slate-600">
              {h.title}
            </span>
            {canManage && (
              <form action={deleteHighlightAction}>
                <input type="hidden" name="id" value={h.id} />
                <button className="text-[9px] text-slate-300 hover:text-red-500">
                  excluir
                </button>
              </form>
            )}
          </div>
        );
      })}

      {canManage && (
        <details className="relative shrink-0">
          <summary className="flex cursor-pointer flex-col items-center gap-1">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-2xl text-slate-400">
              +
            </span>
            <span className="w-16 text-center text-[10px] text-slate-500">novo</span>
          </summary>
          <ResetForm
            action={createHighlightAction}
            className="absolute z-10 mt-1 flex w-56 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
          >
            <input
              name="title"
              required
              placeholder="Título do destaque"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-azul"
            />
            <label className="text-xs text-slate-500">
              Imagem (redonda)
              <input type="file" name="image" accept="image/*" className="mt-1 w-full text-xs" />
            </label>
            <button className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy">
              Criar destaque
            </button>
          </ResetForm>
        </details>
      )}

      {openId && withPosts.length > 0 && (
        <StoryViewer
          highlights={withPosts}
          startIndex={startIndex}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
