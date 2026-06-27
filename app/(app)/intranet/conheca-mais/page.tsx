/* eslint-disable @next/next/no-img-element */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentUser, can } from "@/lib/auth";
import { listBlogPosts } from "@/lib/blog";
import { createBlogPostAction, deleteBlogPostAction } from "./actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

export default async function ConhecaMaisPage() {
  const user = await getCurrentUser();
  const canManage = can(user, "blog.manage");
  const posts = await listBlogPosts();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Conheça Mais</h1>
      <p className="mb-6 text-sm text-slate-500">
        Temas e assuntos da Azul Administradora.
      </p>

      {canManage && (
        <details className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-azul-navy">
            + Novo tópico
          </summary>
          <form
            action={createBlogPostAction}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <input name="title" required placeholder="Título" className={field} />
            <input name="theme" placeholder="Tema (ex.: Institucional)" className={field} />
            <input
              name="summary"
              placeholder="Resumo (aparece no card)"
              className={`${field} sm:col-span-2`}
            />
            <textarea
              name="content"
              rows={4}
              placeholder="Conteúdo do tópico"
              className={`${field} sm:col-span-2`}
            />
            <label className="text-xs text-slate-500">
              Foto (upload)
              <input type="file" name="image" accept="image/*" className={`${field} mt-1`} />
            </label>
            <input
              name="image_url"
              placeholder="ou URL de imagem"
              className={field}
            />
            <div className="sm:col-span-2">
              <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
                Publicar
              </button>
            </div>
          </form>
        </details>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.length === 0 && (
          <p className="text-sm text-slate-400">Nenhum tópico publicado.</p>
        )}
        {posts.map((p) => (
          <div
            key={p.id}
            className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <Link href={`/intranet/conheca-mais/${p.id}`}>
              <div className="h-40 w-full bg-azul-suave/30">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.title}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center text-4xl text-azul-claro">
                    📰
                  </div>
                )}
              </div>
            </Link>
            <div className="flex flex-1 flex-col p-4">
              {p.theme && (
                <span className="mb-1 w-fit rounded-full bg-azul-suave/40 px-2 py-0.5 text-[11px] font-medium text-azul-navy">
                  {p.theme}
                </span>
              )}
              <Link href={`/intranet/conheca-mais/${p.id}`}>
                <h3 className="font-semibold text-azul-navy hover:underline">
                  {p.title}
                </h3>
              </Link>
              {p.summary && (
                <p className="mt-1 flex-1 text-sm text-slate-600">{p.summary}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <Link
                  href={`/intranet/conheca-mais/${p.id}`}
                  className="text-sm font-medium text-azul hover:underline"
                >
                  Ler mais →
                </Link>
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
        ))}
      </div>
    </div>
  );
}
