"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession, destroySession } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const userId = await authenticate(email, password);
  if (!userId) {
    return { error: "E-mail ou senha inválidos." };
  }

  createSession(userId);
  redirect("/meu-tarefo");
}

export async function logoutAction() {
  destroySession();
  redirect("/login");
}
