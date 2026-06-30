"use client";

import { useState } from "react";

/**
 * Botão "Testar conexão" para um bloco de chaves da tela API.
 * Lê os campos do grupo no formulário (inclusive valores ainda não salvos) e
 * chama o endpoint de teste; campos sensíveis em branco usam o valor salvo.
 */
export function ApiTestButton({
  groupId,
  fieldKeys,
}: {
  groupId: string;
  fieldKeys: string[];
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  async function handleTest(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.closest("form");
    setLoading(true);
    setResult(null);
    const values: Record<string, string> = {};
    if (form) {
      const fd = new FormData(form);
      for (const k of fieldKeys) values[k] = String(fd.get(k) ?? "");
    }
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ group: groupId, values }),
      });
      const data = await res.json();
      setResult({ ok: !!data.ok, message: data.message ?? "Sem resposta." });
    } catch (err: any) {
      setResult({ ok: false, message: `Erro: ${err?.message ?? err}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleTest}
        disabled={loading}
        className="rounded-lg border border-azul px-3 py-1.5 text-xs font-semibold text-azul transition hover:bg-azul hover:text-white disabled:opacity-50"
      >
        {loading ? "Testando…" : "🔌 Testar conexão"}
      </button>
      {result && (
        <span
          className={`text-xs font-medium ${
            result.ok ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {result.ok ? "✅" : "⚠️"} {result.message}
        </span>
      )}
    </div>
  );
}
