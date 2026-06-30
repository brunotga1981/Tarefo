export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/auth";
import {
  getCourse,
  getMaterials,
  getQuestions,
  getCompletion,
  getForum,
  MATERIAL_KINDS,
  MATERIAL_LABEL,
  MATERIAL_ICON,
  PASS_SCORE,
  embedUrl,
} from "@/lib/lms";
import { formatDateTime } from "@/lib/format";
import { Tabs } from "@/components/tarefo/Tabs";
import { ResetForm } from "@/components/tarefo/ResetForm";
import { AiQuizForm } from "@/components/AiQuizForm";
import { AiContentForm } from "@/components/AiContentForm";
import { AiImageForm } from "@/components/AiImageForm";
import { formatDate } from "@/lib/format";
import {
  addMaterialAction,
  deleteMaterialAction,
  addQuestionAction,
  deleteQuestionAction,
  deleteCourseAction,
  addForumPostAction,
} from "../actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

export default async function CourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canManage = can(user, "trainings.manage");

  const course = await getCourse(params.id);
  if (!course) notFound();

  const [materials, questions, completion, forum] = await Promise.all([
    getMaterials(course.id),
    getQuestions(course.id),
    getCompletion(course.id, user.id),
    getForum(course.id),
  ]);

  // ---- Aba Conteúdo ----
  const conteudo = (
    <div className="space-y-2">
      {course.content && (
        <div className="mb-3 rounded-lg border border-slate-100 bg-white p-4">
          <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400">
            Conteúdo do curso
          </h4>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {course.content}
          </div>
        </div>
      )}
      {canManage && <AiContentForm trainingId={course.id} />}
      {materials.length === 0 && (
        <p className="text-xs text-slate-400">Nenhum material cadastrado.</p>
      )}
      {materials.map((m) => {
        const embed = m.kind === "VIDEO" ? embedUrl(m.url) : null;
        return (
          <div
            key={m.id}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
          >
            <div className="flex items-center justify-between">
              <a
                href={m.url}
                target="_blank"
                className="flex items-center gap-2 text-sm text-azul hover:underline"
              >
                <span>{MATERIAL_ICON[m.kind]}</span>
                {m.title}
                <span className="text-[10px] text-slate-400">
                  ({MATERIAL_LABEL[m.kind]})
                </span>
              </a>
              {canManage && (
                <form action={deleteMaterialAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="training_id" value={course.id} />
                  <button className="text-[11px] text-slate-400 hover:text-red-500">
                    remover
                  </button>
                </form>
              )}
            </div>
            {embed && (
              <div className="mt-2 aspect-video w-full overflow-hidden rounded-lg">
                <iframe
                  src={embed}
                  className="h-full w-full"
                  allowFullScreen
                  title={m.title}
                />
              </div>
            )}
          </div>
        );
      })}

      {canManage && (
        <ResetForm
          action={addMaterialAction}
          className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2"
        >
          <input type="hidden" name="training_id" value={course.id} />
          <input name="title" required placeholder="Título do material" className={field} />
          <select name="kind" className={field} defaultValue="LINK">
            {MATERIAL_KINDS.map((k) => (
              <option key={k} value={k}>
                {MATERIAL_LABEL[k]}
              </option>
            ))}
          </select>
          <input name="url" placeholder="URL (vídeo/link)" className={field} />
          <input type="file" name="file" className={field} />
          <div className="sm:col-span-2">
            <button className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy">
              Adicionar material
            </button>
          </div>
        </ResetForm>
      )}
    </div>
  );

  // ---- Aba Avaliação ----
  const avaliacao = (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        Quiz de avaliação · aprovação a partir de <strong>{PASS_SCORE}%</strong>.
      </p>
      {completion && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm ${
            completion.passed
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          Seu melhor resultado: <strong>{completion.score}%</strong> ·{" "}
          {completion.passed ? "Aprovado ✓" : "Ainda não aprovado"}
          {completion.passed && (
            <>
              {" — "}
              <Link
                href={`/treinamentos/${course.id}/certificado`}
                className="font-semibold underline"
              >
                Emitir certificado
              </Link>
            </>
          )}
        </div>
      )}
      {questions.length === 0 ? (
        <p className="text-xs text-slate-400">
          Este curso ainda não tem quiz cadastrado.
        </p>
      ) : (
        <Link
          href={`/treinamentos/${course.id}/quiz`}
          className="inline-block rounded-lg bg-azul-navy px-4 py-2 text-sm font-semibold text-white hover:bg-azul"
        >
          {completion ? "Refazer quiz" : "Fazer quiz"} ({questions.length} questões)
        </Link>
      )}

      {/* Gestão do quiz */}
      {canManage && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="mb-4">
            <AiQuizForm trainingId={course.id} />
          </div>

          <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">
            Questões cadastradas
          </h4>
          <div className="mb-3 space-y-1">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5 text-sm text-slate-600"
              >
                <span>
                  {i + 1}. {q.prompt}
                </span>
                <form action={deleteQuestionAction}>
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="training_id" value={course.id} />
                  <button className="text-[11px] text-slate-400 hover:text-red-500">
                    remover
                  </button>
                </form>
              </div>
            ))}
          </div>
          <ResetForm
            action={addQuestionAction}
            className="space-y-2 rounded-lg border border-slate-200 p-3"
          >
            <input type="hidden" name="training_id" value={course.id} />
            <input name="prompt" required placeholder="Pergunta" className={field} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  name={`opt${i}`}
                  placeholder={`Opção ${i + 1}`}
                  className={field}
                />
              ))}
            </div>
            <label className="block text-xs text-slate-500">
              Opção correta (número)
              <select name="correct" className={`${field} mt-1`} defaultValue="0">
                {[0, 1, 2, 3].map((i) => (
                  <option key={i} value={i}>
                    Opção {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <button className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy">
              Adicionar questão
            </button>
          </ResetForm>
        </div>
      )}
    </div>
  );

  // ---- Aba Fórum ----
  const forumTab = (
    <div className="space-y-4">
      <ResetForm action={addForumPostAction} className="space-y-2">
        <input type="hidden" name="training_id" value={course.id} />
        <textarea
          name="body"
          required
          rows={2}
          placeholder="Faça uma pergunta sobre este curso…"
          className={field}
        />
        <button className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy">
          Publicar pergunta
        </button>
      </ResetForm>

      {forum.length === 0 && (
        <p className="text-xs text-slate-400">
          Nenhuma dúvida ainda. Participe — perguntar e responder pontua no
          ranking!
        </p>
      )}
      {forum.map(({ question, answers }) => (
        <div key={question.id} className="rounded-lg border border-slate-200 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-azul-navy">
              ❓ {question.author_name}
            </span>
            <span className="text-[11px] text-slate-400">
              {formatDateTime(question.created_at)}
            </span>
          </div>
          <p className="text-sm text-slate-700">{question.body}</p>

          <div className="mt-2 space-y-1 border-l-2 border-slate-100 pl-3">
            {answers.map((a) => (
              <div key={a.id} className="text-sm">
                <span className="text-[11px] font-semibold text-emerald-700">
                  ↳ {a.author_name}:
                </span>{" "}
                <span className="text-slate-700">{a.body}</span>
              </div>
            ))}
          </div>

          <ResetForm action={addForumPostAction} className="mt-2 flex gap-2">
            <input type="hidden" name="training_id" value={course.id} />
            <input type="hidden" name="parent_id" value={question.id} />
            <input
              name="body"
              required
              placeholder="Responder…"
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-azul"
            />
            <button className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
              Responder
            </button>
          </ResetForm>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/treinamentos"
          className="text-sm text-slate-400 hover:text-azul"
        >
          ← Treinamentos
        </Link>
        {canManage && (
          <form action={deleteCourseAction}>
            <input type="hidden" name="id" value={course.id} />
            <button className="text-xs text-slate-400 hover:text-red-500">
              excluir curso
            </button>
          </form>
        )}
      </div>

      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          {course.theme && (
            <span className="rounded-full bg-azul-suave/40 px-2 py-0.5 text-[11px] font-medium text-azul-navy">
              {course.theme}
            </span>
          )}
          {course.subtheme && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
              {course.subtheme}
            </span>
          )}
          {course.mandatory && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              Obrigatório{course.group_name ? ` · ${course.group_name}` : ""}
            </span>
          )}
          {course.mandatory && course.deadline && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">
              Prazo: {formatDate(course.deadline)}
            </span>
          )}
        </div>
        <h1 className="mt-1 text-2xl font-bold text-azul-navy">{course.title}</h1>
        {course.description && (
          <p className="mt-2 text-sm text-slate-600">{course.description}</p>
        )}
        {course.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.image_url}
            alt={`Capa do curso ${course.title}`}
            className="mt-3 max-h-64 w-full rounded-lg object-cover"
          />
        )}
        {canManage && <AiImageForm trainingId={course.id} />}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <Tabs
          tabs={[
            { key: "conteudo", label: `Conteúdo (${materials.length})`, content: conteudo },
            { key: "avaliacao", label: "Avaliação / Quiz", content: avaliacao },
            { key: "forum", label: `Fórum (${forum.length})`, content: forumTab },
          ]}
        />
      </div>
    </div>
  );
}
