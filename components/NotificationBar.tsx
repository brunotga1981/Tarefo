import Link from "next/link";
import type { Notifications } from "@/lib/notifications";

function Item({
  href,
  icon,
  label,
  count,
}: {
  href: string;
  icon: string;
  label: string;
  count: number;
}) {
  const active = count > 0;
  return (
    <Link
      href={href}
      title={`${label}: ${count} nova(s)`}
      className={`relative flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
        active
          ? "bg-azul-suave/40 text-azul-navy"
          : "text-slate-400 hover:bg-slate-100"
      }`}
    >
      <span className={active ? "animate-pulse" : ""}>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
      {active && (
        <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function NotificationBar({ notif }: { notif: Notifications }) {
  return (
    <div className="flex items-center gap-1">
      <Item href="/comunicacao" icon="💬" label="Torpedo" count={notif.torpedo} />
      <Item href="/comunicacao" icon="🏢" label="Canal" count={notif.canal} />
      <Item href="/meu-tarefo" icon="📋" label="Tarefa" count={notif.tarefa} />
      <Item
        href="/meu-tarefo?view=kanban"
        icon="📌"
        label="MT"
        count={notif.mt}
      />
    </div>
  );
}
