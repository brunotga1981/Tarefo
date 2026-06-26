import { query } from "./db";
import { STATUS_LABELS } from "./constants";

// Análise heurística de sentimento (pt-BR). Será substituída por IA (Claude) quando
// a ANTHROPIC_API_KEY estiver disponível — ver analyzeWithAI (placeholder).
const POSITIVE = [
  "obrigad",
  "ótimo",
  "otimo",
  "excelente",
  "resolvid",
  "parabéns",
  "parabens",
  "agradeç",
  "agradec",
  "perfeito",
  "satisfeit",
  "rápid",
  "rapid",
  "sucesso",
  "concluíd",
  "concluid",
  "aprovad",
  "elogi",
  "ótima",
  "bom",
  "boa",
];
const NEGATIVE = [
  "ruim",
  "péssim",
  "pessim",
  "demora",
  "atras",
  "reclam",
  "insatisfeit",
  "problema",
  "erro",
  "cancel",
  "irritad",
  "não resolv",
  "nao resolv",
  "falha",
  "difícil",
  "dificil",
  "infeliz",
  "reclamação",
  "reclamacao",
  "transtorno",
  "absurdo",
];

export type Sentiment = "promoter" | "neutral" | "detractor";

export function analyzeSentiment(text: string): Sentiment {
  const t = (text || "").toLowerCase();
  let score = 0;
  for (const w of POSITIVE) if (t.includes(w)) score++;
  for (const w of NEGATIVE) if (t.includes(w)) score--;
  if (score > 0) return "promoter";
  if (score < 0) return "detractor";
  return "neutral";
}

export const SENTIMENT_COLOR: Record<Sentiment, string> = {
  promoter: "bg-emerald-500",
  neutral: "bg-amber-400",
  detractor: "bg-orange-500",
};
export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  promoter: "Promotor",
  neutral: "Neutro",
  detractor: "Detrator",
};

export type RACItem = {
  kind: "Tarefa" | "Atendimento";
  title: string;
  subtitle: string;
  date: string;
  sentiment: Sentiment;
  href?: string;
};

export type RACSummary = {
  total: number;
  promoters: number;
  neutrals: number;
  detractors: number;
  temperature: number; // 0-100
  zone: Sentiment;
  text: string;
};

export async function getClientRAC(
  clientId: string
): Promise<{ items: RACItem[]; summary: RACSummary }> {
  // Tarefas do cliente nos últimos 90 dias (com comentários agregados)
  const tasks = await query<{
    id: string;
    name: string;
    status: string;
    description: string | null;
    created_at: string;
    comments: string | null;
  }>(
    `SELECT t.id, t.name, t.status, t.description, t.created_at,
       string_agg(cm.body, ' ') AS comments
     FROM tasks t
     LEFT JOIN comments cm ON cm.task_id = t.id
     WHERE t.client_id = $1 AND t.parent_id IS NULL
       AND t.created_at > now() - interval '90 days'
     GROUP BY t.id
     ORDER BY t.created_at DESC`,
    [clientId]
  );

  const items: RACItem[] = tasks.map((t) => {
    const sentiment = analyzeSentiment(
      `${t.name} ${t.description ?? ""} ${t.comments ?? ""}`
    );
    return {
      kind: "Tarefa",
      title: t.name,
      subtitle: STATUS_LABELS[t.status] ?? t.status,
      date: t.created_at,
      sentiment,
      href: `/meu-tarefo/${t.id}`,
    };
  });

  // Atendimentos: mensagens do canal do cliente nos últimos 90 dias
  const channel = await query<{ id: string }>(
    `SELECT id FROM conversations WHERE type='CLIENT' AND client_id=$1 LIMIT 1`,
    [clientId]
  );
  if (channel[0]) {
    const msgs = await query<{ body: string; created_at: string }>(
      `SELECT body, created_at FROM messages
       WHERE conversation_id = $1 AND created_at > now() - interval '90 days'
       ORDER BY created_at DESC`,
      [channel[0].id]
    );
    if (msgs.length) {
      const sentiment = analyzeSentiment(msgs.map((m) => m.body).join(" "));
      items.push({
        kind: "Atendimento",
        title: "Conversas no canal do cliente",
        subtitle: `${msgs.length} mensagem(ns)`,
        date: msgs[0].created_at,
        sentiment,
      });
    }
  }

  // (Futuro) atendimentos de WhatsApp/e-mail entram aqui quando integrados.

  items.sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const promoters = items.filter((i) => i.sentiment === "promoter").length;
  const detractors = items.filter((i) => i.sentiment === "detractor").length;
  const neutrals = items.filter((i) => i.sentiment === "neutral").length;
  const total = items.length;

  // Temperatura: base 50, promotores aquecem, detratores esfriam.
  let temperature = 50;
  if (total > 0) {
    temperature = Math.round(
      50 + ((promoters - detractors) / total) * 50
    );
  }
  temperature = Math.max(0, Math.min(100, temperature));
  const zone: Sentiment =
    temperature >= 66 ? "promoter" : temperature >= 40 ? "neutral" : "detractor";

  const text =
    total === 0
      ? "Sem atendimentos ou tarefas nos últimos 90 dias para este cliente."
      : `Nos últimos 90 dias: ${total} registro(s) — ${promoters} promotor(es), ` +
        `${neutrals} neutro(s) e ${detractors} detrator(es). ` +
        (zone === "promoter"
          ? "Relacionamento saudável: cliente tende a promotor."
          : zone === "neutral"
            ? "Relacionamento estável/neutro: acompanhar de perto."
            : "Atenção: sinais de insatisfação, priorizar tratativas.") +
        " (Análise heurística — será aprimorada por IA da Claude quando a credencial for configurada.)";

  return {
    items,
    summary: { total, promoters, neutrals, detractors, temperature, zone, text },
  };
}
