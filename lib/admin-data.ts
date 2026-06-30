import { query } from "./db";

export async function listClientsWithCounts() {
  return query<{ id: string; name: string; task_count: number }>(
    `SELECT c.id, c.name,
      (SELECT count(*)::int FROM tasks t WHERE t.client_id = c.id) AS task_count
     FROM clients c ORDER BY c.name`
  );
}

export async function listProjectsWithCounts() {
  return query<{ id: string; name: string; task_count: number }>(
    `SELECT p.id, p.name,
      (SELECT count(*)::int FROM tasks t WHERE t.project_id = p.id) AS task_count
     FROM projects p ORDER BY p.name`
  );
}

export type UserFull = {
  id: string;
  name: string;
  email: string;
  profile_id: string | null;
  profile_name: string | null;
  birth_date: string | null;
  team: string | null;
  vertical: string[];
  ramal: string | null;
  phone: string | null;
  work_location: string | null;
  active: boolean;
};

export async function listUsersFull(): Promise<UserFull[]> {
  return query<UserFull>(
    `SELECT u.id, u.name, u.email, u.profile_id, p.name AS profile_name,
            u.birth_date, u.team, u.vertical, u.ramal, u.phone,
            u.work_location, u.active
     FROM users u LEFT JOIN profiles p ON p.id = u.profile_id
     ORDER BY u.active DESC, u.name`
  );
}

export type ProfileWithPerms = {
  id: string;
  name: string;
  permissions: string[];
};

/** Nomes dos grupos de trabalho cadastrados (usados como "Equipe de trabalho"). */
export async function listGroupNames(): Promise<string[]> {
  const rows = await query<{ name: string }>(
    `SELECT name FROM groups ORDER BY name`
  );
  return rows.map((r) => r.name);
}

export async function listProfilesWithPerms(): Promise<ProfileWithPerms[]> {
  const profiles = await query<{ id: string; name: string }>(
    `SELECT id, name FROM profiles ORDER BY name`
  );
  const perms = await query<{ profile_id: string; permission: string }>(
    `SELECT profile_id, permission FROM profile_permissions`
  );
  return profiles.map((p) => ({
    ...p,
    permissions: perms
      .filter((x) => x.profile_id === p.id)
      .map((x) => x.permission),
  }));
}

export type GroupFull = {
  id: string;
  name: string;
  members: { id: string; name: string }[];
  profileIds: string[];
};

export async function listGroupsFull(): Promise<GroupFull[]> {
  const groups = await query<{ id: string; name: string }>(
    `SELECT id, name FROM groups ORDER BY name`
  );
  const members = await query<{
    group_id: string;
    id: string;
    name: string;
  }>(
    `SELECT gm.group_id, u.id, u.name FROM group_members gm
     JOIN users u ON u.id = gm.user_id ORDER BY u.name`
  );
  const gprofiles = await query<{ group_id: string; profile_id: string }>(
    `SELECT group_id, profile_id FROM group_profiles`
  );
  return groups.map((g) => ({
    ...g,
    members: members
      .filter((m) => m.group_id === g.id)
      .map((m) => ({ id: m.id, name: m.name })),
    profileIds: gprofiles
      .filter((p) => p.group_id === g.id)
      .map((p) => p.profile_id),
  }));
}
