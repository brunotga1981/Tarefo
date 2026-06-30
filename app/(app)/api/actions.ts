"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, can } from "@/lib/auth";
import { setSettings, ALL_SETTING_KEYS, SECRET_KEYS } from "@/lib/settings";

export async function saveApiKeysAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!can(user, "api.manage")) throw new Error("Sem permissão.");

  const values: Record<string, string> = {};
  for (const key of ALL_SETTING_KEYS) {
    const raw = String(fd.get(key) ?? "").trim();
    // Campos secretos só são atualizados quando algo é digitado; vazio = manter.
    if (SECRET_KEYS.includes(key) && raw === "") continue;
    values[key] = raw;
  }
  await setSettings(values);
  revalidatePath("/api");
}
