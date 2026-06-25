export const dynamic = "force-dynamic";

import { getCurrentUser, can } from "@/lib/auth";
import { listUsersFull, listProfilesWithPerms } from "@/lib/admin-data";
import { NoAccess } from "@/components/NoAccess";
import { ResetForm } from "@/components/tarefo/ResetForm";
import { AutoSelect } from "@/components/AutoSelect";
import { createUserAction, setUserProfileAction } from "../admin-actions";

const field =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

export default async function UsuariosPage() {
  const user = await getCurrentUser();
  if (!can(user, "users.manage")) return <NoAccess />;
  const [users, profiles] = await Promise.all([
    listUsersFull(),
    listProfilesWithPerms(),
  ]);

  const profileOptions = [
    { value: "", label: "— Sem perfil —" },
    ...profiles.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Usuários</h1>
      <p className="mb-6 text-sm text-slate-500">
        Cadastre usuários e atribua o perfil de acesso de cada um.
      </p>

      <ResetForm
        action={createUserAction}
        className="mb-6 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <input name="name" required placeholder="Nome" className={field} />
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          className={field}
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Senha"
          className={field}
        />
        <select name="profile_id" className={field} defaultValue="">
          <option value="">— Perfil —</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
          Adicionar
        </button>
      </ResetForm>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Perfil de acesso</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-700">
                  {u.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <AutoSelect
                    action={setUserProfileAction}
                    name="profile_id"
                    value={u.profile_id ?? ""}
                    hidden={{ id: u.id }}
                    options={profileOptions}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
