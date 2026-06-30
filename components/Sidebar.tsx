import Link from "next/link";
import { Logo } from "@/components/Logo";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  perm?: string;
  soon?: boolean;
};

type NavGroup = {
  label: string;
  icon: string;
  children: { label: string; href: string }[];
};

const NAV: NavItem[] = [
  { label: "Meu Tarefo", href: "/meu-tarefo", icon: "📋", perm: "tasks.view" },
  { label: "Torpedo", href: "/comunicacao", icon: "💬" },
  { label: "Clientes", href: "/clientes", icon: "🏢", perm: "clients.view" },
  { label: "Projetos", href: "/projetos", icon: "📁", perm: "projects.view" },
  {
    label: "Modelos & Lotes",
    href: "/modelos",
    icon: "🧩",
    perm: "templates.manage",
  },
  {
    label: "Agendamentos",
    href: "/agendamentos",
    icon: "🗓️",
    perm: "templates.manage",
  },
  { label: "Treinamentos", href: "/treinamentos", icon: "🎓" },
  { label: "SAC", href: "/sac", icon: "📨", perm: "sac.manage" },
  { label: "Usuários", href: "/usuarios", icon: "👥", perm: "users.manage" },
  { label: "Perfis", href: "/perfis", icon: "🔐", perm: "access.manage" },
  { label: "Grupos", href: "/grupos", icon: "👪", perm: "access.manage" },
  { label: "API", href: "/api", icon: "🔑", perm: "api.manage" },
];

const INTRANET: NavGroup = {
  label: "Intranet",
  icon: "🌐",
  children: [
    { label: "Time Line", href: "/intranet/timeline" },
    { label: "Conheça Mais", href: "/intranet/conheca-mais" },
    { label: "Calendário", href: "/intranet/calendario" },
    { label: "Contatos", href: "/intranet/contatos" },
    { label: "Aniversários", href: "/intranet/aniversarios" },
  ],
};

export function Sidebar({ permissions }: { permissions: string[] }) {
  const allowed = new Set(permissions);
  const items = NAV.filter((i) => i.soon || !i.perm || allowed.has(i.perm));

  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {/* Grupo Intranet (primeiro da lista, expansível) */}
        <details className="group" open>
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <span className="flex items-center gap-2">
              <span>{INTRANET.icon}</span>
              {INTRANET.label}
            </span>
            <span className="text-xs text-slate-400 transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="mt-1 space-y-0.5 pl-7">
            {INTRANET.children.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="block rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-azul-navy"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </details>

        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
              item.soon ? "text-slate-400" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{item.icon}</span>
              {item.label}
            </span>
            {item.soon && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-400">
                em breve
              </span>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
