// Constantes de presença (sem dependência de banco — seguras no client).
export const PRESENCE_OPTIONS = [
  "Disponível",
  "Ocupado",
  "Em Reunião",
  "Indisponível",
] as const;

export const PRESENCE_DOT: Record<string, string> = {
  Disponível: "bg-emerald-500",
  Ocupado: "bg-red-500",
  "Em Reunião": "bg-amber-500",
  Indisponível: "bg-slate-400",
};
