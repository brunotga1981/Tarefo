"use client";

import { useState, type ReactNode } from "react";

export function Tabs({
  tabs,
  initialKey,
}: {
  tabs: { key: string; label: ReactNode; content: ReactNode }[];
  initialKey?: string;
}) {
  const startKey =
    initialKey && tabs.some((t) => t.key === initialKey)
      ? initialKey
      : tabs[0]?.key;
  const [active, setActive] = useState(startKey);
  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition ${
              active === t.key
                ? "border-azul text-azul-navy"
                : "border-transparent text-slate-500 hover:text-azul-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-4">
        {tabs.map((t) => (
          <div key={t.key} className={active === t.key ? "" : "hidden"}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}
