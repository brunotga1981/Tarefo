import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-azul-navy via-azul to-azul-claro p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <h1 className="mb-1 text-center text-xl font-semibold text-azul-navy">
          Bem-vindo de volta
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Acesse o seu Tarefo
        </p>

        {/* Formulário visual (autenticação será implementada na Fase 2) */}
        <form className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              type="email"
              placeholder="seu.email@azuladministradora.com.br"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave"
            />
          </div>

          <Link
            href="/meu-tarefo"
            className="block w-full rounded-lg bg-azul-navy py-2.5 text-center text-sm font-semibold text-white transition hover:bg-azul"
          >
            Entrar
          </Link>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Fase 0 — protótipo navegável. A autenticação real entra na Fase 2.
        </p>
      </div>
    </main>
  );
}
