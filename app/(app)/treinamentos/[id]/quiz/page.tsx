export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCourse, getQuestions, PASS_SCORE } from "@/lib/lms";
import { SubmitButton } from "@/components/tarefo/SubmitButton";
import { submitQuizAction } from "../../actions";

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { score?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const course = await getCourse(params.id);
  if (!course) notFound();
  const questions = await getQuestions(course.id);

  // Resultado após enviar
  if (searchParams.score != null) {
    const score = Number(searchParams.score);
    const passed = score >= PASS_SCORE;
    return (
      <div className="mx-auto max-w-lg text-center">
        <div
          className={`rounded-2xl border p-8 ${
            passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="text-5xl">{passed ? "🎉" : "📚"}</div>
          <h1 className="mt-3 text-2xl font-bold text-azul-navy">
            {passed ? "Aprovado!" : "Quase lá!"}
          </h1>
          <p className="mt-1 text-slate-600">
            Você acertou <strong>{score}%</strong> (mínimo de {PASS_SCORE}%).
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {passed ? (
              <Link
                href={`/treinamentos/${course.id}/certificado`}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                🎓 Emitir certificado
              </Link>
            ) : (
              <Link
                href={`/treinamentos/${course.id}/quiz`}
                className="rounded-lg bg-azul-navy px-4 py-2 text-sm font-semibold text-white hover:bg-azul"
              >
                Refazer quiz
              </Link>
            )}
            <Link
              href={`/treinamentos/${course.id}`}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-azul"
            >
              Voltar ao curso
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-slate-400">Este curso não tem quiz.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/treinamentos/${course.id}`}
        className="text-sm text-slate-400 hover:text-azul"
      >
        ← {course.title}
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-bold text-azul-navy">Quiz</h1>
      <p className="mb-6 text-sm text-slate-500">
        Responda todas as questões. Aprovação a partir de {PASS_SCORE}%.
      </p>

      <form action={submitQuizAction} className="space-y-5">
        <input type="hidden" name="training_id" value={course.id} />
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 font-medium text-slate-800">
              {i + 1}. {q.prompt}
            </p>
            <div className="space-y-2">
              {q.options.map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input type="radio" name={`q_${q.id}`} value={o.id} required />
                  {o.text}
                </label>
              ))}
            </div>
          </div>
        ))}
        <SubmitButton
          pendingText="Enviando respostas…"
          className="rounded-lg bg-azul-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-azul disabled:opacity-60"
        >
          Enviar respostas
        </SubmitButton>
      </form>
    </div>
  );
}
