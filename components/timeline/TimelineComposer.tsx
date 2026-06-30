"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { EmojiInsert } from "@/components/EmojiInsert";
import {
  createTimelinePostAction,
  aiPostCopyAction,
  aiPostImageAction,
  type AiPostState,
} from "@/app/(app)/intranet/timeline/actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

// Botão de IA que mostra estado de processamento.
function AiButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-azul px-2 py-1 text-xs font-semibold text-white hover:bg-azul-navy disabled:opacity-60"
    >
      {pending ? "⏳ Gerando, aguarde…" : children}
    </button>
  );
}

export function TimelineComposer() {
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("");
  const [image, setImage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const [copyState, copyAction] = useFormState<AiPostState, FormData>(
    aiPostCopyAction,
    {}
  );
  const [imgState, imgAction] = useFormState<AiPostState, FormData>(
    aiPostImageAction,
    {}
  );

  // Quando a IA retorna uma imagem, anexa-a ao post.
  useEffect(() => {
    if (imgState.imageUrl) setImage(imgState.imageUrl);
  }, [imgState.imageUrl]);

  async function publish(fd: FormData) {
    await createTimelinePostAction(fd);
    setBody("");
    setImage("");
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
        <div className="mt-2 flex gap-2">
          <form action={copyAction}>
            <input type="hidden" name="topic" value={topic} />
            <AiButton>✍️ Gerar texto (IA)</AiButton>
          </form>
          <form action={imgAction}>
            <input type="hidden" name="topic" value={topic} />
            <AiButton>🎨 Gerar imagem (IA)</AiButton>
          </form>
        </div>
        {copyState.copy && (
          <div className="mt-2 text-xs">
            <p className="rounded bg-white p-2 text-slate-700">{copyState.copy}</p>
            <button
              onClick={() => setBody(copyState.copy!)}
              className="mt-1 text-azul hover:underline"
            >
              usar este texto
            </button>
          </div>
        )}
        {(copyState.error || imgState.error) && (
          <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
            {copyState.error || imgState.error}
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

        {/* Imagem gerada pela IA (anexada ao post) */}
        {image && (
          <div className="relative">
            <img
              src={image}
              alt="Imagem gerada pela IA"
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
        <button
          disabled={!body.trim()}
          className="rounded-lg bg-azul-navy px-4 py-2 text-sm font-semibold text-white hover:bg-azul disabled:opacity-50"
        >
          Publicar
        </button>
      </form>
    </div>
  );
}
