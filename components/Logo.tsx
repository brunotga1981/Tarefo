/* eslint-disable @next/next/no-img-element */

/**
 * Logo oficial do Tarefo.
 * - compact: apenas o ícone (para espaços estreitos)
 * - padrão: logo completa
 */
export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <img
        src="/logo-tarefo-icon.png"
        alt="Tarefo"
        className={className ?? "h-8 w-auto select-none"}
      />
    );
  }
  return (
    <img
      src="/logo-tarefo.png"
      alt="Tarefo — Azul Administradora"
      className={`w-auto select-none ${className ?? "h-9"}`}
    />
  );
}
