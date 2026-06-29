import { NextRequest, NextResponse } from "next/server";
import { createTicket } from "@/lib/sac";

export const dynamic = "force-dynamic";

const MAP: Record<string, string> = {
  email: "EMAIL",
  superlogica: "SUPERLOGICA",
  whatsapp: "WHATSAPP",
};

/**
 * Webhook de entrada do SAC.
 * POST /api/sac/{email|superlogica|whatsapp}
 * Header: X-SAC-TOKEN: <SAC_WEBHOOK_TOKEN>
 * Body JSON: { subject, requester, body, external_id?, conversation_status?, client_id? }
 *
 * Configurar nas integrações:
 *  - E-mail (Locaweb): encaminhar/parsear e-mails para este endpoint.
 *  - Superlógica: webhook de tickets do CRM.
 *  - WhatsApp (Z-API): webhook de mensagens (conversa aberta/fechada).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { channel: string } }
) {
  const channel = MAP[params.channel?.toLowerCase()];
  if (!channel) {
    return NextResponse.json({ error: "Canal inválido" }, { status: 404 });
  }

  const token = process.env.SAC_WEBHOOK_TOKEN;
  if (!token || req.headers.get("x-sac-token") !== token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let data: any = {};
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const id = await createTicket({
    channel,
    external_id: data.external_id ?? data.id ?? null,
    subject: data.subject ?? data.title ?? null,
    requester: data.requester ?? data.from ?? data.phone ?? data.email ?? null,
    body: data.body ?? data.message ?? data.text ?? null,
    conversation_status:
      channel === "WHATSAPP" ? data.conversation_status ?? "ABERTA" : null,
    client_id: data.client_id ?? null,
  });

  return NextResponse.json({ ok: true, ticketId: id });
}
