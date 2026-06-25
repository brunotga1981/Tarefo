// Rótulos, ordem e cores dos domínios de tarefa.

export const TASK_TYPES = ["PADRAO", "URGENTE", "PRIORIDADE_MAXIMA"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TYPE_LABELS: Record<string, string> = {
  PADRAO: "Padrão",
  URGENTE: "Urgente",
  PRIORIDADE_MAXIMA: "Prioridade Máxima",
};

export const TYPE_BADGE: Record<string, string> = {
  PADRAO: "bg-slate-100 text-slate-600",
  URGENTE: "bg-amber-100 text-amber-700",
  PRIORIDADE_MAXIMA: "bg-red-100 text-red-700",
};

export const TASK_STATUSES = [
  "A_FAZER",
  "EM_ANDAMENTO",
  "EM_REVISAO",
  "CONCLUIDA",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  A_FAZER: "A Fazer",
  EM_ANDAMENTO: "Em Andamento",
  EM_REVISAO: "Em Revisão",
  CONCLUIDA: "Concluída",
};

export const STATUS_DOT: Record<string, string> = {
  A_FAZER: "bg-slate-400",
  EM_ANDAMENTO: "bg-azul",
  EM_REVISAO: "bg-amber-500",
  CONCLUIDA: "bg-emerald-500",
};
