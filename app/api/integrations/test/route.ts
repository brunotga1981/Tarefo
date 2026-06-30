import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, can } from "@/lib/auth";
import { SETTING_GROUPS, getSetting } from "@/lib/settings";
import { runIntegrationTest, sendTestEmail } from "@/lib/integration-test";

export const dynamic = "force-dynamic";

/**
 * Testa a conexão de uma integração com as chaves informadas.
 * POST /api/integrations/test  Body: { group: string, values: Record<string,string> }
 * Restrito a quem tem a permissão api.manage.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!can(user, "api.manage")) {
    return NextResponse.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  let payload: {
    group?: string;
    values?: Record<string, string>;
    mode?: string;
    to?: string;
  } = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Requisição inválida." }, { status: 400 });
  }

  const group = SETTING_GROUPS.find((g) => g.id === payload.group);
  if (!group) {
    return NextResponse.json({ ok: false, message: "Integração desconhecida." }, { status: 404 });
  }

  // Para cada campo do grupo: usa o valor enviado; se vazio, busca o salvo (banco/env).
  const sent = payload.values ?? {};
  const values: Record<string, string> = {};
  for (const f of group.fields) {
    const v = String(sent[f.key] ?? "").trim();
    values[f.key] = v !== "" ? v : (await getSetting(f.key)) ?? "";
  }

  if (payload.mode === "send-email") {
    if (group.id !== "smtp") {
      return NextResponse.json(
        { ok: false, message: "Envio de e-mail só se aplica ao SMTP." },
        { status: 400 }
      );
    }
    const result = await sendTestEmail(values, String(payload.to ?? ""));
    return NextResponse.json(result);
  }

  const result = await runIntegrationTest(group.id, values);
  return NextResponse.json(result);
}
