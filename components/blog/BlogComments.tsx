"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { EmojiInsert } from "@/components/EmojiInsert";
import { addBlogCommentAction } from "@/app/(app)/intranet/conheca-mais/actions";
import type { BlogComment } from "@/lib/blog";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function BlogComments({
  postId,
  comments,
}: {
  postId: string;
  comments: BlogComment[];
}) {
  const [body, setBody] = useState("");

  async function submit(fd: FormData) {
    if (!body.trim()) return;
    await addBlogCommentAction(fd);
    setBody("");
  }

  return (
    <section className="mt-8 border-t border-slate-200 pt-5">
      <h2 className="mb-3 text-sm font-semibold text-azul-navy">
        Comentários ({comments.length})
      </h2>

      {comments.length > 0 && (
        <div className="mb-4 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-azul-suave text-[10px] font-bold text-azul-navy">
                {initials(c.author_name)}
              </span>
              <div className="rounded-2xl bg-slate-100 px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">
                  {c.author_name}
                  <span className="ml-2 font-normal text-slate-400">
                    {formatDateTime(c.created_at)}
                  </span>
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-600">
                  {c.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form action={submit} className="flex items-center gap-2">
        <input type="hidden" name="post_id" value={postId} />
        <div className="relative flex-1">
          <input
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            autoComplete="off"
            placeholder="Adicione um comentário…"
            className="w-full rounded-full border border-slate-300 px-3 py-1.5 pr-9 text-sm outline-none focus:border-azul"
          />
          <EmojiInsert
            onInsert={(e) => setBody((b) => b + e)}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          />
        </div>
        <button className="text-sm font-semibold text-azul hover:text-azul-navy">
          Publicar
        </button>
      </form>
    </section>
  );
}
