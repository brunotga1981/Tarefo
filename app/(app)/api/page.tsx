export const dynamic = "force-dynamic";

import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { SETTING_GROUPS, getStoredSettings } from "@/lib/settings";
import { ApiTestButton } from "@/components/ApiTestButton";
import { saveApiKeysAction } from "./actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

export default async function ApiPage() {
  const user = await getCurrentUser();
  if (!can(user, "api.manage")) return <NoAccess />;

  const stored = await getStoredSettings();
  const isConfigured = (key: string) => !!(stored[key] || process.env[key]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">🔑 API</h1>
      <p className="mb-2 text-sm text-slate-500">
        Chaves de integração do Tarefo. Acesso restrito ao perfil
        administrativo.
      </p>
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        🔒 As chaves são armazenadas com segurança no servidor. Campos sensíveis
        não exibem o valor salvo — deixe em branco para manter o valor atual ou
        digite um novo para substituir.
      </div>

      <form action={saveApiKeysAction} className="space-y-6">
        {SETTING_GROUPS.map((g) => (
          <section
            key={g.id}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg">{g.icon}</span>
              <h2 className="text-sm font-semibold text-azul-navy">{g.title}</h2>
            </div>
            <p className="mb-4 text-xs text-slate-500">{g.description}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {g.fields.map((f) => {
                const configured = isConfigured(f.key);
                const value = f.secret ? "" : stored[f.key] ?? process.env[f.key] ?? "";
                return (
                  <div key={f.key}>
                    <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
                      {f.label}
                      {f.secret && configured && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          configurado
                        </span>
                      )}
                    </label>
                    <input
                      name={f.key}
                      type={f.secret ? "password" : "text"}
                      defaultValue={value}
                      autoComplete="off"
                      placeholder={
                        f.secret && configured
                          ? "•••••••• (deixe em branco para manter)"
                          : f.placeholder ?? ""
                      }
                      className={field}
                    />
                    {f.help && (
                      <p className="mt-1 text-[11px] text-slate-400">{f.help}</p>
                    )}
                    <p className="mt-0.5 font-mono text-[10px] text-slate-300">
                      {f.key}
                    </p>
                  </div>
                );
              })}
            </div>

            <ApiTestButton
              groupId={g.id}
              fieldKeys={g.fields.map((f) => f.key)}
            />
          </section>
        ))}

        <div className="flex items-center justify-end gap-3">
          <button className="rounded-lg bg-azul px-5 py-2.5 text-sm font-semibold text-white hover:bg-azul-navy">
            Salvar chaves
          </button>
        </div>
      </form>
    </div>
  );
}
