"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Check, SearchX } from "lucide-react";
import type { Centro } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { Sparkline } from "./Sparkline";
import { useConcursilloStore } from "@/lib/store/concursillo";

export type CentroEnTabla = Centro & { distanciaKm?: number };

type Props = {
  centros: CentroEnTabla[];
  mostrarDistancia?: boolean;
  onLimpiar?: () => void;
};

const PAGE = 50;

export function TablaCentros({ centros, mostrarDistancia = false, onLimpiar }: Props) {
  const [visible, setVisible] = useState(PAGE);
  const [abierto, setAbierto] = useState<string | null>(null);

  const mostrar = centros.slice(0, visible);
  const haymas = visible < centros.length;
  const colSpan = mostrarDistancia ? 11 : 10;

  if (centros.length === 0) {
    return (
      <section className="rounded-xl border border-ink-200 bg-white p-12 text-center shadow-soft">
        <SearchX className="mx-auto mb-3 h-10 w-10 text-ink-300" />
        <p className="font-display text-lg font-semibold text-ink-900">
          No hay centros con esos filtros
        </p>
        <p className="mt-1 text-sm text-ink-500">
          Prueba a ampliar el radio, cambiar de municipio o quitar algún filtro.
        </p>
        {onLimpiar && (
          <button
            type="button"
            onClick={onLimpiar}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-madrid-600 px-4 py-2 text-sm font-medium text-white hover:bg-madrid-700"
          >
            Limpiar filtros
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-600">
            <tr className="text-left">
              <th className="w-8 py-3 pl-4" />
              <th className="py-3 pr-4 font-semibold">Centro</th>
              <th className="py-3 pr-4 font-semibold">Municipio</th>
              {mostrarDistancia && (
                <th className="py-3 pr-4 text-right font-semibold">Distancia</th>
              )}
              <th className="py-3 pr-4 font-semibold text-right hidden sm:table-cell">22/23</th>
              <th className="py-3 pr-4 font-semibold text-right hidden sm:table-cell">23/24</th>
              <th className="py-3 pr-4 font-semibold text-right hidden sm:table-cell">24/25</th>
              <th className="py-3 pr-4 font-semibold text-right">25/26</th>
              <th className="py-3 pr-4 font-semibold text-right hidden sm:table-cell">Total</th>
              <th className="py-3 pr-4 font-semibold text-center">Tendencia</th>
              <th className="w-10 py-3 pr-4" />{/* Lista action */}
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
                  mostrarDistancia={mostrarDistancia}
                  colSpan={colSpan}
                />
              );
            })}
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
  mostrarDistancia,
  colSpan,
}: {
  centro: CentroEnTabla;
  v2526: number;
  expandido: boolean;
  onToggle: () => void;
  mostrarDistancia: boolean;
  colSpan: number;
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
            className="font-medium text-ink-900 transition-colors hover:text-madrid-600"
            onClick={(e) => e.stopPropagation()}
          >
            {centro.centro}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs text-ink-500">{centro.codigo}</span>
            {centro.jornada && (
              <span className="inline-flex items-center rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-600">
                {centro.jornada}
              </span>
            )}
            {centro.bilingue && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700 ring-1 ring-blue-200">
                Bilingüe
              </span>
            )}
            {centro.programas_excelencia &&
              Object.values(centro.programas_excelencia).some(Boolean) && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                Excelencia
              </span>
            )}
          </div>
        </td>
        <td className="py-3 pr-4 align-top text-ink-700">{centro.localidad}</td>
        {mostrarDistancia && (
          <td className="py-3 pr-4 text-right align-top font-mono text-xs tabular-nums text-madrid-700">
            {centro.distanciaKm != null ? `${centro.distanciaKm.toFixed(1)} km` : "—"}
          </td>
        )}
        <td className="hidden sm:table-cell py-3 pr-4 align-top text-right tabular-nums text-ink-700">
          {v.c2223}
        </td>
        <td className="hidden sm:table-cell py-3 pr-4 align-top text-right tabular-nums text-ink-700">
          {v.c2324}
        </td>
        <td className="hidden sm:table-cell py-3 pr-4 align-top text-right tabular-nums text-ink-700">
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
        <td className="hidden sm:table-cell py-3 pr-4 align-top text-right tabular-nums font-semibold text-ink-900">
          {centro.total}
        </td>
        <td className="py-3 pr-4 align-top">
          <Sparkline valores={[v.c2223, v.c2324, v.c2425, v2526]} />
        </td>
        <td className="py-3 pr-4 align-top">
          <BotonLista centro={centro} />
        </td>
      </tr>
      {expandido && (
        <tr className="bg-madrid-50/30">
          <td />
          <td colSpan={colSpan - 1} className="px-4 py-4 animate-fade-in">
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

function BotonLista({ centro }: { centro: Centro }) {
  const enLista = useConcursilloStore((s) => s.miOrden.some((x) => x.codigo === centro.codigo));
  const { addCentro, removeCentro } = useConcursilloStore();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (enLista) {
          removeCentro(centro.codigo);
        } else {
          addCentro(centro);
        }
      }}
      className={cn(
        "flex items-center justify-center rounded-full p-1.5 transition-colors",
        enLista
          ? "bg-madrid-600 text-white hover:bg-madrid-700"
          : "text-ink-300 hover:text-madrid-600 hover:bg-madrid-50"
      )}
      aria-label={enLista ? "Quitar de mi lista" : "Añadir a mi lista"}
    >
      {enLista ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
    </button>
  );
}
