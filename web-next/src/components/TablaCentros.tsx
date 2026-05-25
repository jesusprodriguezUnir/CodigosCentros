"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Centro } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

type Props = {
  centros: Centro[];
};

const PAGE = 50;

export function TablaCentros({ centros }: Props) {
  const [visible, setVisible] = useState(PAGE);
  const [abierto, setAbierto] = useState<string | null>(null);

  const mostrar = centros.slice(0, visible);
  const haymas = visible < centros.length;

  return (
    <section className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-600">
            <tr className="text-left">
              <th className="w-8 py-3 pl-4" />
              <th className="py-3 pr-4 font-semibold">Centro</th>
              <th className="py-3 pr-4 font-semibold">Municipio</th>
              <th className="py-3 pr-4 font-semibold text-right">22/23</th>
              <th className="py-3 pr-4 font-semibold text-right">23/24</th>
              <th className="py-3 pr-4 font-semibold text-right">24/25</th>
              <th className="py-3 pr-4 font-semibold text-right">25/26</th>
              <th className="py-3 pr-4 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {mostrar.map((c) => {
              const v2526 =
                c.vacantes.c2526Rh09 + c.vacantes.c2526AnexoI + c.vacantes.c2526AnexoVia;
              const expandido = abierto === c.codigo;
              return (
                <FilaCentro
                  key={c.codigo}
                  centro={c}
                  v2526={v2526}
                  expandido={expandido}
                  onToggle={() => setAbierto(expandido ? null : c.codigo)}
                />
              );
            })}
            {mostrar.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-ink-500">
                  No hay centros que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {haymas && (
        <div className="border-t border-ink-100 bg-ink-50/60 p-3 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-madrid-700 shadow-soft ring-1 ring-ink-200 hover:bg-madrid-50"
          >
            Mostrar {Math.min(PAGE, centros.length - visible)} más
            <span className="ml-1.5 text-xs text-ink-500">
              ({formatNumber(centros.length - visible)} restantes)
            </span>
          </button>
        </div>
      )}
    </section>
  );
}

function FilaCentro({
  centro,
  v2526,
  expandido,
  onToggle,
}: {
  centro: Centro;
  v2526: number;
  expandido: boolean;
  onToggle: () => void;
}) {
  const v = centro.vacantes;
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "cursor-pointer transition-colors hover:bg-madrid-50/40",
          expandido && "bg-madrid-50/40"
        )}
      >
        <td className="py-3 pl-4 align-top text-ink-400">
          {expandido ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </td>
        <td className="py-3 pr-4 align-top">
          <Link
            href={`/centro/${centro.codigo}`}
            className="font-medium text-ink-900 hover:text-madrid-600 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {centro.centro}
          </Link>
          <p className="mt-0.5 text-xs text-ink-500 font-mono">{centro.codigo}</p>
        </td>
        <td className="py-3 pr-4 align-top text-ink-700">{centro.localidad}</td>
        <td className="py-3 pr-4 align-top text-right tabular-nums text-ink-700">
          {v.c2223}
        </td>
        <td className="py-3 pr-4 align-top text-right tabular-nums text-ink-700">
          {v.c2324}
        </td>
        <td className="py-3 pr-4 align-top text-right tabular-nums text-ink-700">
          {v.c2425}
        </td>
        <td className="py-3 pr-4 align-top text-right tabular-nums">
          <span
            className={cn(
              "inline-flex min-w-[2rem] justify-center rounded-md px-2 py-0.5 text-xs font-semibold",
              v2526 > 0
                ? "bg-madrid-50 text-madrid-700"
                : "bg-ink-100 text-ink-500"
            )}
          >
            {v2526}
          </span>
        </td>
        <td className="py-3 pr-4 align-top text-right tabular-nums font-semibold text-ink-900">
          {centro.total}
        </td>
      </tr>
      {expandido && (
        <tr className="bg-madrid-50/30">
          <td />
          <td colSpan={7} className="px-4 py-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Detalle label="RH09 — Adj. def. maestros" valor={v.c2526Rh09} />
              <Detalle label="Anexo I — CEIP ordinarias" valor={v.c2526AnexoI} />
              <Detalle label="Anexo VI.a — Bilingües" valor={v.c2526AnexoVia} />
            </div>
            <p className="mt-3 text-xs text-ink-500">
              Total 25/26:{" "}
              <span className="font-semibold text-ink-700">{v2526}</span> ·
              Histórico acumulado:{" "}
              <span className="font-semibold text-ink-700">{centro.total}</span>
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

function Detalle({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-bold text-ink-900">{valor}</p>
    </div>
  );
}
