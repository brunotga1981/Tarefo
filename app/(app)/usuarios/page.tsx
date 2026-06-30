export const dynamic = "force-dynamic";

import { getCurrentUser, can } from "@/lib/auth";
import {
  listUsersFull,
  listProfilesWithPerms,
  listGroupNames,
  type UserFull,
  type ProfileWithPerms,
} from "@/lib/admin-data";
import { NoAccess } from "@/components/NoAccess";
import { ResetForm } from "@/components/tarefo/ResetForm";
import Link from "next/link";
import { VERTICALS, WORK_LOCATIONS } from "@/lib/users-meta";
import {
  createUserAction,
  updateUserAction,
  resetUserPasswordAction,
  toggleUserActiveAction,
} from "../admin-actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";
const label = "block text-xs font-medium text-slate-500 mb-1";

function dateInput(v: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Conjunto de campos do cadastro/edição (sem senha). */
function UserFields({
  profiles,
  teams,
  u,
}: {
  profiles: ProfileWithPerms[];
  teams: string[];
  u?: UserFull;
}) {
  const vertical = u?.vertical ?? [];
  return (
    <>
      <div>
        <label className={label}>Nome</label>
        <input name="name" required defaultValue={u?.name ?? ""} className={field} />
      </div>
      <div>
        <label className={label}>E-mail</label>
        <input
          name="email"
          type="email"
          required
          defaultValue={u?.email ?? ""}
          className={field}
        />
      </div>
      <div>
        <label className={label}>Perfil de acesso</label>
        <select name="profile_id" defaultValue={u?.profile_id ?? ""} className={field}>
          <option value="">— Perfil —</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label}>Data de aniversário</label>
        <input
          name="birth_date"
          type="date"
          defaultValue={dateInput(u?.birth_date ?? null)}
          className={field}
        />
      </div>
      <div>
        <label className={label}>Equipe de trabalho</label>
        <select name="team" defaultValue={u?.team ?? ""} className={field}>
          <option value="">— Equipe —</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {u?.team && !teams.includes(u.team) && (
            <option value={u.team}>{u.team}</option>
          )}
        </select>
      </div>
      <div>
        <label className={label}>Número de ramal</label>
        <input name="ramal" defaultValue={u?.ramal ?? ""} className={field} />
      </div>
      <div>
        <label className={label}>Número de telefone</label>
        <input name="phone" defaultValue={u?.phone ?? ""} className={field} />
      </div>
      <div>
        <label className={label}>Local de trabalho</label>
        <select
          name="work_location"
          defaultValue={u?.work_location ?? ""}
          className={field}
        >
          <option value="">— Local —</option>
          {WORK_LOCATIONS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className={label}>Vertical (marque uma ou mais)</label>
        <div className="flex flex-wrap gap-3">
          {VERTICALS.map((v) => (
            <label key={v} className="flex items-center gap-1.5 text-sm text-slate-600">
              <input
                type="checkbox"
                name="vertical"
                value={v}
                defaultChecked={vertical.includes(v)}
                className="rounded border-slate-300"
              />
              {v}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const user = await getCurrentUser();
  if (!can(user, "users.manage")) return <NoAccess />;
  // Apenas administradores podem visualizar os usuários desativados.
  const isAdmin = can(user, "access.manage");
  const [allUsers, profiles, teams] = await Promise.all([
    listUsersFull(),
    listProfilesWithPerms(),
    listGroupNames(),
  ]);

  const status =
    isAdmin && searchParams.status === "desativados" ? "desativados" : "ativos";
  const activeCount = allUsers.filter((u) => u.active).length;
  const inactiveCount = allUsers.length - activeCount;
  const users = allUsers.filter((u) =>
    status === "desativados" ? !u.active : u.active
  );

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Usuários</h1>
      <p className="mb-6 text-sm text-slate-500">
        Cadastre, edite, redefina a senha e ative/desative usuários.
      </p>

      {/* Cadastro */}
      <details className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-azul-navy">
          ➕ Cadastrar usuário
        </summary>
        <ResetForm
          action={createUserAction}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <UserFields profiles={profiles} teams={teams} />
          <div>
            <label className={label}>Senha</label>
            <input
              name="password"
              type="password"
              required
              placeholder="Senha inicial"
              className={field}
            />
          </div>
          <div className="flex items-end">
            <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
              Adicionar usuário
            </button>
          </div>
        </ResetForm>
      </details>

      {/* Filtro Ativos / Desativados (desativados só para administradores) */}
      {isAdmin && (
        <div className="mb-4 flex gap-2">
          <Link
            href="/usuarios"
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              status === "ativos"
                ? "border-azul bg-azul-suave/30 text-azul-navy"
                : "border-slate-200 bg-white text-slate-500 hover:border-azul hover:text-azul"
            }`}
          >
            Ativos ({activeCount})
          </Link>
          <Link
            href="/usuarios?status=desativados"
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              status === "desativados"
                ? "border-azul bg-azul-suave/30 text-azul-navy"
                : "border-slate-200 bg-white text-slate-500 hover:border-azul hover:text-azul"
            }`}
          >
            Desativados ({inactiveCount})
          </Link>
        </div>
      )}

      {/* Lista de usuários */}
      <div className="space-y-3">
        {users.length === 0 && (
          <p className="text-sm text-slate-400">
            Nenhum usuário {status === "desativados" ? "desativado" : "ativo"}.
          </p>
        )}
        {users.map((u) => (
          <div
            key={u.id}
            className={`rounded-xl border bg-white p-4 ${
              u.active ? "border-slate-200" : "border-slate-200 opacity-70"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-800">{u.name}</p>
                  {u.profile_name && (
                    <span className="rounded-full bg-azul-suave/40 px-2 py-0.5 text-[11px] font-medium text-azul-navy">
                      {u.profile_name}
                    </span>
                  )}
                  {!u.active && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                      Desativado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {u.email}
                  {u.work_location ? ` · ${u.work_location}` : ""}
                  {u.ramal ? ` · ramal ${u.ramal}` : ""}
                  {u.vertical.length ? ` · ${u.vertical.join(", ")}` : ""}
                </p>
              </div>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-azul hover:underline">
                ✏️ Editar
              </summary>

              <form
                action={updateUserAction}
                className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                <input type="hidden" name="id" value={u.id} />
                <UserFields profiles={profiles} teams={teams} u={u} />
                <div className="flex items-end">
                  <button className="rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-navy">
                    Salvar alterações
                  </button>
                </div>
              </form>

              {/* Redefinir senha + ativar/desativar */}
              <div className="mt-3 flex flex-wrap items-end gap-4 border-t border-slate-100 pt-3">
                <form action={resetUserPasswordAction} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <div>
                    <label className={label}>Redefinir senha</label>
                    <input
                      name="password"
                      type="text"
                      required
                      minLength={4}
                      placeholder="Nova senha"
                      className={field}
                    />
                  </div>
                  <button className="rounded-lg border border-azul px-3 py-2 text-xs font-semibold text-azul hover:bg-azul hover:text-white">
                    Redefinir
                  </button>
                </form>

                {isAdmin && (
                  <form action={toggleUserActiveAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="active" value={u.active ? "false" : "true"} />
                    <button
                      className={`rounded-lg px-3 py-2 text-xs font-semibold text-white ${
                        u.active
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {u.active ? "Desativar usuário" : "Reativar usuário"}
                    </button>
                  </form>
                )}
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
