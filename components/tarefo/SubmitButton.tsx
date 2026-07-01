"use client";

import { useFormStatus } from "react-dom";

/** Botão de envio que mostra "em processamento" enquanto a Server Action roda.
 *  Deve estar dentro de um <form> (usa useFormStatus). */
export function SubmitButton({
  children,
  pendingText = "Aguarde…",
  className = "",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} aria-busy={pending} className={className}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
