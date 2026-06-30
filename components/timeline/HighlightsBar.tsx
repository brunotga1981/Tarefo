"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ResetForm } from "@/components/tarefo/ResetForm";
import { StoryViewer } from "@/components/timeline/StoryViewer";
import type { HighlightWithStories } from "@/lib/timeline-types";
import {
  createHighlightAction,
  deleteHighlightAction,
  updateHighlightAction,
  moveHighlightAction,
  markStoryViewedAction,
} from "@/app/(app)/intranet/timeline/actions";

export function HighlightsBar({
  highlights,
  canManage,
  currentUserId,
  canModerate,
}: {
  highlights: HighlightWithStories[];
  canManage: boolean;
  currentUserId: string;
  canModerate?: boolean;
}) {
  const withPosts = highlights.filter((h) => h.posts.length > 0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewed, setViewed] = useState<Set<string>>(
    () => new Set(highlights.flatMap((h) => h.posts).filter((p) => p.seen).map((p) => p.id))
  );

  function onView(postId: string) {
    setViewed((prev) => {
      if (prev.has(postId)) return prev;
      const n = new Set(prev);
      n.add(postId);
      return n;
    });
    void markStoryViewedAction(postId);
  }

  if (highlights.length === 0 && !canManage) return null;

  const startIndex = openId
    ? Math.max(0, withPosts.findIndex((h) => h.id === openId))
    : 0;

  return (
    <div className="mb-5 flex gap-3 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
      {highlights.map((h) => {
        const has = h.posts.length > 0;
        const unseen = h.posts.some((p) => !viewed.has(p.id));
        return (
          <div key={h.id} className="relative flex shrink-0 flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => has && setOpenId(h.id)}
              className={`block ${has ? "cursor-pointer" : "cursor-default"}`}
              title={has ? `${h.posts.length} publicação(ões)` : "Sem publicações"}
            >
              <span
                className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 ${
                  !has
                    ? "border-slate-200"
                    : unseen
                      ? "border-azul"
                      : "border-slate-300"
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
              <>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <form action={moveHighlightAction}>
                    <input type="hidden" name="id" value={h.id} />
                    <input type="hidden" name="dir" value="left" />
                    <button className="hover:text-azul" title="Mover para a esquerda">
                      ◀
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setEditId(editId === h.id ? null : h.id)}
                    className="hover:text-azul"
                    title="Editar"
                  >
                    ✎
                  </button>
                  <form action={moveHighlightAction}>
                    <input type="hidden" name="id" value={h.id} />
                    <input type="hidden" name="dir" value="right" />
                    <button className="hover:text-azul" title="Mover para a direita">
                      ▶
                    </button>
                  </form>
                </div>
                <form action={deleteHighlightAction}>
                  <input type="hidden" name="id" value={h.id} />
                  <button className="text-[9px] text-slate-300 hover:text-red-500">
                    excluir
                  </button>
                </form>
                {editId === h.id && (
                  <form
                    action={updateHighlightAction}
                    className="absolute z-20 mt-1 flex w-56 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
                  >
                    <input type="hidden" name="id" value={h.id} />
                    <input
                      name="title"
                      required
                      defaultValue={h.title}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-azul"
                    />
                    <label className="text-xs text-slate-500">
                      Trocar imagem (opcional)
                      <input type="file" name="image" accept="image/*" className="mt-1 w-full text-xs" />
                    </label>
                    <button className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy">
                      Salvar
                    </button>
                  </form>
                )}
              </>
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
          onView={onView}
          currentUserId={currentUserId}
          canModerate={canModerate}
        />
      )}
    </div>
  );
}
