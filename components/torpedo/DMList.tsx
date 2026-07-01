"use client";

import { useState } from "react";
import { openDMAction } from "@/app/(app)/comunicacao/actions";
import { PRESENCE_DOT } from "@/lib/chat-meta";

export type DMUser = {
  id: string;
  name: string;
  presence: string;
  unread: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Lista de usuários para DMs, com busca. Os não lidos já chegam ordenados por
 *  ordem de chegada (do servidor); a busca apenas filtra por nome. */
export function DMList({ users }: { users: DMUser[] }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const filtered = term
    ? users.filter((u) => u.name.toLowerCase().includes(term))
    : users;

  return (
    <div>
      {/* Busca de usuário — logo acima do topo da lista */}
      <div className="relative mb-2">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
          🔎
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar usuário…"
          className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-azul"
        />
      </div>

      <div className="space-y-0.5">
        {filtered.length === 0 && (
          <p className="px-2 py-1 text-xs text-slate-400">
            Nenhum usuário encontrado.
          </p>
        )}
        {filtered.map((u) => (
          <form key={u.id} action={openDMAction}>
            <input type="hidden" name="user_id" value={u.id} />
            <button
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${
                u.unread
                  ? "bg-azul-suave/40 font-semibold text-azul-navy"
                  : "text-slate-600"
              }`}
            >
              <span className="relative">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-azul-suave text-[10px] font-bold text-azul-navy">
                  {initials(u.name)}
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${PRESENCE_DOT[u.presence]}`}
                />
              </span>
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
              {u.unread > 0 && (
                <span
                  className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white"
                  title={`${u.unread} mensagem(ns) nova(s)`}
                >
                  {u.unread}
                </span>
              )}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
