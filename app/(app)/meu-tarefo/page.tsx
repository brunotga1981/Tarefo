"use client";

import { useState } from "react";

const COLUNAS = ["A Fazer", "Em Andamento", "Em Revisão", "Concluída"];

const FILTROS = [
  "Prioridade",
  "Data de finalização",
  "Solicitante",
  "Responsável",
  "Cliente",
  "Projeto",
];

export default function MeuTarefoPage() {
  const [view, setView] = useState<"kanban" | "lista">("kanban");

  return (
    <div>
      {/* Cabeçalho da página */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-azul-navy">Meu Tarefo</h1>
          <p className="text-sm text-slate-500">
            Suas tarefas em um só lugar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === "kanban"
                  ? "bg-azul-navy text-white"
                  : "text-slate-500 hover:text-azul-navy"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("lista")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === "lista"
                  ? "bg-azul-navy text-white"
                  : "text-slate-500 hover:text-azul-navy"
              }`}
            >
              Lista
            </button>
          </div>

          <button
            className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white transition hover:bg-azul-navy"
            title="Disponível na Fase 1"
          >
            + Nova tarefa
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-400">Ordenar por:</span>
        {FILTROS.map((f) => (
          <button
            key={f}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-azul hover:text-azul"
          >
            {f}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {view === "kanban" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLUNAS.map((coluna) => (
            <div
              key={coluna}
              className="rounded-xl border border-slate-200 bg-white/60 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-azul-navy">
                  {coluna}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                  0
                </span>
              </div>
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-400">
                Sem tarefas
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Tarefa</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Responsável</th>
                <th className="px-4 py-3 font-medium">Finalização</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-slate-400"
                >
                  Nenhuma tarefa cadastrada ainda. O cadastro chega na Fase 1.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
