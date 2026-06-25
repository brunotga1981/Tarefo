"use client";

import { useRef } from "react";

/** Select que dispara uma server action ao mudar. */
export function AutoSelect({
  action,
  name,
  value,
  options,
  hidden = {},
  className = "",
}: {
  action: (formData: FormData) => Promise<void>;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  hidden?: Record<string, string>;
  className?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={action}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <select
        name={name}
        value={value}
        onChange={() => ref.current?.requestSubmit()}
        className={`rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus:border-azul ${className}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
