"use client";

import { useRef } from "react";
import { TASK_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { updateStatusAction } from "@/app/(app)/meu-tarefo/actions";

export function StatusSelect({
  id,
  status,
  className = "",
}: {
  id: string;
  status: string;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateStatusAction} className={className}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        value={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus:border-azul"
      >
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
