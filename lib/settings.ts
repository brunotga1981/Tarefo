import { query } from "./db";

/**
 * Configurações da aplicação (chaves de API das integrações).
 *
 * As chaves ficam salvas na tabela app_settings e podem ser editadas pela tela
 * "API" (somente perfil administrativo). Quando uma chave não está salva no
 * banco, o sistema usa a variável de ambiente de mesmo nome como fallback —
 * assim continua funcionando tanto via painel quanto via env do Render.
 */

export type SettingField = {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean; // mascara o valor ao exibir
  help?: string;
};

export type SettingGroup = {
  id: string;
  title: string;
  icon: string;
  description: string;
  fields: SettingField[];
};

export const SETTING_GROUPS: SettingGroup[] = [
  {
    id: "anthropic",
    title: "Claude AI (Anthropic Console)",
    icon: "🤖",
    description:
      "Geração de quiz, conteúdo de cursos, copy da Time Line e análise do R.A.C.",
    fields: [
      {
        key: "ANTHROPIC_API_KEY",
        label: "API Key",
        placeholder: "sk-ant-...",
        secret: true,
        help: "Disponível em console.anthropic.com → API Keys.",
      },
      {
        key: "ANTHROPIC_MODEL",
        label: "Modelo",
        placeholder: "claude-sonnet-4-6",
      },
    ],
  },
  {
    id: "superlogica",
    title: "Superlógica (ERP / CRM)",
    icon: "🏢",
    description: "Recebimento de tickets do CRM para o SAC.",
    fields: [
      {
        key: "SUPERLOGICA_APP_TOKEN",
        label: "App Token",
        secret: true,
      },
      {
        key: "SUPERLOGICA_ACCESS_TOKEN",
        label: "Access Token",
        secret: true,
      },
    ],
  },
  {
    id: "smtp",
    title: "E-mail (Locaweb / SMTP)",
    icon: "✉️",
    description: "Envio de notificações por e-mail e recebimento para o SAC.",
    fields: [
      { key: "SMTP_HOST", label: "Servidor (host)", placeholder: "email-ssl.com.br" },
      { key: "SMTP_PORT", label: "Porta", placeholder: "587" },
      { key: "SMTP_USER", label: "Usuário" },
      { key: "SMTP_PASS", label: "Senha", secret: true },
      { key: "SMTP_FROM", label: "Remetente (From)", placeholder: "nome@dominio.com.br" },
    ],
  },
  {
    id: "zapi",
    title: "WhatsApp (Z-API)",
    icon: "💬",
    description: "Recebimento de conversas do WhatsApp para o SAC.",
    fields: [
      { key: "ZAPI_INSTANCE", label: "Instance ID" },
      { key: "ZAPI_TOKEN", label: "Token", secret: true },
    ],
  },
  {
    id: "sac",
    title: "Webhooks do SAC",
    icon: "📨",
    description:
      "Token de segurança dos endpoints de entrada (header X-SAC-TOKEN). Endpoints: /api/sac/email | /api/sac/superlogica | /api/sac/whatsapp.",
    fields: [
      { key: "SAC_WEBHOOK_TOKEN", label: "Token dos webhooks", secret: true },
    ],
  },
];

export const ALL_SETTING_KEYS = SETTING_GROUPS.flatMap((g) =>
  g.fields.map((f) => f.key)
);

/** Chaves sensíveis: nunca são pré-preenchidas no formulário e só são
 *  sobrescritas quando um novo valor é enviado (campo vazio = manter atual). */
export const SECRET_KEYS = SETTING_GROUPS.flatMap((g) =>
  g.fields.filter((f) => f.secret).map((f) => f.key)
);

/** Lê todas as chaves salvas no banco (sem fallback). */
export async function getStoredSettings(): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string | null }>(
    `SELECT key, value FROM app_settings WHERE key = ANY($1)`,
    [ALL_SETTING_KEYS]
  );
  const out: Record<string, string> = {};
  for (const r of rows) if (r.value != null) out[r.key] = r.value;
  return out;
}

/** Lê uma configuração: banco primeiro, depois variável de ambiente. */
export async function getSetting(key: string): Promise<string | undefined> {
  const rows = await query<{ value: string | null }>(
    `SELECT value FROM app_settings WHERE key = $1`,
    [key]
  );
  const stored = rows[0]?.value;
  if (stored != null && stored !== "") return stored;
  return process.env[key];
}

/** Salva (ou apaga, quando vazio) várias configurações de uma vez. */
export async function setSettings(values: Record<string, string>) {
  for (const [key, raw] of Object.entries(values)) {
    if (!ALL_SETTING_KEYS.includes(key)) continue;
    const value = raw.trim();
    if (value === "") {
      await query(`DELETE FROM app_settings WHERE key = $1`, [key]);
    } else {
      await query(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, value]
      );
    }
  }
}
