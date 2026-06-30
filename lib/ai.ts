// Integração com a IA da Claude para gerar perguntas/respostas do quiz a partir
// do conteúdo do treinamento. Ativa quando a API Key estiver configurada na
// tela "API" (ou via variável de ambiente ANTHROPIC_API_KEY).

import { getSetting } from "./settings";

export type GeneratedQuestion = {
  prompt: string;
  options: string[]; // 4 opções
  correct: number; // índice da correta (0-3)
};

export async function aiEnabled(): Promise<boolean> {
  return !!(await getSetting("ANTHROPIC_API_KEY"));
}

async function aiConfig() {
  const key = await getSetting("ANTHROPIC_API_KEY");
  const model = (await getSetting("ANTHROPIC_MODEL")) || "claude-sonnet-4-6";
  const base = process.env.ANTHROPIC_API_URL || "https://api.anthropic.com";
  return { key, model, base };
}

async function callClaude(prompt: string, maxTokens = 2000): Promise<string> {
  const { key, model, base } = await aiConfig();
  if (!key) {
    throw new Error(
      "IA não configurada. Defina a API Key da Claude na tela API para usar os recursos de IA."
    );
  }
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Falha ao chamar a IA (HTTP ${res.status}).`);
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

// Copywriting do post da Time Line a partir de um tema/observações.
export async function generatePostCopy(topic: string): Promise<string> {
  const prompt =
    `Escreva um texto curto e envolvente (estilo post de rede social interna, em ` +
    `português do Brasil, com 2 a 4 frases e poucos emojis) sobre o seguinte tema/observações:\n` +
    `${topic}\n\nResponda apenas com o texto do post.`;
  const text = await callClaude(prompt, 600);
  if (!text.trim()) throw new Error("A IA não retornou texto.");
  return text.trim();
}

// Geração de imagem por IA (requer provedor de imagem configurado).
export async function generatePostImage(_prompt: string): Promise<string> {
  // A API da Claude não gera imagens. Integração com um provedor de imagens
  // (ex.: OpenAI Images / Stability) pode ser plugada aqui via env dedicada.
  throw new Error(
    "Geração de imagem por IA ainda não configurada (requer chave de um provedor de imagens). Envie uma imagem ou informe uma URL."
  );
}

// Elabora o conteúdo do curso a partir de um material de referência (e anexos).
export async function generateCourseContent(
  title: string,
  reference: string,
  difficulty: string
): Promise<string> {
  const prompt =
    `Você é um instrutor. Elabore o CONTEÚDO DIDÁTICO de um curso interno em português do Brasil, ` +
    `bem estruturado (introdução, tópicos com explicações e conclusão), nível ${difficulty}. ` +
    `Título do curso: "${title}".\n\n` +
    `Use o material de referência a seguir (anexos/observações) como base:\n${reference}\n\n` +
    `Responda apenas com o conteúdo do curso em texto (pode usar títulos e listas).`;
  const text = await callClaude(prompt, 3000);
  if (!text.trim()) throw new Error("A IA não retornou conteúdo.");
  return text.trim();
}

export async function generateQuizWithAI(
  content: string,
  numQuestions: number,
  difficulty: string
): Promise<GeneratedQuestion[]> {
  const { key, model, base } = await aiConfig();
  if (!key) {
    throw new Error(
      "IA não configurada. Defina a API Key da Claude na tela API para gerar o quiz automaticamente."
    );
  }

  const prompt =
    `Você é um instrutor que cria avaliações. Com base no CONTEÚDO do treinamento abaixo, ` +
    `crie exatamente ${numQuestions} perguntas de múltipla escolha em português do Brasil, ` +
    `cada uma com 4 alternativas e apenas 1 correta. Nível de dificuldade: ${difficulty}. ` +
    `Responda SOMENTE com JSON válido no formato: ` +
    `{"questions":[{"prompt":"...","options":["a","b","c","d"],"correct":0}]}. ` +
    `Não inclua texto fora do JSON.\n\nCONTEÚDO:\n${content}`;

  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao chamar a IA (HTTP ${res.status}).`);
  }
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Resposta da IA inválida.");
  const parsed = JSON.parse(text.slice(start, end + 1));
  const questions: GeneratedQuestion[] = (parsed.questions || [])
    .filter((q: any) => q?.prompt && Array.isArray(q.options) && q.options.length >= 2)
    .map((q: any) => ({
      prompt: String(q.prompt),
      options: q.options.slice(0, 4).map((o: any) => String(o)),
      correct: Number(q.correct) || 0,
    }));
  if (questions.length === 0) throw new Error("A IA não retornou perguntas.");
  return questions;
}
