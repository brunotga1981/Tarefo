import Link from "next/link";
import {
  type RACItem,
  type RACSummary,
  SENTIMENT_COLOR,
  SENTIMENT_LABEL,
} from "@/lib/rac";
import { formatDate } from "@/lib/format";

const ITEM_BORDER: Record<string, string> = {
  promoter: "border-l-emerald-500",
  neutral: "border-l-amber-400",
  detractor: "border-l-orange-500",
};

export function RAC({
  items,
  summary,
}: {
  items: RACItem[];
  summary: RACSummary;
}) {
  return (
    <div className="grid h-[68vh] grid-cols-1 gap-4 p-4 md:grid-cols-2">
      {/* Lista compacta de atendimentos e tarefas */}
      <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
          <h3 className="text-sm font-semibold text-azul-navy">
            Atendimentos e Tarefas
          </h3>
          <span className="text-[11px] text-slate-400">últimos 90 dias</span>
        </div>
        <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="p-3 text-xs text-slate-400">
              Nenhum atendimento ou tarefa no período.
            </p>
          )}
          {items.map((it, i) => {
            const inner = (
              <div
                className={`rounded-md border border-slate-100 border-l-4 ${ITEM_BORDER[it.sentiment]} bg-white px-3 py-2`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-700">
                    {it.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white ${SENTIMENT_COLOR[it.sentiment]}`}
                  >
                    {SENTIMENT_LABEL[it.sentiment]}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {it.kind} · {it.subtitle}
                  </span>
                  <span>{formatDate(it.date)}</span>
                </div>
              </div>
            );
            return it.href ? (
              <Link key={i} href={it.href} className="block hover:opacity-80">
                {inner}
              </Link>
            ) : (
              <div key={i}>{inner}</div>
            );
          })}
        </div>
      </div>

      {/* Termômetro + análise */}
      <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 p-4">
        <h3 className="mb-2 text-sm font-semibold text-azul-navy">
          Termômetro do cliente
        </h3>
        <div className="flex flex-1 gap-5 overflow-y-auto">
          <Thermometer temperature={summary.temperature} zone={summary.zone} />
          <div className="flex-1">
            <div className="mb-3 flex gap-3 text-center">
              <Stat label="Promotor" value={summary.promoters} color="text-emerald-600" />
              <Stat label="Neutro" value={summary.neutrals} color="text-amber-600" />
              <Stat label="Detrator" value={summary.detractors} color="text-orange-600" />
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              {summary.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex-1 rounded-lg bg-slate-50 py-2">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase text-slate-400">{label}</div>
    </div>
  );
}

function Thermometer({
  temperature,
  zone,
}: {
  temperature: number;
  zone: string;
}) {
  const fill =
    zone === "promoter"
      ? "bg-emerald-500"
      : zone === "neutral"
        ? "bg-amber-400"
        : "bg-orange-500";
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl">🌡️</span>
      <div className="relative my-2 h-40 w-5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`absolute bottom-0 w-full ${fill} transition-all`}
          style={{ height: `${temperature}%` }}
        />
      </div>
      <div className={`h-6 w-6 rounded-full ${fill}`} />
      <span className="mt-1 text-sm font-bold text-slate-700">
        {temperature}°
      </span>
    </div>
  );
}
