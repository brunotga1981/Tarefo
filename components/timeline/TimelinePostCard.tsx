"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { TL_REACTIONS, type TLPost } from "@/lib/timeline-types";
import { EmojiInsert } from "@/components/EmojiInsert";
import {
  toggleTimelineReactionAction,
  addTimelineCommentAction,
  deleteTimelinePostAction,
  updateTimelinePostAction,
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
  const [comment, setComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body ?? "");
  const isCert = post.kind === "CERTIFICATE";
  const totalReactions = post.reactions.reduce((s, r) => s + r.count, 0);

  const VISIBLE = 2;
  const visibleComments = showAllComments
    ? post.comments
    : post.comments.slice(0, VISIBLE);
  const hiddenCount = post.comments.length - visibleComments.length;

  async function submitComment(fd: FormData) {
    if (!comment.trim()) return;
    await addTimelineCommentAction(fd);
    setComment("");
  }

  async function submitEdit(fd: FormData) {
    if (!editBody.trim()) return;
    await updateTimelinePostAction(fd);
    setEditing(false);
  }

  return (
    <article className="mx-auto mb-6 max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-azul-suave text-xs font-bold text-azul-navy">
            {initials(post.author_name)}
          </span>
          <div className="leading-tight">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              {post.author_name}
              {post.status === "AGENDADO" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  agendado
                </span>
              )}
              {post.status === "EXPIRADO" && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  expirado
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-400">
              {formatDateTime(post.created_at)}
            </p>
          </div>
        </div>
        {canDelete && (
          <div className="flex items-center gap-3">
            {!isCert && (
              <button
                onClick={() => {
                  setEditBody(post.body ?? "");
                  setEditing((v) => !v);
                }}
                className="text-xs text-slate-400 hover:text-azul"
              >
                editar
              </button>
            )}
            <form action={deleteTimelinePostAction}>
              <input type="hidden" name="id" value={post.id} />
              <button className="text-xs text-slate-400 hover:text-red-500">
                excluir
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Conteúdo (texto antes da imagem, estilo Facebook) */}
      {!isCert && editing ? (
        <form action={submitEdit} className="px-3 pb-2">
          <input type="hidden" name="id" value={post.id} />
          <textarea
            name="body"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul"
          />

          {/* Imagem do post */}
          {post.image_url && (
            <div className="mt-2">
              <img
                src={post.image_url}
                alt=""
                className="max-h-40 w-full rounded-lg bg-slate-50 object-contain"
              />
              <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <input type="checkbox" name="remove_image" value="1" />
                Remover imagem atual
              </label>
            </div>
          )}
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-500">
              Trocar imagem (upload)
              <input
                type="file"
                name="image"
                accept="image/*"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
              />
            </label>
            <input
              name="image_url"
              placeholder="ou URL de imagem"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul"
            />
          </div>

          <div className="mt-1 flex gap-2">
            <button
              disabled={!editBody.trim()}
              className="rounded-lg bg-azul px-3 py-1 text-xs font-semibold text-white hover:bg-azul-navy disabled:opacity-50"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              cancelar
            </button>
          </div>
        </form>
      ) : (
        !isCert &&
        post.body && (
          <p className="whitespace-pre-wrap px-3 pb-2 text-sm leading-relaxed text-slate-700">
            {post.body}
          </p>
        )
      )}

      {/* Certificado ou imagem */}
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
              href={`/treinamentos/${post.course_id}/certificado${
                post.author_id ? `?user=${post.author_id}` : ""
              }`}
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
            className="h-auto w-full bg-slate-50"
          />
        )
      )}

      {/* Resumo de reações e comentários */}
      {(totalReactions > 0 || post.comments.length > 0) && (
        <div className="flex items-center justify-between px-3 pt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            {post.reactions.slice(0, 3).map((r) => (
              <span key={r.emoji}>{r.emoji}</span>
            ))}
            {totalReactions > 0 && <span>{totalReactions}</span>}
          </span>
          {post.comments.length > 0 && (
            <span>{post.comments.length} comentários</span>
          )}
        </div>
      )}

      {/* Barra de ações (estilo Facebook, com divisórias) */}
      <div className="mt-2 flex items-center border-y border-slate-100">
        <button
          onClick={() => setShowReact((v) => !v)}
          className="flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          🤍 Curtir
        </button>
        <button
          onClick={() => setShowCommentBox((v) => !v)}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          💬 Comentar
        </button>
      </div>

      {showReact && (
        <div className="flex flex-wrap gap-1 px-3 pt-2">
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
        <div className="flex flex-wrap gap-1 px-3 pt-2">
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

      {/* Seção de comentários (separada do conteúdo principal) */}
      {post.comments.length > 0 && (
        <div className="space-y-2 bg-slate-50 px-3 py-3">
          {!showAllComments && hiddenCount > 0 && (
            <button
              onClick={() => setShowAllComments(true)}
              className="flex items-center gap-1 text-xs font-medium text-azul hover:underline"
            >
              ▼ Ver mais {hiddenCount}{" "}
              {hiddenCount === 1 ? "comentário" : "comentários"}
            </button>
          )}
          {visibleComments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-azul-suave text-[10px] font-bold text-azul-navy">
                {initials(c.author_name)}
              </span>
              <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                <p className="text-xs font-semibold text-slate-700">
                  {c.author_name}
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-600">
                  {c.body}
                </p>
              </div>
            </div>
          ))}
          {showAllComments && post.comments.length > VISIBLE && (
            <button
              onClick={() => setShowAllComments(false)}
              className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:underline"
            >
              ▲ Ver menos
            </button>
          )}
        </div>
      )}

      {/* Campo de comentário (oculto até clicar em "Comentar") */}
      {showCommentBox && (
        <form action={submitComment} className="border-t border-slate-100 p-3">
          <input type="hidden" name="post_id" value={post.id} />
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                id={`comment-${post.id}`}
                name="body"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                autoComplete="off"
                autoFocus
                placeholder="Adicione um comentário…"
                className="w-full rounded-full border border-slate-300 px-3 py-1.5 pr-9 text-sm outline-none focus:border-azul"
              />
              <EmojiInsert
                onInsert={(e) => setComment((c) => c + e)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              />
            </div>
            <button className="text-sm font-semibold text-azul hover:text-azul-navy">
              Publicar
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
