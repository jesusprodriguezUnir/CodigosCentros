"use client";

import { Search, MapPin, ArrowDownUp, X } from "lucide-react";
import type { Municipio } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

export type Orden = "totalDesc" | "totalAsc" | "centroAsc" | "localidadAsc" | "v2526Desc";

type Props = {
  texto: string;
  municipio: string;
  tipo: string;
  bilingue: boolean;
  orden: Orden;
  municipios: Municipio[];
  tipos: string[];
  resultados: number;
  onTexto: (v: string) => void;
  onMunicipio: (v: string) => void;
  onTipo: (v: string) => void;
  onBilingue: (v: boolean) => void;
  onOrden: (v: Orden) => void;
  onLimpiar: () => void;
};

export function Filtros({
  texto,
  municipio,
  tipo,
  bilingue,
  orden,
  municipios,
  tipos,
  resultados,
  onTexto,
  onMunicipio,
  onTipo,
  onBilingue,
  onOrden,
  onLimpiar,
}: Props) {
  const hayFiltros = Boolean(texto || municipio || tipo || bilingue);

  return (
    <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-soft">
      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-4 relative">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Buscar centro o código
          </label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={texto}
              onChange={(e) => onTexto(e.target.value)}
              placeholder="Ej. CEIP Antonio de Nebrija o 28000054"
              className="w-full rounded-lg border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-ink-400 focus:border-madrid-600 focus:outline-none focus:ring-4 focus:ring-madrid-600/15"
            />
          </div>
        </div>

        <div className="md:col-span-3">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Municipio
          </label>
          <div className="relative mt-1">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <select
              value={municipio}
              onChange={(e) => onMunicipio(e.target.value)}
              className="w-full appearance-none rounded-lg border border-ink-200 bg-white py-2.5 pl-9 pr-8 text-sm focus:border-madrid-600 focus:outline-none focus:ring-4 focus:ring-madrid-600/15"
            >
              <option value="">Todos ({municipios.length})</option>
              {municipios.map((m) => (
                <option key={m.nombre} value={m.nombre}>
                  {m.nombre} ({m.centros})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => onTipo(e.target.value)}
            className="mt-1 w-full appearance-none rounded-lg border border-ink-200 bg-white py-2.5 px-3 text-sm focus:border-madrid-600 focus:outline-none focus:ring-4 focus:ring-madrid-600/15"
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-1 flex flex-col justify-end">
          <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm">
            <input
              type="checkbox"
              checked={bilingue}
              onChange={(e) => onBilingue(e.target.checked)}
              className="accent-madrid-600"
            />
            Solo bilingüe
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Ordenar
          </label>
          <div className="relative mt-1">
            <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <select
              value={orden}
              onChange={(e) => onOrden(e.target.value as Orden)}
              className="w-full appearance-none rounded-lg border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-madrid-600 focus:outline-none focus:ring-4 focus:ring-madrid-600/15"
            >
              <option value="totalDesc">Total ↓</option>
              <option value="totalAsc">Total ↑</option>
              <option value="v2526Desc">Vacantes 25/26 ↓</option>
              <option value="centroAsc">Centro A→Z</option>
              <option value="localidadAsc">Municipio A→Z</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-ink-600">
          <span className="font-semibold text-ink-900">{formatNumber(resultados)}</span>{" "}
          centros encontrados
        </p>
        <button
          type="button"
          onClick={onLimpiar}
          disabled={!hayFiltros}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            hayFiltros
              ? "text-madrid-700 hover:bg-madrid-50"
              : "text-ink-300 cursor-not-allowed"
          )}
        >
          <X className="h-3.5 w-3.5" />
          Limpiar filtros
        </button>
      </div>
    </section>
  );
}
