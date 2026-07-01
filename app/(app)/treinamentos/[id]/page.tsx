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
  registerCourseView,
  getCourseAccesses,
  getMyTrainingRatings,
  courseMissingItems,
  MATERIAL_KINDS,
  MATERIAL_LABEL,
  MATERIAL_ICON,
  PASS_SCORE,
  embedUrl,
} from "@/lib/lms";
import { formatDateTime } from "@/lib/format";
import { markForumRead } from "@/lib/notifications";
import { listUsersBasic } from "@/lib/data";
import { Tabs } from "@/components/tarefo/Tabs";
import { ResetForm } from "@/components/tarefo/ResetForm";
import { AiQuizForm } from "@/components/AiQuizForm";
import { AiContentForm } from "@/components/AiContentForm";
import { AiImageForm } from "@/components/AiImageForm";
import { CourseContentEditor } from "@/components/CourseContentEditor";
import { CourseContentReader } from "@/components/CourseContentReader";
import { AiSlidesForm } from "@/components/AiSlidesForm";
import { SlidesViewer } from "@/components/SlidesViewer";
import { PublishCourseForm } from "@/components/PublishCourseForm";
import { SubmitButton } from "@/components/tarefo/SubmitButton";
import { formatDate } from "@/lib/format";
import {
  addMaterialAction,
  deleteMaterialAction,
  addQuestionAction,
  deleteQuestionAction,
  deleteCourseAction,
  addForumPostAction,
  setCourseTutorAction,
  rateTrainingAction,
  touchCourseAction,
} from "../actions";

const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul";

/** Renderiza o texto do fórum destacando as menções @usuário. */
function ForumBody({ text }: { text: string }) {
  const parts = text.split(/(@[a-zA-Z0-9._-]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^@[a-zA-Z0-9._-]+$/.test(p) ? (
          <span key={i} className="font-semibold text-azul">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canManage = can(user, "trainings.manage");
  const isAdmin = can(user, "access.manage"); // download do .pptx é só do admin

  const course = await getCourse(params.id);
  if (!course) notFound();
  // Cursos em rascunho (não publicados) só são acessíveis a quem gerencia.
  if (course.published === false && !canManage) notFound();

  // Registra o acesso do usuário e marca o fórum deste curso como lido
  // (limpa o alerta "Fórum" para tutor/mencionado após visitar o curso).
  await registerCourseView(course.id, user.id);
  await markForumRead(user.id, course.id);

  const [materials, questions, completion, forum, accesses, users, myRatings] =
    await Promise.all([
      getMaterials(course.id),
      getQuestions(course.id),
      getCompletion(course.id, user.id),
      getForum(course.id),
      getCourseAccesses(course.id),
      canManage
        ? listUsersBasic()
        : Promise.resolve([] as Awaited<ReturnType<typeof listUsersBasic>>),
      getMyTrainingRatings(course.id, user.id),
    ]);
  const totalAccesses = accesses.reduce((s, a) => s + a.count, 0);
  const missing = courseMissingItems(course, questions.length);

  // Pessoas que o aluno pode avaliar: tutor + demais participantes do fórum
  // (autores de perguntas/respostas), exceto ele mesmo.
  const ratees: { id: string; name: string; role: "TUTOR" | "PARTICIPANT" }[] = [];
  if (course.tutor_id && course.tutor_name && course.tutor_id !== user.id) {
    ratees.push({ id: course.tutor_id, name: course.tutor_name, role: "TUTOR" });
  }
  const seen = new Set(ratees.map((r) => r.id));
  seen.add(user.id);
  for (const { question, answers } of forum) {
    for (const p of [question, ...answers]) {
      if (p.user_id && !seen.has(p.user_id)) {
        seen.add(p.user_id);
        ratees.push({ id: p.user_id, name: p.author_name, role: "PARTICIPANT" });
      }
    }
  }
  const canRate = !!completion?.passed && ratees.length > 0;

  // ---- Aba Conteúdo ----
  const conteudo = (
    <div className="space-y-2">
      {/* Apresentação (slides) — no topo. Gerar (gestor) e ver (todos); baixar só admin */}
      {(canManage || (course.slides?.length ?? 0) > 0) && (
        <div className="space-y-2 rounded-lg border border-azul-suave bg-azul-suave/10 p-3">
          <p className="text-xs font-semibold text-azul-navy">
            Apresentação do conteúdo (PowerPoint)
          </p>
          {course.slides?.length ? (
            <SlidesViewer
              trainingId={course.id}
              slides={course.slides}
              canDownload={isAdmin}
            />
          ) : (
            canManage && (
              <p className="text-xs text-slate-500">
                Ainda não há apresentação. Gere a partir do conteúdo do curso.
              </p>
            )
          )}
          {canManage && (
            <AiSlidesForm
              trainingId={course.id}
              hasSlides={(course.slides?.length ?? 0) > 0}
            />
          )}
        </div>
      )}

      {/* Leitura do conteúdo (alunos) — abaixo da apresentação, com ver mais/menos */}
      {!canManage && course.content && (
        <CourseContentReader content={course.content} />
      )}

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
                  <SubmitButton
                    pendingText="Removendo…"
                    className="text-[11px] text-slate-400 hover:text-red-500 disabled:opacity-60"
                  >
                    remover
                  </SubmitButton>
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
            <SubmitButton
              pendingText="Adicionando…"
              className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy disabled:opacity-60"
            >
              Adicionar material
            </SubmitButton>
          </div>
        </ResetForm>
      )}

      {/* Edição do conteúdo (gestor) + Salvar ao final da aba */}
      {canManage && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <AiContentForm trainingId={course.id} />
          <CourseContentEditor
            trainingId={course.id}
            content={course.content}
            canManage={true}
          />
        </div>
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
                  <SubmitButton
                    pendingText="Removendo…"
                    className="text-[11px] text-slate-400 hover:text-red-500 disabled:opacity-60"
                  >
                    remover
                  </SubmitButton>
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
            <SubmitButton
              pendingText="Adicionando…"
              className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy disabled:opacity-60"
            >
              Adicionar questão
            </SubmitButton>
          </ResetForm>

          {/* Salvar ao final da aba Avaliação */}
          <form action={touchCourseAction} className="mt-4 border-t border-slate-100 pt-4">
            <input type="hidden" name="training_id" value={course.id} />
            <SubmitButton
              pendingText="Salvando…"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              💾 Salvar
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );

  // ---- Aba Fórum ----
  const forumTab = (
    <div className="space-y-4">
      {/* Tutor de dúvidas */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
        <span className="text-sm text-slate-600">
          👤 Tutor de dúvidas:{" "}
          <strong className="text-azul-navy">
            {course.tutor_name ?? "não definido"}
          </strong>
        </span>
        {canManage && (
          <form action={setCourseTutorAction} className="flex items-center gap-2">
            <input type="hidden" name="training_id" value={course.id} />
            <select
              name="tutor_id"
              required
              defaultValue={course.tutor_id ?? ""}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-azul"
            >
              <option value="" disabled>
                — selecione o tutor (obrigatório) —
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <SubmitButton
              pendingText="Salvando…"
              className="rounded-lg border border-azul px-2 py-1 text-xs font-semibold text-azul hover:bg-azul hover:text-white disabled:opacity-60"
            >
              Definir
            </SubmitButton>
          </form>
        )}
      </div>

      <ResetForm action={addForumPostAction} className="space-y-2">
        <input type="hidden" name="training_id" value={course.id} />
        <textarea
          name="body"
          required
          rows={2}
          placeholder="Faça uma pergunta sobre este curso… (use @nome para marcar alguém)"
          className={field}
        />
        <SubmitButton
          pendingText="Publicando…"
          className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy disabled:opacity-60"
        >
          Publicar pergunta
        </SubmitButton>
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
          <p className="text-sm text-slate-700">
            <ForumBody text={question.body} />
          </p>

          <div className="mt-2 space-y-1 border-l-2 border-slate-100 pl-3">
            {answers.map((a) => (
              <div key={a.id} className="text-sm">
                <span className="text-[11px] font-semibold text-emerald-700">
                  ↳ {a.author_name}:
                </span>{" "}
                <span className="text-slate-700">
                  <ForumBody text={a.body} />
                </span>
                {a.quality != null && (
                  <span
                    className="ml-1 rounded-full bg-azul-suave/40 px-1.5 py-0.5 text-[10px] font-semibold text-azul-navy"
                    title="Qualidade da resposta avaliada por IA"
                  >
                    IA {a.quality}%
                  </span>
                )}
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
            <SubmitButton
              pendingText="Enviando…"
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Responder
            </SubmitButton>
          </ResetForm>
        </div>
      ))}

      {/* Avaliação do tutor e participantes (aluno que concluiu o curso) */}
      {canRate && (
        <form
          action={rateTrainingAction}
          className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3"
        >
          <input type="hidden" name="training_id" value={course.id} />
          <p className="text-sm font-semibold text-amber-800">
            ⭐ Avalie o tutor e os participantes do fórum (0 a 5)
          </p>
          <div className="space-y-1.5">
            {ratees.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-700">
                  {r.name}
                  {r.role === "TUTOR" && (
                    <span className="ml-1 rounded-full bg-azul-suave/40 px-1.5 py-0.5 text-[10px] font-semibold text-azul-navy">
                      tutor
                    </span>
                  )}
                </span>
                <input type="hidden" name="ratee" value={`${r.id}:${r.role}`} />
                <select
                  name={`score_${r.id}`}
                  defaultValue={
                    myRatings[r.id] != null ? String(myRatings[r.id]) : ""
                  }
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-azul"
                >
                  <option value="">— não avaliar —</option>
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} {"★".repeat(n)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <SubmitButton
            pendingText="Salvando…"
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            Salvar avaliação
          </SubmitButton>
        </form>
      )}

      {/* Salvar + Publicar Treinamento ao final da aba Fórum (gestor) */}
      {canManage && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <form action={touchCourseAction}>
            <input type="hidden" name="training_id" value={course.id} />
            <SubmitButton
              pendingText="Salvando…"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              💾 Salvar
            </SubmitButton>
          </form>
          <PublishCourseForm
            trainingId={course.id}
            published={course.published === true}
            missing={missing}
          />
        </div>
      )}
    </div>
  );

  // ---- Aba Acessos (quem acessou e quantas vezes) — visível a todos ----
  const acessos = (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-lg font-bold text-azul-navy">{accesses.length}</div>
          <div className="text-[10px] uppercase text-slate-400">
            Pessoas que acessaram
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-lg font-bold text-azul-navy">{totalAccesses}</div>
          <div className="text-[10px] uppercase text-slate-400">
            Total de acessos
          </div>
        </div>
      </div>
      {accesses.length === 0 ? (
        <p className="text-xs text-slate-400">Ninguém acessou este curso ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">Usuário</th>
                <th className="px-4 py-2 font-medium">Acessos</th>
                <th className="px-4 py-2 font-medium">Último acesso</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {accesses.map((a) => (
                <tr
                  key={a.user_id}
                  className={`border-b border-slate-100 last:border-0 ${
                    a.user_id === user.id ? "bg-azul-suave/10" : ""
                  }`}
                >
                  <td className="px-4 py-2 font-medium text-slate-700">{a.name}</td>
                  <td className="px-4 py-2 text-slate-600">{a.count}×</td>
                  <td className="px-4 py-2 text-slate-500">
                    {formatDateTime(a.last_viewed_at)}
                  </td>
                  <td className="px-4 py-2">
                    {a.passed ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        ✓ Concluído
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                        em andamento
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] text-slate-400">
        Quem já concluiu o curso pode revisitar o conteúdo para consulta quando
        quiser — os acessos continuam sendo registrados aqui.
      </p>
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
            <SubmitButton
              pendingText="Excluindo…"
              className="text-xs text-slate-400 hover:text-red-500 disabled:opacity-60"
            >
              excluir curso
            </SubmitButton>
          </form>
        )}
      </div>

      {/* Status de publicação (gestor) */}
      {canManage && (
        <div
          className={`mb-3 rounded-lg px-3 py-2 text-sm ${
            course.published
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {course.published ? (
            <>✓ Publicado — visível para os usuários.</>
          ) : (
            <>
              📝 Rascunho — não publicado.{" "}
              {missing.length > 0
                ? `Faltam: ${missing.join(", ")}.`
                : "Pronto para publicar na aba Fórum."}
            </>
          )}
        </div>
      )}

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
              Obrigatório
            </span>
          )}
          {/* Público-alvo: verticais e/ou equipe */}
          {(course.verticals?.length || course.group_name) && (
            <span className="rounded-full bg-azul-suave/40 px-2 py-0.5 text-[11px] font-medium text-azul-navy">
              🎯{" "}
              {[...(course.verticals ?? []), course.group_name]
                .filter(Boolean)
                .join(", ")}
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
          initialKey={searchParams.tab}
          tabs={[
            { key: "conteudo", label: `Conteúdo (${materials.length})`, content: conteudo },
            { key: "avaliacao", label: "Avaliação / Quiz", content: avaliacao },
            { key: "forum", label: `Fórum (${forum.length})`, content: forumTab },
            { key: "acessos", label: `Acessos (${accesses.length})`, content: acessos },
          ]}
        />
      </div>
    </div>
  );
}
