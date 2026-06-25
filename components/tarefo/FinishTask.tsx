"use client";

import { useState } from "react";
import {
  finalizeMyShareAction,
  finalizeWholeAction,
} from "@/app/(app)/meu-tarefo/actions";

export function FinishTask({
  taskId,
  canFinishMine,
  canFinishAll,
  myDone,
}: {
  taskId: string;
  canFinishMine: boolean;
  canFinishAll: boolean;
  myDone: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!canFinishMine && !canFinishAll) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        ✓ Finalizar Tarefa
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {myDone ? (
            <p className="px-2 py-1 text-xs text-emerald-600">
              Sua colaboração já foi finalizada.
            </p>
          ) : (
            canFinishMine && (
              <form action={finalizeMyShareAction}>
                <input type="hidden" name="task_id" value={taskId} />
                <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <span className="font-medium">
                    1) Finalizar apenas a sua Colaboração
                  </span>
                  <span className="block text-xs text-slate-400">
                    Conclui a sua parte; a tarefa segue até todos finalizarem.
                  </span>
                </button>
              </form>
            )
          )}

          <form action={finalizeWholeAction}>
            <input type="hidden" name="task_id" value={taskId} />
            <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              <span className="font-medium text-emerald-700">
                2) Finalizar 100% da Tarefa
              </span>
              <span className="block text-xs text-slate-400">
                Conclui a tarefa inteira para todos os participantes.
              </span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
