import { NextRequest, NextResponse } from "next/server";
import { runBirthdayPosts } from "@/lib/birthdays";
import { runDueSchedules } from "@/lib/templates";

export const dynamic = "force-dynamic";

/**
 * Tarefas agendadas diárias (chamar à meia-noite).
 * GET/POST /api/cron?token=<CRON_SECRET>
 *
 * - Publica os cartões de aniversário do dia na Time Line
 * - Gera as tarefas de agendamentos vencidos
 *
 * Protegido por CRON_SECRET (se definido). É idempotente, então pode ser
 * chamado mais de uma vez sem efeitos colaterais.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const token =
      req.nextUrl.searchParams.get("token") || req.headers.get("x-cron-token");
    if (token !== secret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }
  await runBirthdayPosts();
  const schedules = await runDueSchedules();
  return NextResponse.json({ ok: true, birthdays: true, schedules });
}

export const GET = handle;
export const POST = handle;
