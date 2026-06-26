import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import { logoutAction } from "@/app/login/actions";
import { Sidebar } from "@/components/Sidebar";
import { NotificationBar } from "@/components/NotificationBar";
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar permissions={Array.from(user.permissions)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Atualiza os alertas do topo periodicamente */}
        <AutoRefresh intervalMs={20000} />
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 md:inline">
              Azul Administradora
            </span>
            <NotificationBar notif={notif} />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
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
                className="ml-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-azul hover:text-azul"
                title="Sair"
              >
                Sair
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
