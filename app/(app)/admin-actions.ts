"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { hashPassword } from "@/lib/hash";

async function requirePerm(permission: string) {
  const user = await getCurrentUser();
  if (!can(user, permission)) {
    throw new Error("Sem permissão para esta ação.");
  }
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

// ---- Clientes ----
export async function createClientAction(fd: FormData) {
  await requirePerm("clients.manage");
  const name = str(fd, "name");
  if (!name) return;
  await query(`INSERT INTO clients (name) VALUES ($1)`, [name]);
  revalidatePath("/clientes");
}

// ---- Projetos ----
export async function createProjectAction(fd: FormData) {
  await requirePerm("projects.manage");
  const name = str(fd, "name");
  if (!name) return;
  await query(`INSERT INTO projects (name) VALUES ($1)`, [name]);
  revalidatePath("/projetos");
}

// ---- Usuários ----
/** Vincula o usuário ao grupo cujo nome é a equipe escolhida (idempotente). */
async function addToTeamGroup(userId: string, team: string | null) {
  if (!team) return;
  const g = await query<{ id: string }>(`SELECT id FROM groups WHERE name=$1`, [
    team,
  ]);
  if (g[0]) {
    await query(
      `INSERT INTO group_members (group_id, user_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [g[0].id, userId]
    );
  }
}

/** Remove o usuário do grupo correspondente a uma equipe. */
async function removeFromTeamGroup(userId: string, team: string | null) {
  if (!team) return;
  const g = await query<{ id: string }>(`SELECT id FROM groups WHERE name=$1`, [
    team,
  ]);
  if (g[0]) {
    await query(
      `DELETE FROM group_members WHERE group_id=$1 AND user_id=$2`,
      [g[0].id, userId]
    );
  }
}

function userFields(fd: FormData) {
  return {
    name: str(fd, "name"),
    email: str(fd, "email"),
    profileId: str(fd, "profile_id") || null,
    birthDate: str(fd, "birth_date") || null,
    team: str(fd, "team") || null,
    ramal: str(fd, "ramal") || null,
    phone: str(fd, "phone") || null,
    workLocation: str(fd, "work_location") || null,
    vertical: fd.getAll("vertical").map((v) => String(v)),
  };
}

export async function createUserAction(fd: FormData) {
  await requirePerm("users.manage");
  const f = userFields(fd);
  const password = str(fd, "password");
  if (!f.name || !f.email || !password) return;

  const exists = await query(`SELECT 1 FROM users WHERE lower(email)=lower($1)`, [
    f.email,
  ]);
  if (exists.length) return;

  const rows = await query<{ id: string }>(
    `INSERT INTO users
       (name, email, role, password_hash, profile_id, birth_date, team, vertical, ramal, phone, work_location)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      f.name,
      f.email,
      "Membro",
      hashPassword(password),
      f.profileId,
      f.birthDate,
      f.team,
      f.vertical,
      f.ramal,
      f.phone,
      f.workLocation,
    ]
  );
  // Vincula ao grupo da equipe escolhida
  if (rows[0]) await addToTeamGroup(rows[0].id, f.team);
  revalidatePath("/usuarios");
  revalidatePath("/grupos");
}

export async function updateUserAction(fd: FormData) {
  await requirePerm("users.manage");
  const id = str(fd, "id");
  if (!id) return;
  const f = userFields(fd);
  if (!f.name || !f.email) return;

  // Equipe anterior, para ajustar o vínculo de grupo se mudou
  const prev = await query<{ team: string | null }>(
    `SELECT team FROM users WHERE id=$1`,
    [id]
  );
  const oldTeam = prev[0]?.team ?? null;

  await query(
    `UPDATE users SET
       name=$2, email=$3, profile_id=$4, birth_date=$5, team=$6,
       vertical=$7, ramal=$8, phone=$9, work_location=$10
     WHERE id=$1`,
    [
      id,
      f.name,
      f.email,
      f.profileId,
      f.birthDate,
      f.team,
      f.vertical,
      f.ramal,
      f.phone,
      f.workLocation,
    ]
  );

  // Se a equipe mudou, troca o vínculo de grupo (sem mexer em outros grupos)
  if (oldTeam !== f.team) {
    await removeFromTeamGroup(id, oldTeam);
    await addToTeamGroup(id, f.team);
  }
  revalidatePath("/usuarios");
  revalidatePath("/grupos");
}

export async function resetUserPasswordAction(fd: FormData) {
  await requirePerm("users.manage");
  const id = str(fd, "id");
  const password = str(fd, "password");
  if (!id || password.length < 4) return;
  await query(`UPDATE users SET password_hash=$2 WHERE id=$1`, [
    id,
    hashPassword(password),
  ]);
  revalidatePath("/usuarios");
}

export async function toggleUserActiveAction(fd: FormData) {
  await requirePerm("access.manage"); // ativar/desativar é exclusivo de administradores
  const id = str(fd, "id");
  const active = str(fd, "active") === "true";
  if (!id) return;
  await query(`UPDATE users SET active=$2 WHERE id=$1`, [id, active]);
  revalidatePath("/usuarios");
}

export async function setUserProfileAction(fd: FormData) {
  await requirePerm("users.manage");
  const id = str(fd, "id");
  const profileId = str(fd, "profile_id") || null;
  await query(`UPDATE users SET profile_id = $2 WHERE id = $1`, [id, profileId]);
  revalidatePath("/usuarios");
}

// ---- Perfis ----
export async function createProfileAction(fd: FormData) {
  await requirePerm("access.manage");
  const name = str(fd, "name");
  if (!name) return;
  const rows = await query<{ id: string }>(
    `INSERT INTO profiles (name) VALUES ($1)
     ON CONFLICT (name) DO NOTHING RETURNING id`,
    [name]
  );
  const id = rows[0]?.id;
  if (id) {
    for (const perm of fd.getAll("permissions")) {
      await query(
        `INSERT INTO profile_permissions (profile_id, permission) VALUES ($1,$2)`,
        [id, String(perm)]
      );
    }
  }
  revalidatePath("/perfis");
}

export async function updateProfilePermissionsAction(fd: FormData) {
  await requirePerm("access.manage");
  const id = str(fd, "profile_id");
  if (!id) return;
  await query(`DELETE FROM profile_permissions WHERE profile_id = $1`, [id]);
  for (const perm of fd.getAll("permissions")) {
    await query(
      `INSERT INTO profile_permissions (profile_id, permission) VALUES ($1,$2)`,
      [id, String(perm)]
    );
  }
  revalidatePath("/perfis");
}

// ---- Grupos ----
export async function createGroupAction(fd: FormData) {
  await requirePerm("access.manage");
  const name = str(fd, "name");
  if (!name) return;
  await query(`INSERT INTO groups (name) VALUES ($1) ON CONFLICT DO NOTHING`, [
    name,
  ]);
  revalidatePath("/grupos");
}

export async function addGroupMemberAction(fd: FormData) {
  await requirePerm("access.manage");
  const groupId = str(fd, "group_id");
  const userId = str(fd, "user_id");
  if (!groupId || !userId) return;
  await query(
    `INSERT INTO group_members (group_id, user_id) VALUES ($1,$2)
     ON CONFLICT DO NOTHING`,
    [groupId, userId]
  );
  revalidatePath("/grupos");
}

export async function removeGroupMemberAction(fd: FormData) {
  await requirePerm("access.manage");
  const groupId = str(fd, "group_id");
  const userId = str(fd, "user_id");
  await query(
    `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  revalidatePath("/grupos");
}

export async function setGroupProfilesAction(fd: FormData) {
  await requirePerm("access.manage");
  const groupId = str(fd, "group_id");
  if (!groupId) return;
  await query(`DELETE FROM group_profiles WHERE group_id = $1`, [groupId]);
  for (const pid of fd.getAll("profile_ids")) {
    await query(
      `INSERT INTO group_profiles (group_id, profile_id) VALUES ($1,$2)`,
      [groupId, String(pid)]
    );
  }
  revalidatePath("/grupos");
}
