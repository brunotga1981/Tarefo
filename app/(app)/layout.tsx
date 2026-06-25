import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <span className="text-sm text-slate-500">Azul Administradora</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">
              Usuário Demo
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-azul text-xs font-bold text-white">
              UD
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
