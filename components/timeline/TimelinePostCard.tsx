"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { TL_REACTIONS, type TLPost } from "@/lib/timeline-types";
import {
  toggleTimelineReactionAction,
  addTimelineCommentAction,
  deleteTimelinePostAction,
} from "@/app/(app)/intranet/timeline/actions";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function TimelinePostCard({
  post,
  userId,
  canDelete,
}: {
  post: TLPost;
  userId: string;
  canDelete: boolean;
}) {
  const [showReact, setShowReact] = useState(false);
  const isCert = post.kind === "CERTIFICATE";

  return (
    <article className="mx-auto mb-6 max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-azul-suave text-xs font-bold text-azul-navy">
            {initials(post.author_name)}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-800">
              {post.author_name}
            </p>
            <p className="text-[11px] text-slate-400">
              {formatDateTime(post.created_at)}
            </p>
          </div>
        </div>
        {canDelete && (
          <form action={deleteTimelinePostAction}>
            <input type="hidden" name="id" value={post.id} />
            <button className="text-xs text-slate-400 hover:text-red-500">
              excluir
            </button>
          </form>
        )}
      </div>

      {/* Certificado */}
      {isCert ? (
        <div className="mx-3 mb-2 rounded-xl border-2 border-azul-navy bg-azul-bg/40 p-5 text-center">
          <div className="text-3xl">🎓</div>
          <p className="mt-1 text-sm font-semibold text-azul-navy">
            Certificado de Conclusão
          </p>
          <p className="mt-1 text-sm text-slate-700">
            <strong>{post.author_name}</strong> tornou-se especialista em
            <br />
            <strong>“{post.course_title}”</strong>
          </p>
          <p className="mt-2 text-sm">
            Aproveitamento no quiz:{" "}
            <span className="font-bold text-emerald-600">{post.score}%</span>
          </p>
          {post.course_id && (
            <Link
              href={`/treinamentos/${post.course_id}/certificado`}
              className="mt-3 inline-block rounded-lg bg-azul-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul"
            >
              Ver certificado
            </Link>
          )}
        </div>
      ) : (
        post.image_url && (
          <img
            src={post.image_url}
            alt=""
            className="max-h-[28rem] w-full object-cover"
          />
        )
      )}

      {/* Ações */}
      <div className="flex items-center gap-2 px-3 pt-2">
        <button
          onClick={() => setShowReact((v) => !v)}
          className="text-xl"
          title="Reagir"
        >
          🤍
        </button>
        <span className="text-xs text-slate-400">
          {post.reactions.reduce((s, r) => s + r.count, 0)} reações ·{" "}
          {post.comments.length} comentários
        </span>
      </div>
      {showReact && (
        <div className="flex gap-1 px-3 pt-1">
          {TL_REACTIONS.map((e) => (
            <form key={e} action={toggleTimelineReactionAction}>
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="emoji" value={e} />
              <button className="rounded-full px-1 text-lg hover:bg-slate-100">
                {e}
              </button>
            </form>
          ))}
        </div>
      )}
      {post.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-1">
          {post.reactions.map((r) => (
            <form key={r.emoji} action={toggleTimelineReactionAction}>
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="emoji" value={r.emoji} />
              <button
                className={`rounded-full border px-1.5 py-0.5 text-[11px] ${
                  r.mine ? "border-azul bg-azul-suave/40" : "border-slate-200"
                }`}
              >
                {r.emoji} {r.count}
              </button>
            </form>
          ))}
        </div>
      )}

      {/* Legenda */}
      {post.body && (
        <p className="px-3 pt-2 text-sm text-slate-700">
          <span className="font-semibold">{post.author_name}</span> {post.body}
        </p>
      )}

      {/* Comentários */}
      <div className="space-y-1 px-3 pt-2">
        {post.comments.map((c) => (
          <p key={c.id} className="text-sm text-slate-600">
            <span className="font-semibold text-slate-700">{c.author_name}</span>{" "}
            {c.body}
          </p>
        ))}
      </div>

      <form
        action={addTimelineCommentAction}
        className="flex items-center gap-2 p-3"
      >
        <input type="hidden" name="post_id" value={post.id} />
        <input
          name="body"
          required
          placeholder="Adicione um comentário…"
          className="flex-1 rounded-full border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-azul"
        />
        <button className="text-sm font-semibold text-azul">Publicar</button>
      </form>
    </article>
  );
}
