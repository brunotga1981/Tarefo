"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Logo } from "@/components/Logo";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="block w-full rounded-lg bg-azul-navy py-2.5 text-center text-sm font-semibold text-white transition hover:bg-azul disabled:opacity-60"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-azul-navy via-azul to-azul-claro p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex justify-center">
          <Logo className="h-14" />
        </div>

        <h1 className="mb-1 text-center text-xl font-semibold text-azul-navy">
          Bem-vindo de volta
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Acesse o seu Tarefo
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              required
              defaultValue="admin@azuladministradora.com.br"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <SubmitButton />
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Demonstração: senha <strong>tarefo123</strong> para os usuários de exemplo.
        </p>
      </div>
    </main>
  );
}
