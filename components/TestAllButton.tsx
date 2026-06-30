"use client";

import { useState } from "react";

type Group = { id: string; title: string; fieldKeys: string[] };
type Row = Group & { ok: boolean; message: string };

/** Testa a conexão de todas as integrações de uma vez. */
export function TestAllButton({ groups }: { groups: Group[] }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);

  async function run(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.closest("form");
    const fd = form ? new FormData(form) : null;
    setLoading(true);
    setRows([]);
    const out: Row[] = [];
    for (const g of groups) {
      const values: Record<string, string> = {};
      if (fd) for (const k of g.fieldKeys) values[k] = String(fd.get(k) ?? "");
      try {
        const res = await fetch("/api/integrations/test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ group: g.id, values }),
        });
        const data = await res.json();
        out.push({ ...g, ok: !!data.ok, message: data.message ?? "Sem resposta." });
      } catch (err: any) {
        out.push({ ...g, ok: false, message: `Erro: ${err?.message ?? err}` });
      }
      setRows([...out]);
    }
    setLoading(false);
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="rounded-lg border border-azul px-4 py-2 text-sm font-semibold text-azul transition hover:bg-azul hover:text-white disabled:opacity-50"
      >
        {loading ? "Testando todas…" : "🔌 Testar todas"}
      </button>
      {rows && rows.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg border border-slate-200 bg-white p-3">
          {rows.map((r) => (
            <li key={r.id} className="text-xs">
              <span className="font-semibold text-slate-700">{r.title}:</span>{" "}
              <span className={r.ok ? "text-emerald-600" : "text-red-600"}>
                {r.ok ? "✅" : "⚠️"} {r.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
