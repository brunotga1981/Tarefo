"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { EmojiInsert } from "@/components/EmojiInsert";
import {
  createTimelinePostAction,
  aiPostCopyAction,
  aiPostImageAction,
} from "@/app/(app)/intranet/timeline/actions";
import type { Highlight } from "@/lib/timeline-types";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

export function TimelineComposer({ highlights }: { highlights: Highlight[] }) {
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("");
  const [image, setImage] = useState("");
  const [copy, setCopy] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function genCopy() {
    if (!topic.trim()) return setAiError("Informe um tema para a IA.");
    setCopyLoading(true);
    setAiError("");
    const fd = new FormData();
    fd.set("topic", topic);
    const res = await aiPostCopyAction({}, fd);
    setCopyLoading(false);
    if (res.error) setAiError(res.error);
    else if (res.copy) setCopy(res.copy);
  }

  async function genImage() {
    if (!topic.trim()) return setAiError("Informe um tema para a IA.");
    setImgLoading(true);
    setAiError("");
    const fd = new FormData();
    fd.set("topic", topic);
    const res = await aiPostImageAction({}, fd);
    setImgLoading(false);
    if (res.error) setAiError(res.error);
    else if (res.imageUrl) setImage(res.imageUrl);
  }

  async function publish(fd: FormData) {
    if (!body.trim()) return;
    setPublishing(true);
    await createTimelinePostAction(fd);
    setPublishing(false);
    // Limpa o formulário para uma nova postagem
    setBody("");
    setTopic("");
    setImage("");
    setCopy("");
    setAiError("");
    formRef.current?.reset();
  }

  return (
    <div className="mx-auto mb-6 max-w-lg rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-azul-navy">
        Publicar na Time Line
      </h2>

      {/* Apoio de IA */}
      <div className="mb-3 rounded-lg border border-azul-suave bg-azul-suave/10 p-3">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Tema para a IA (copy/imagem)…"
          className={field}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={genCopy}
            disabled={copyLoading}
            className="rounded-lg bg-azul px-2 py-1 text-xs font-semibold text-white hover:bg-azul-navy disabled:opacity-60"
          >
            {copyLoading
              ? "⏳ Gerando texto…"
              : copy
                ? "🔄 Gerar outro texto"
                : "✍️ Gerar texto (IA)"}
          </button>
          <button
            type="button"
            onClick={genImage}
            disabled={imgLoading}
            className="rounded-lg bg-azul px-2 py-1 text-xs font-semibold text-white hover:bg-azul-navy disabled:opacity-60"
          >
            {imgLoading
              ? "⏳ Gerando imagem…"
              : image
                ? "🔄 Gerar outra imagem"
                : "🎨 Gerar imagem (IA)"}
          </button>
        </div>
        {copy && (
          <div className="mt-2 text-xs">
            <p className="rounded bg-white p-2 text-slate-700">{copy}</p>
            <button
              type="button"
              onClick={() => setBody(copy)}
              className="mt-1 text-azul hover:underline"
            >
              usar este texto
            </button>
          </div>
        )}
        {aiError && (
          <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
            {aiError}
          </p>
        )}
      </div>

      {/* Publicação */}
      <form ref={formRef} action={publish} className="space-y-2">
        <div className="relative">
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            required
            placeholder="Escreva a notícia/legenda…"
            className={`${field} pr-9`}
          />
          <EmojiInsert
            onInsert={(e) => setBody((b) => b + e)}
            className="absolute right-2 top-2"
          />
        </div>

        {/* Imagem anexada */}
        {image && (
          <div className="relative">
            <img
              src={image}
              alt="Imagem da publicação"
              className="max-h-72 w-full rounded-lg bg-slate-50 object-contain"
            />
            <button
              type="button"
              onClick={() => setImage("")}
              className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
            >
              remover
            </button>
          </div>
        )}
        <input type="hidden" name="image_url" value={image} />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-500">
            Imagem (upload)
            <input type="file" name="image" accept="image/*" className={`${field} mt-1`} />
          </label>
          <input
            placeholder="ou URL de imagem"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className={field}
          />
        </div>

        {/* Agendamento */}
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
          <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
            Agendamento (opcional)
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-500">
              Início (data/hora)
              <input type="datetime-local" name="publish_at" className={`${field} mt-1`} />
            </label>
            <label className="text-xs text-slate-500">
              Fim (data/hora)
              <input type="datetime-local" name="expires_at" className={`${field} mt-1`} />
            </label>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            Sem início = publica já. Sem fim = fica por tempo indeterminado.
          </p>
        </div>

        {/* Destaques */}
        {highlights.length > 0 && (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
            <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
              Adicionar aos destaques
            </p>
            <div className="flex flex-wrap gap-3">
              {highlights.map((h) => (
                <label
                  key={h.id}
                  className="flex items-center gap-1.5 text-xs text-slate-600"
                >
                  <input type="checkbox" name="highlight_ids" value={h.id} />
                  <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-azul-suave">
                    {h.image_url ? (
                      <img src={h.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "⭐"
                    )}
                  </span>
                  {h.title}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          disabled={!body.trim() || publishing}
          className="rounded-lg bg-azul-navy px-4 py-2 text-sm font-semibold text-white hover:bg-azul disabled:opacity-50"
        >
          {publishing ? "Publicando…" : "Publicar"}
        </button>
      </form>
    </div>
  );
}
