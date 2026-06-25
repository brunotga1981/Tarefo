import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { query } from "./db";
import { verifyPassword } from "./hash";

const SECRET =
  process.env.SESSION_SECRET || "tarefo-dev-secret-troque-em-producao";
const COOKIE = "tarefo_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

// ---- Sessão (cookie assinado por HMAC) ----
function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createSession(userId: string) {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = `${userId}.${exp}`;
  const token = `${payload}.${sign(payload)}`;
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export function destroySession() {
  cookies().delete(COOKIE);
}

function readSession(): string | null {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const [userId, exp, sig] = token.split(".");
  if (!userId || !exp || !sig) return null;
  if (sign(`${userId}.${exp}`) !== sig) return null;
  if (Number(exp) < Date.now()) return null;
  return userId;
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  profileId: string | null;
  profileName: string | null;
  permissions: Set<string>;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const userId = readSession();
  if (!userId) return null;

  const rows = await query<{
    id: string;
    name: string;
    email: string;
    profile_id: string | null;
    profile_name: string | null;
  }>(
    `SELECT u.id, u.name, u.email, u.profile_id, p.name AS profile_name
     FROM users u LEFT JOIN profiles p ON p.id = u.profile_id
     WHERE u.id = $1`,
    [userId]
  );
  const u = rows[0];
  if (!u) return null;

  const perms = await query<{ permission: string }>(
    `SELECT permission FROM profile_permissions WHERE profile_id = $1
     UNION
     SELECT pp.permission FROM group_members gm
       JOIN group_profiles gp ON gp.group_id = gm.group_id
       JOIN profile_permissions pp ON pp.profile_id = gp.profile_id
     WHERE gm.user_id = $2`,
    [u.profile_id, u.id]
  );

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    profileId: u.profile_id,
    profileName: u.profile_name,
    permissions: new Set(perms.map((p) => p.permission)),
  };
}

export function can(user: CurrentUser | null, permission: string): boolean {
  return !!user && user.permissions.has(permission);
}

export async function authenticate(
  email: string,
  password: string
): Promise<string | null> {
  const rows = await query<{ id: string; password_hash: string | null }>(
    `SELECT id, password_hash FROM users WHERE lower(email) = lower($1)`,
    [email]
  );
  const u = rows[0];
  if (!u || !u.password_hash) return null;
  if (!verifyPassword(password, u.password_hash)) return null;
  return u.id;
}
