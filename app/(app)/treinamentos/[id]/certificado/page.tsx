export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCourse, getCompletion } from "@/lib/lms";
import { formatDate } from "@/lib/format";
import { PrintClient } from "@/components/PrintClient";

export default async function CertificadoPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const course = await getCourse(params.id);
  if (!course) notFound();
  const completion = await getCompletion(course.id, user.id);

  if (!completion || !completion.passed) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Você precisa ser aprovado no quiz (≥ 70%) para emitir o certificado.
        </p>
        <Link
          href={`/treinamentos/${course.id}`}
          className="mt-3 inline-block text-sm text-azul hover:underline"
        >
          ← Voltar ao curso
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/treinamentos/${course.id}`}
          className="text-sm text-slate-400 hover:text-azul"
        >
          ← Voltar ao curso
        </Link>
        <PrintClient />
      </div>

      {/* Certificado */}
      <div className="relative overflow-hidden rounded-2xl border-4 border-azul-navy bg-white p-10 text-center shadow-lg">
        <div className="absolute inset-0 border-8 border-azul-suave/20" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="flex items-center justify-center gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-azul.png" alt="Azul Administradora" className="h-16 w-auto" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tga.png" alt="TGA Empreendimentos" className="h-12 w-auto" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-azul-navy">
          Certificado de Conclusão
        </h1>
        <p className="mt-6 text-slate-600">Certificamos que</p>
        <p className="mt-1 text-2xl font-bold text-slate-800">{user.name}</p>
        <p className="mt-4 text-slate-600">
          concluiu com aproveitamento o treinamento
        </p>
        <p className="mt-1 text-xl font-semibold text-azul-navy">
          “{course.title}”
        </p>
        <p className="mt-4 text-slate-600">
          com aproveitamento de{" "}
          <strong className="text-emerald-600">{completion.score}%</strong>.
        </p>
        <div className="mt-10 flex items-center justify-between text-sm text-slate-500">
          <div>
            <div className="mx-auto w-48 border-t border-slate-300 pt-1">
              Azul Administradora
            </div>
          </div>
          <div className="text-right">
            Emitido em
            <br />
            <strong>{formatDate(completion.completed_at)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
