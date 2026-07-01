"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createBlogPostAction,
  aiBlogCopyAction,
  aiBlogImageAction,
} from "@/app/(app)/intranet/conheca-mais/actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

const looksLikeVideo = (s: string) =>
  s.startsWith("data:video") || /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(s);

/** Botão de publicar + indicador de processamento (useFormStatus reflete o
 *  estado real da Server Action, que roda em transição). */
function PublishButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex items-center gap-3">
      <button
        disabled={disabled || pending}
        className="inline-flex items-center gap-2 rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy disabled:opacity-50"
      >
        {pending && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {pending ? "Publicando…" : "Publicar"}
      </button>
      {pending && (
        <span className="text-xs text-slate-500">
          ⏳ Em processamento, aguarde…
        </span>
      )}
    </div>
  );
}

export function BlogComposer() {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [image, setImage] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [copy, setCopy] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const publishingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function genCopy() {
    if (!topic.trim()) return setAiError("Informe um tema para a IA.");
    setCopyLoading(true);
    setAiError("");
    const fd = new FormData();
    fd.set("topic", topic);
    const res = await aiBlogCopyAction({}, fd);
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
    const res = await aiBlogImageAction({}, fd);
    setImgLoading(false);
    if (res.error) setAiError(res.error);
    else if (res.imageUrl) {
      setImage(res.imageUrl);
      setIsVideo(false);
    }
  }

  async function publish(fd: FormData) {
    if (!title.trim()) return;
    if (publishingRef.current) return; // trava anti-duplicação
    publishingRef.current = true;
    try {
      await createBlogPostAction(fd);
      setTitle("");
      setTopic("");
      setImage("");
      setIsVideo(false);
      setCopy("");
      setAiError("");
      formRef.current?.reset();
    } finally {
      publishingRef.current = false;
    }
  }

  return (
    <details className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold text-azul-navy">
        + Novo tópico
      </summary>

      {/* Apoio de IA */}
      <div className="mt-4 rounded-lg border border-azul-suave bg-azul-suave/10 p-3">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Tema para a IA (texto/imagem)…"
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
            <p className="whitespace-pre-wrap rounded bg-white p-2 text-slate-700">
              {copy}
            </p>
            <button
              type="button"
              onClick={() => {
                const el = formRef.current?.elements.namedItem(
                  "content"
                ) as HTMLTextAreaElement | null;
                if (el) el.value = copy;
              }}
              className="mt-1 text-azul hover:underline"
            >
              usar como conteúdo
            </button>
          </div>
        )}
        {aiError && (
          <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
            {aiError}
          </p>
        )}
      </div>

      <form
        ref={formRef}
        action={publish}
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          className={field}
        />
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

        {/* Mídia anexada (imagem ou vídeo) */}
        {image && (
          <div className="relative sm:col-span-2">
            {isVideo || looksLikeVideo(image) ? (
              <video
                src={image}
                controls
                className="max-h-72 w-full rounded-lg bg-black object-contain"
              />
            ) : (
              <img
                src={image}
                alt="Mídia do tópico"
                className="max-h-72 w-full rounded-lg bg-slate-50 object-contain"
              />
            )}
            <button
              type="button"
              onClick={() => {
                setImage("");
                setIsVideo(false);
              }}
              className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
            >
              remover
            </button>
          </div>
        )}
        <input type="hidden" name="image_url" value={image} />

        <label className="text-xs text-slate-500">
          Imagem ou vídeo (upload)
          <input
            type="file"
            name="image"
            accept="image/*,video/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setIsVideo(!!f && f.type.startsWith("video/"));
              if (f) setImage("");
            }}
            className={`${field} mt-1`}
          />
        </label>
        <input
          placeholder="ou URL de imagem/vídeo"
          value={image}
          onChange={(e) => {
            setImage(e.target.value);
            setIsVideo(looksLikeVideo(e.target.value));
          }}
          className={field}
        />

        {/* Agendamento (início) */}
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 sm:col-span-2">
          <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
            Agendamento (opcional)
          </p>
          <label className="text-xs text-slate-500">
            Publicar a partir de (data/hora)
            <input type="datetime-local" name="publish_at" className={`${field} mt-1`} />
          </label>
          <p className="mt-1 text-[10px] text-slate-400">
            Sem data = publica imediatamente.
          </p>
        </div>

        <div className="sm:col-span-2">
          <PublishButton disabled={!title.trim()} />
        </div>
      </form>
    </details>
  );
}
