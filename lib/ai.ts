// Integração com a IA da Claude para gerar perguntas/respostas do quiz a partir
// do conteúdo do treinamento. Ativa quando ANTHROPIC_API_KEY estiver definida.

export type GeneratedQuestion = {
  prompt: string;
  options: string[]; // 4 opções
  correct: number; // índice da correta (0-3)
};

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function generateQuizWithAI(
  content: string,
  numQuestions: number,
  difficulty: string
): Promise<GeneratedQuestion[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "IA não configurada. Defina ANTHROPIC_API_KEY para gerar o quiz automaticamente."
    );
  }
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const base = process.env.ANTHROPIC_API_URL || "https://api.anthropic.com";

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
