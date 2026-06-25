import Link from "next/link";
import { Logo } from "@/components/Logo";

const NAV = [
  { label: "Meu Tarefo", href: "/meu-tarefo", icon: "📋", active: true },
  { label: "Comunicação", href: "#", icon: "💬", soon: true },
  { label: "Clientes", href: "#", icon: "🏢", soon: true },
  { label: "Projetos", href: "#", icon: "📁", soon: true },
  { label: "Modelos & Lotes", href: "#", icon: "🧩", soon: true },
  { label: "Usuários & Acessos", href: "#", icon: "🔐", soon: true },
];

export function Sidebar() {
  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
              item.active
                ? "bg-azul-suave/40 text-azul-navy"
                : "text-slate-600 hover:bg-slate-100"
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

      <div className="border-t border-slate-100 p-4">
        <Link
          href="/login"
          className="text-xs font-medium text-slate-400 hover:text-azul"
        >
          ← Sair
        </Link>
      </div>
    </aside>
  );
}
