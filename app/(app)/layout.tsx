import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import { logoutAction } from "@/app/login/actions";
import { Sidebar } from "@/components/Sidebar";
import { NotificationBar } from "@/components/NotificationBar";
import { AppShell } from "@/components/AppShell";
import { AutoRefresh } from "@/components/tarefo/AutoRefresh";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const notif = await getNotifications(user.id);

  const header = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span className="hidden text-sm text-slate-500 lg:inline">
          Azul Administradora
        </span>
        <NotificationBar notif={notif} />
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden text-right leading-tight sm:block">
          <span className="block text-sm font-medium text-slate-600">
            {user.name}
          </span>
          {user.profileName && (
            <span className="block text-[11px] text-slate-400">
              {user.profileName}
            </span>
          )}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-azul text-xs font-bold text-white">
          {initials(user.name)}
        </div>
        <form action={logoutAction}>
          <button
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-azul hover:text-azul"
            title="Sair"
          >
            Sair
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <AutoRefresh intervalMs={20000} />
      <AppShell
        sidebar={<Sidebar permissions={Array.from(user.permissions)} />}
        header={header}
      >
        {children}
      </AppShell>
    </>
  );
}
