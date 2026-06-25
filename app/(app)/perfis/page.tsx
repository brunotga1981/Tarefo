export const dynamic = "force-dynamic";

import { getCurrentUser, can } from "@/lib/auth";
import { listProfilesWithPerms } from "@/lib/admin-data";
import { PERMISSIONS } from "@/lib/permissions";
import { NoAccess } from "@/components/NoAccess";
import {
  createProfileAction,
  updateProfilePermissionsAction,
} from "../admin-actions";

export default async function PerfisPage() {
  const user = await getCurrentUser();
  if (!can(user, "access.manage")) return <NoAccess />;
  const profiles = await listProfilesWithPerms();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">
        Perfis de acesso
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Defina o que cada perfil pode ver e fazer no sistema.
      </p>

      {/* Novo perfil */}
      <form
        action={createProfileAction}
        className="mb-8 rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-azul-navy">
          Novo perfil
        </h2>
        <input
          name="name"
          required
          placeholder="Nome do perfil (ex.: Financeiro)"
          className="mb-3 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul"
        />
        <PermissionGrid name="permissions" checked={[]} />
        <div className="mt-3">
          <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
            Criar perfil
          </button>
        </div>
      </form>

      {/* Perfis existentes */}
      <div className="space-y-4">
        {profiles.map((p) => (
          <form
            key={p.id}
            action={updateProfilePermissionsAction}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <input type="hidden" name="profile_id" value={p.id} />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-azul-navy">{p.name}</h2>
              <button className="rounded-lg border border-azul px-3 py-1.5 text-xs font-semibold text-azul hover:bg-azul-suave/20">
                Salvar permissões
              </button>
            </div>
            <PermissionGrid name="permissions" checked={p.permissions} />
          </form>
        ))}
      </div>
    </div>
  );
}

function PermissionGrid({
  name,
  checked,
}: {
  name: string;
  checked: string[];
}) {
  const set = new Set(checked);
  const groups = Array.from(new Set(PERMISSIONS.map((p) => p.group)));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {groups.map((g) => (
        <div key={g}>
          <h3 className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
            {g}
          </h3>
          <div className="space-y-1">
            {PERMISSIONS.filter((p) => p.group === g).map((perm) => (
              <label
                key={perm.key}
                className="flex items-center gap-2 text-sm text-slate-600"
              >
                <input
                  type="checkbox"
                  name={name}
                  value={perm.key}
                  defaultChecked={set.has(perm.key)}
                />
                {perm.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
