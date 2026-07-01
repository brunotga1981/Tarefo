/* eslint-disable @next/next/no-img-element */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentUser, can } from "@/lib/auth";
import { listBlogPosts, type BlogPost } from "@/lib/blog";
import { BlogComposer } from "@/components/blog/BlogComposer";
import { deleteBlogPostAction } from "./actions";

// Data efetiva de publicação (agendada, se houver; senão a de criação).
function effectiveDate(p: BlogPost) {
  return p.publish_at || p.created_at;
}
function monthKey(d: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(d));
  const y = parts.find((x) => x.type === "year")!.value;
  const m = parts.find((x) => x.type === "month")!.value;
  return `${y}-${m}`;
}
function monthLabel(d: string) {
  const s = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function ConhecaMaisPage() {
  const user = await getCurrentUser();
  const canManage = can(user, "blog.manage");
  const posts = await listBlogPosts({ canManage });

  // Agrupa por mês de publicação (já vêm ordenados por data desc).
  const groups: { key: string; label: string; posts: BlogPost[] }[] = [];
  for (const p of posts) {
    const d = effectiveDate(p);
    const key = monthKey(d);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: monthLabel(d), posts: [] };
      groups.push(g);
    }
    g.posts.push(p);
  }

  const now = Date.now();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Conheça Mais</h1>
      <p className="mb-6 text-sm text-slate-500">
        Curiosidades e Informações sobre as Empresas TGA e seus colaboradores.
      </p>

      {canManage && <BlogComposer />}

      {posts.length === 0 && (
        <p className="text-sm text-slate-400">Nenhum tópico publicado.</p>
      )}

      {groups.map((g) => (
        <section key={g.key} className="mb-8">
          <h2 className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold uppercase tracking-wide text-azul-navy">
            {g.label}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {g.posts.map((p) => {
              const scheduled =
                !!p.publish_at && new Date(p.publish_at).getTime() > now;
              return (
                <div
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <Link href={`/intranet/conheca-mais/${p.id}`}>
                    <div className="h-40 w-full bg-azul-suave/30">
                      {p.image_url ? (
                        p.media_type === "video" ? (
                          <video
                            src={p.image_url}
                            className="h-40 w-full bg-black object-cover"
                            muted
                          />
                        ) : (
                          <img
                            src={p.image_url}
                            alt={p.title}
                            className="h-40 w-full object-cover"
                          />
                        )
                      ) : (
                        <div className="flex h-40 items-center justify-center text-4xl text-azul-claro">
                          📰
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-1 flex flex-wrap items-center gap-1">
                      {p.theme && (
                        <span className="w-fit rounded-full bg-azul-suave/40 px-2 py-0.5 text-[11px] font-medium text-azul-navy">
                          {p.theme}
                        </span>
                      )}
                      {scheduled && canManage && (
                        <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          🕒 Agendado
                        </span>
                      )}
                    </div>
                    <Link href={`/intranet/conheca-mais/${p.id}`}>
                      <h3 className="font-semibold text-azul-navy hover:underline">
                        {p.title}
                      </h3>
                    </Link>
                    {p.summary && (
                      <p className="mt-1 flex-1 text-sm text-slate-600">
                        {p.summary}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <Link
                        href={`/intranet/conheca-mais/${p.id}`}
                        className="text-sm font-medium text-azul hover:underline"
                      >
                        Ler mais →
                      </Link>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs text-slate-400"
                          title="Visualizações"
                        >
                          👁 {p.view_count ?? 0}
                        </span>
                        {canManage && (
                          <form action={deleteBlogPostAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <button className="text-xs text-slate-400 hover:text-red-500">
                              excluir
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
