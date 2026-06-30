/* eslint-disable @next/next/no-img-element */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/auth";
import { listTimeline, listHighlights } from "@/lib/timeline";
import { TimelineComposer } from "@/components/timeline/TimelineComposer";
import { TimelinePostCard } from "@/components/timeline/TimelinePostCard";
import { ResetForm } from "@/components/tarefo/ResetForm";
import {
  createHighlightAction,
  deleteHighlightAction,
} from "./actions";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: { destaque?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canPost = can(user, "timeline.post");
  const canModerate = can(user, "blog.manage");
  const canHighlights = can(user, "highlights.manage");

  const highlights = await listHighlights();
  const selected = highlights.find((h) => h.id === searchParams.destaque);
  const posts = await listTimeline(user.id, {
    canModerate,
    highlightId: selected?.id,
  });

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-center text-2xl font-bold text-azul-navy">
        TGA Empreendimentos
      </h1>
      <p className="mb-5 text-center text-sm text-slate-500">
        Novidades e conquistas da equipe.
      </p>

      {/* Destaques (stories) */}
      {(highlights.length > 0 || canHighlights) && (
        <div className="mb-5 flex gap-3 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
          {selected && (
            <Link
              href="/intranet/timeline"
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-200 text-xl text-slate-400">
                ✕
              </span>
              <span className="w-16 truncate text-center text-[10px] text-slate-500">
                todos
              </span>
            </Link>
          )}
          {highlights.map((h) => (
            <div key={h.id} className="flex shrink-0 flex-col items-center gap-1">
              <Link
                href={`/intranet/timeline?destaque=${h.id}`}
                className="block"
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 ${
                    selected?.id === h.id ? "border-azul" : "border-azul-suave"
                  }`}
                >
                  {h.image_url ? (
                    <img
                      src={h.image_url}
                      alt={h.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">⭐</span>
                  )}
                </span>
              </Link>
              <span className="w-16 truncate text-center text-[10px] text-slate-600">
                {h.title}
              </span>
              {canHighlights && (
                <form action={deleteHighlightAction}>
                  <input type="hidden" name="id" value={h.id} />
                  <button className="text-[9px] text-slate-300 hover:text-red-500">
                    excluir
                  </button>
                </form>
              )}
            </div>
          ))}

          {canHighlights && (
            <details className="shrink-0">
              <summary className="flex cursor-pointer flex-col items-center gap-1">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-2xl text-slate-400">
                  +
                </span>
                <span className="w-16 text-center text-[10px] text-slate-500">
                  novo
                </span>
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
        </div>
      )}

      {canPost && <TimelineComposer highlights={highlights} />}

      {selected && (
        <p className="mb-3 text-center text-xs text-slate-500">
          Mostrando o destaque <strong>{selected.title}</strong> ·{" "}
          <Link href="/intranet/timeline" className="text-azul hover:underline">
            ver tudo
          </Link>
        </p>
      )}

      {posts.length === 0 && (
        <p className="text-center text-sm text-slate-400">
          Ainda não há publicações.
        </p>
      )}
      {posts.map((p) => (
        <TimelinePostCard
          key={p.id}
          post={p}
          userId={user.id}
          canDelete={canModerate || p.author_id === user.id}
        />
      ))}
    </div>
  );
}
