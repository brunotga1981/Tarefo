import net from "net";
import tls from "tls";

export type TestResult = { ok: boolean; message: string };

// ---- Claude AI (Anthropic) ----
async function testAnthropic(v: Record<string, string>): Promise<TestResult> {
  const key = v.ANTHROPIC_API_KEY;
  const model = v.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  if (!key) return { ok: false, message: "Informe a API Key da Claude." };
  const base = process.env.ANTHROPIC_API_URL || "https://api.anthropic.com";
  try {
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    if (res.ok) return { ok: true, message: `Conexão OK (modelo ${model}).` };
    if (res.status === 401)
      return { ok: false, message: "API Key inválida (401 não autorizado)." };
    const body = await res.text().catch(() => "");
    if (res.status === 404 || /model/i.test(body))
      return { ok: false, message: `Modelo "${model}" não encontrado (HTTP ${res.status}).` };
    return { ok: false, message: `Falha (HTTP ${res.status}). ${body.slice(0, 140)}` };
  } catch (e: any) {
    return { ok: false, message: `Erro de conexão: ${e?.message ?? e}` };
  }
}

// ---- ChatGPT / OpenAI (imagens) ----
async function testOpenAI(v: Record<string, string>): Promise<TestResult> {
  const key = v.OPENAI_API_KEY;
  if (!key) return { ok: false, message: "Informe a API Key da OpenAI." };
  const base = process.env.OPENAI_API_URL || "https://api.openai.com";
  try {
    const res = await fetch(`${base}/v1/models`, {
      headers: { authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      const model = v.OPENAI_IMAGE_MODEL || "gpt-image-1";
      return { ok: true, message: `Conexão OK (imagens com ${model}).` };
    }
    if (res.status === 401)
      return { ok: false, message: "API Key inválida (401 não autorizado)." };
    return { ok: false, message: `Falha (HTTP ${res.status}).` };
  } catch (e: any) {
    return { ok: false, message: `Erro de conexão: ${e?.message ?? e}` };
  }
}

// ---- Superlógica (ERP/CRM) ----
async function testSuperlogica(v: Record<string, string>): Promise<TestResult> {
  const app = v.SUPERLOGICA_APP_TOKEN;
  const access = v.SUPERLOGICA_ACCESS_TOKEN;
  if (!app || !access)
    return { ok: false, message: "Informe o App Token e o Access Token." };
  try {
    const res = await fetch(
      "https://api.superlogica.net/v2/financeiro/recebimentos?STATUS=pendente&pagina=1&itensPorPagina=1",
      {
        method: "GET",
        headers: { app_token: app, access_token: access },
      }
    );
    if (res.status === 401 || res.status === 403)
      return { ok: false, message: `Credenciais rejeitadas (HTTP ${res.status}).` };
    if (res.ok) return { ok: true, message: "Conexão com a Superlógica OK." };
    return {
      ok: true,
      message: `API acessível (HTTP ${res.status}) — credenciais aceitas; confirme no primeiro uso real.`,
    };
  } catch (e: any) {
    return { ok: false, message: `Erro de conexão: ${e?.message ?? e}` };
  }
}

// ---- WhatsApp (Z-API) ----
async function testZapi(v: Record<string, string>): Promise<TestResult> {
  const instance = v.ZAPI_INSTANCE;
  const token = v.ZAPI_TOKEN;
  if (!instance || !token)
    return { ok: false, message: "Informe o Instance ID e o Token." };
  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${encodeURIComponent(instance)}/token/${encodeURIComponent(token)}/status`,
      { method: "GET" }
    );
    if (res.status === 401 || res.status === 403 || res.status === 404)
      return { ok: false, message: `Credenciais inválidas (HTTP ${res.status}).` };
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const connected = data?.connected ?? data?.smartphoneConnected;
      return {
        ok: true,
        message:
          connected === false
            ? "Instância OK, mas o WhatsApp não está conectado (leia o QR Code no Z-API)."
            : "Conexão com a Z-API OK.",
      };
    }
    return { ok: false, message: `Falha (HTTP ${res.status}).` };
  } catch (e: any) {
    return { ok: false, message: `Erro de conexão: ${e?.message ?? e}` };
  }
}

// ---- E-mail (SMTP / Locaweb) via socket nativo ----
type SmtpCmd = (text: string | null) => Promise<{ code: number; line: string }>;

/**
 * Abre a sessão SMTP (conexão + EHLO + STARTTLS/TLS + AUTH LOGIN) e entrega um
 * `cmd` autenticado ao callback `after`, que decide o resultado via `done`.
 * Reutilizado pelo teste de conexão e pelo envio real de e-mail.
 */
function smtpSession(
  v: Record<string, string>,
  needsAuth: boolean,
  after: (cmd: SmtpCmd, done: (ok: boolean, message: string) => void) => Promise<void>
): Promise<TestResult> {
  const host = v.SMTP_HOST;
  const port = Number(v.SMTP_PORT) || 587;
  const user = v.SMTP_USER;
  const pass = v.SMTP_PASS;
  if (!host) return Promise.resolve({ ok: false, message: "Informe o servidor (host)." });
  const secure = port === 465;

  return new Promise<TestResult>((resolve) => {
    let sock: net.Socket | tls.TLSSocket;
    let settled = false;
    let buf = "";
    const waiters: ((code: number, line: string) => void)[] = [];

    const done = (ok: boolean, message: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        sock.write("QUIT\r\n");
      } catch {}
      try {
        sock.end();
      } catch {}
      resolve({ ok, message });
    };
    const timer = setTimeout(() => done(false, "Tempo esgotado (15s)."), 15000);

    const onData = (d: Buffer) => {
      buf += d.toString("utf8");
      let idx;
      while ((idx = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const m = line.match(/^(\d{3})([ -])/);
        if (m && m[2] === " ") {
          const w = waiters.shift();
          if (w) w(Number(m[1]), line);
        }
      }
    };
    const cmd: SmtpCmd = (text) =>
      new Promise((res) => {
        waiters.push((code, line) => res({ code, line }));
        if (text != null) sock.write(text + "\r\n");
      });

    const run = async () => {
      try {
        let r = await cmd(null); // saudação
        if (r.code !== 220)
          return done(false, `Servidor não respondeu 220: ${r.line}`);
        r = await cmd("EHLO tarefo");
        if (r.code !== 250) r = await cmd("HELO tarefo");

        if (!secure) {
          r = await cmd("STARTTLS");
          if (r.code !== 220)
            return done(false, `STARTTLS indisponível: ${r.line}`);
          sock.removeListener("data", onData);
          const upgraded = tls.connect({ socket: sock as net.Socket, servername: host });
          upgraded.on("data", onData);
          upgraded.on("error", (e) => done(false, `TLS: ${e.message}`));
          await new Promise<void>((res) => upgraded.once("secureConnect", () => res()));
          sock = upgraded;
          r = await cmd("EHLO tarefo");
        }

        if (user) {
          r = await cmd("AUTH LOGIN");
          if (r.code !== 334)
            return done(false, `AUTH LOGIN não suportado: ${r.line}`);
          r = await cmd(Buffer.from(user).toString("base64"));
          if (r.code !== 334) return done(false, `Usuário rejeitado: ${r.line}`);
          r = await cmd(Buffer.from(pass || "").toString("base64"));
          if (r.code !== 235)
            return done(false, `Falha na autenticação (${r.code}): ${r.line}`);
        } else if (needsAuth) {
          return done(false, "Informe usuário e senha para enviar o e-mail.");
        }

        await after(cmd, done);
      } catch (e: any) {
        done(false, `Erro: ${e?.message ?? e}`);
      }
    };

    const onConnect = () => run();
    try {
      sock = secure
        ? tls.connect({ host, port, servername: host }, onConnect)
        : net.connect({ host, port }, onConnect);
      sock.on("data", onData);
      sock.on("error", (e) => done(false, `Conexão falhou: ${e.message}`));
    } catch (e: any) {
      done(false, `Erro: ${e?.message ?? e}`);
    }
  });
}

function testSmtp(v: Record<string, string>): Promise<TestResult> {
  return smtpSession(v, false, async (_cmd, done) => {
    done(
      true,
      v.SMTP_USER
        ? "Autenticação SMTP bem-sucedida."
        : "Conexão e TLS OK (sem usuário/senha para autenticar)."
    );
  });
}

/** Envia um e-mail de teste real de ponta a ponta. */
export function sendTestEmail(
  v: Record<string, string>,
  to: string
): Promise<TestResult> {
  const recipient = String(to ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient))
    return Promise.resolve({ ok: false, message: "Informe um e-mail destinatário válido." });
  const from = (v.SMTP_FROM || v.SMTP_USER || "").trim();
  if (!from)
    return Promise.resolve({ ok: false, message: "Defina o remetente (From) ou o usuário." });

  return smtpSession(v, true, async (cmd, done) => {
    let r = await cmd(`MAIL FROM:<${from}>`);
    if (r.code !== 250) return done(false, `MAIL FROM recusado (${r.code}): ${r.line}`);
    r = await cmd(`RCPT TO:<${recipient}>`);
    if (r.code !== 250 && r.code !== 251)
      return done(false, `Destinatário recusado (${r.code}): ${r.line}`);
    r = await cmd("DATA");
    if (r.code !== 354) return done(false, `DATA recusado (${r.code}): ${r.line}`);

    const date = new Date().toUTCString();
    const message = [
      `From: Tarefo <${from}>`,
      `To: <${recipient}>`,
      `Subject: =?UTF-8?B?${Buffer.from("Teste de e-mail — Tarefo").toString("base64")}?=`,
      `Date: ${date}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="utf-8"',
      "",
      "Este é um e-mail de teste enviado pela tela API do Tarefo.",
      "Se você recebeu esta mensagem, a configuração de SMTP está funcionando. ✅",
      "",
      ".",
    ].join("\r\n");

    r = await cmd(message);
    if (r.code === 250)
      return done(true, `E-mail de teste enviado para ${recipient}.`);
    return done(false, `Envio recusado (${r.code}): ${r.line}`);
  });
}

// ---- Webhooks do SAC (token interno) ----
function testSac(v: Record<string, string>): TestResult {
  const token = v.SAC_WEBHOOK_TOKEN;
  if (!token)
    return {
      ok: false,
      message: "Defina um token para proteger os webhooks de entrada do SAC.",
    };
  return {
    ok: true,
    message:
      "Token configurado. Use-o no header X-SAC-TOKEN nos endpoints /api/sac/email | /superlogica | /whatsapp.",
  };
}

export async function runIntegrationTest(
  group: string,
  values: Record<string, string>
): Promise<TestResult> {
  switch (group) {
    case "anthropic":
      return testAnthropic(values);
    case "openai":
      return testOpenAI(values);
    case "superlogica":
      return testSuperlogica(values);
    case "zapi":
      return testZapi(values);
    case "smtp":
      return testSmtp(values);
    case "sac":
      return testSac(values);
    default:
      return { ok: false, message: "Integração desconhecida." };
  }
}
