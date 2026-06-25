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
export async function createUserAction(fd: FormData) {
  await requirePerm("users.manage");
  const name = str(fd, "name");
  const email = str(fd, "email");
  const password = str(fd, "password");
  const profileId = str(fd, "profile_id") || null;
  if (!name || !email || !password) return;

  const exists = await query(`SELECT 1 FROM users WHERE lower(email)=lower($1)`, [
    email,
  ]);
  if (exists.length) return;

  await query(
    `INSERT INTO users (name, email, role, password_hash, profile_id)
     VALUES ($1,$2,$3,$4,$5)`,
    [name, email, "Membro", hashPassword(password), profileId]
  );
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
