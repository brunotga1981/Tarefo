"use client";

import { useRef } from "react";

/** Formulário que dispara uma server action e limpa os campos após o envio. */
export function ResetForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await action(fd);
        ref.current?.reset();
      }}
      className={className}
    >
      {children}
    </form>
  );
}
