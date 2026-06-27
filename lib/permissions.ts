// Catálogo de permissões do Tarefo. Perfis de acesso são compostos por estas chaves.
export const PERMISSIONS = [
  { key: "tasks.view", label: "Ver tarefas", group: "Tarefas" },
  { key: "tasks.manage", label: "Criar e editar tarefas", group: "Tarefas" },
  {
    key: "tasks.view_all",
    label: "Ver todas as tarefas (não só as suas)",
    group: "Tarefas",
  },
  {
    key: "templates.manage",
    label: "Gerenciar modelos, lotes e agendamentos",
    group: "Tarefas",
  },
  { key: "clients.view", label: "Ver clientes", group: "Clientes" },
  { key: "clients.manage", label: "Gerenciar clientes", group: "Clientes" },
  { key: "projects.view", label: "Ver projetos", group: "Projetos" },
  { key: "projects.manage", label: "Gerenciar projetos", group: "Projetos" },
  { key: "users.manage", label: "Gerenciar usuários", group: "Administração" },
  {
    key: "access.manage",
    label: "Gerenciar perfis e grupos",
    group: "Administração",
  },
  {
    key: "trainings.manage",
    label: "Gerenciar treinamentos",
    group: "Administração",
  },
  {
    key: "blog.manage",
    label: "Gerenciar conteúdo da Intranet (Conheça Mais)",
    group: "Administração",
  },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSIONS.map((p) => [p.key, p.label])
);
