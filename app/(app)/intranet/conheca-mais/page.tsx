export const dynamic = "force-dynamic";

export default function ConhecaMaisPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-navy">Conheça Mais</h1>
      <p className="mb-6 text-sm text-slate-500">
        Informações institucionais da Azul Administradora — Smart Living.
      </p>

      <div className="space-y-4">
        <Card title="Quem somos">
          A <strong>Azul Administradora</strong> atua na administração de
          condomínios com foco em <em>Smart Living</em> — tecnologia, agilidade e
          proximidade no relacionamento com clientes e moradores.
        </Card>
        <Card title="Missão">
          Simplificar a gestão condominial com organização, transparência e
          comunicação eficiente, entregando tranquilidade aos nossos clientes.
        </Card>
        <Card title="Visão">
          Ser referência em administração inteligente de condomínios, reconhecida
          pela excelência no atendimento e pela inovação.
        </Card>
        <Card title="Valores">
          <ul className="list-inside list-disc space-y-1">
            <li>Foco no cliente</li>
            <li>Transparência</li>
            <li>Agilidade e organização</li>
            <li>Trabalho em equipe</li>
            <li>Inovação</li>
          </ul>
        </Card>

        <p className="text-xs text-slate-400">
          Conteúdo institucional de exemplo — pode ser editado conforme o material
          oficial da empresa.
        </p>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-2 text-sm font-semibold uppercase text-azul">{title}</h2>
      <div className="text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
