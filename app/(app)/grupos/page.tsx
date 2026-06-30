export const dynamic = "force-dynamic";

import { getCurrentUser, can } from "@/lib/auth";
import {
  listGroupsFull,
  listUsersFull,
  listProfilesWithPerms,
} from "@/lib/admin-data";
import { NoAccess } from "@/components/NoAccess";
import { ResetForm } from "@/components/tarefo/ResetForm";
import {
  createGroupAction,
  addGroupMemberAction,
  removeGroupMemberAction,
  setGroupProfilesAction,
} from "../admin-actions";

export default async function GruposPage() {
  const user = await getCurrentUser();
  if (!can(user, "access.manage")) return <NoAccess />;
  const [groups, users, profiles] = await Promise.all([
    listGroupsFull(),
    listUsersFull(),
    listProfilesWithPerms(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">
        Grupos de acesso
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Agrupe usuários e conceda perfis de acesso ao grupo inteiro.
      </p>

      <ResetForm
        action={createGroupAction}
        className="mb-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-4"
      >
        <input
          name="name"
          required
          placeholder="Nome do grupo"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul"
        />
        <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
          Criar grupo
        </button>
      </ResetForm>

      <div className="space-y-5">
        {groups.map((g) => {
          const memberIds = new Set(g.members.map((m) => m.id));
          const naoMembros = users.filter((u) => !memberIds.has(u.id));
          const profSet = new Set(g.profileIds);
          return (
            <div
              key={g.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <h2 className="mb-3 text-sm font-semibold text-azul-navy">
                👪 {g.name}{" "}
                <span className="text-xs font-normal text-slate-400">
                  ({g.members.length}{" "}
                  {g.members.length === 1 ? "membro" : "membros"})
                </span>
              </h2>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Membros */}
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase text-slate-400">
                    Membros
                  </h3>
                  <div className="space-y-1">
                    {g.members.length === 0 && (
                      <p className="text-xs text-slate-400">Nenhum membro.</p>
                    )}
                    {g.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          {m.name}
                          {m.team === g.name && (
                            <span className="rounded-full bg-azul-suave/40 px-2 py-0.5 text-[10px] font-medium text-azul-navy">
                              equipe
                            </span>
                          )}
                        </span>
                        <form action={removeGroupMemberAction}>
                          <input type="hidden" name="group_id" value={g.id} />
                          <input type="hidden" name="user_id" value={m.id} />
                          <button className="text-xs text-slate-400 hover:text-red-500">
                            remover
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>

                  {naoMembros.length > 0 && (
                    <form
                      action={addGroupMemberAction}
                      className="mt-2 flex gap-2"
                    >
                      <input type="hidden" name="group_id" value={g.id} />
                      <select
                        name="user_id"
                        className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-azul"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Adicionar membro…
                        </option>
                        {naoMembros.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy">
                        +
                      </button>
                    </form>
                  )}
                </div>

                {/* Perfis do grupo */}
                <form action={setGroupProfilesAction}>
                  <input type="hidden" name="group_id" value={g.id} />
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase text-slate-400">
                      Perfis concedidos
                    </h3>
                    <button className="rounded-lg border border-azul px-2 py-1 text-[11px] font-semibold text-azul hover:bg-azul-suave/20">
                      Salvar
                    </button>
                  </div>
                  <div className="space-y-1">
                    {profiles.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 text-sm text-slate-600"
                      >
                        <input
                          type="checkbox"
                          name="profile_ids"
                          value={p.id}
                          defaultChecked={profSet.has(p.id)}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
