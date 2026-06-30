"use client";

import { useState } from "react";

/**
 * Envia um e-mail de teste real usando as credenciais SMTP do formulário
 * (campos sensíveis em branco usam o valor salvo no servidor).
 */
export function EmailTestSender({
  smtpKeys,
  defaultTo,
}: {
  smtpKeys: string[];
  defaultTo: string;
}) {
  const [to, setTo] = useState(defaultTo || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  async function send(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.closest("form");
    const values: Record<string, string> = {};
    if (form) {
      const fd = new FormData(form);
      for (const k of smtpKeys) values[k] = String(fd.get(k) ?? "");
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ group: "smtp", mode: "send-email", to, values }),
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
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Enviar e-mail de teste
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="destinatario@exemplo.com"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-azul"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading}
          className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy disabled:opacity-50"
        >
          {loading ? "Enviando…" : "✉️ Enviar teste"}
        </button>
      </div>
      {result && (
        <p
          className={`mt-2 text-xs font-medium ${
            result.ok ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {result.ok ? "✅" : "⚠️"} {result.message}
        </p>
      )}
    </div>
  );
}
