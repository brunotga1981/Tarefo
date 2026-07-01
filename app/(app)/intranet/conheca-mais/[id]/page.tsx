/* eslint-disable @next/next/no-img-element */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBlogPost, listBlogComments, markBlogViewed } from "@/lib/blog";
import { formatDate } from "@/lib/format";
import { BlogComments } from "@/components/blog/BlogComments";

export default async function BlogPostPage({
  params,
}: {
  params: { id: string };
}) {
  const post = await getBlogPost(params.id);
  if (!post) notFound();
  const user = await getCurrentUser();
  // Registra a visualização (1 por usuário) e reflete no total exibido.
  if (user) {
    const isNew = await markBlogViewed(post.id, user.id);
    if (isNew) post.view_count = (post.view_count ?? 0) + 1;
  }
  const comments = await listBlogComments(post.id);

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href="/intranet/conheca-mais"
        className="text-sm text-slate-400 hover:text-azul"
      >
        ← Conheça Mais
      </Link>

      {post.theme && (
        <span className="mt-3 inline-block rounded-full bg-azul-suave/40 px-2 py-0.5 text-[11px] font-medium text-azul-navy">
          {post.theme}
        </span>
      )}
      <h1 className="mt-2 text-3xl font-bold text-azul-navy">{post.title}</h1>
      <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
        <span>Publicado em {formatDate(post.created_at)}</span>
        <span title="Visualizações">👁 {post.view_count ?? 0}</span>
      </p>

      {post.image_url &&
        (post.media_type === "video" ? (
          <video
            src={post.image_url}
            controls
            playsInline
            className="mt-4 max-h-96 w-full rounded-xl bg-black object-contain"
          />
        ) : (
          <img
            src={post.image_url}
            alt={post.title}
            className="mt-4 max-h-96 w-full rounded-xl object-cover"
          />
        ))}

      {post.summary && (
        <p className="mt-4 text-lg text-slate-600">{post.summary}</p>
      )}
      {post.content && (
        <div className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-700">
          {post.content}
        </div>
      )}

      <BlogComments postId={post.id} comments={comments} />
    </article>
  );
}
