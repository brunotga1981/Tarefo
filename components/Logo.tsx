/**
 * Marca textual do Tarefo nas cores da Azul Administradora.
 * (Placeholder até recebermos a logo oficial em alta resolução.)
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-azul-navy text-white font-bold">
        T
      </div>
      {!compact && (
        <div className="leading-tight">
          <span className="block text-lg font-bold text-azul-navy">Tarefo</span>
          <span className="block text-[10px] font-medium uppercase tracking-widest text-azul">
            Azul Administradora
          </span>
        </div>
      )}
    </div>
  );
}
