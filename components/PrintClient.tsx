"use client";

export function PrintClient() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy"
    >
      🖨️ Imprimir / Salvar PDF
    </button>
  );
}
