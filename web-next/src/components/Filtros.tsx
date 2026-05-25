"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin, ArrowDownUp, X } from "lucide-react";
import type { Municipio } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { getSearchIndexSync, loadSearchIndex, type SearchIndexItem } from "@/lib/searchIndex";
import Fuse from "fuse.js";

export type Orden = "totalDesc" | "totalAsc" | "centroAsc" | "localidadAsc" | "v2526Desc";

type Props = {
  texto: string;
  municipio: string;
  distrito: string;
  tipo: string;
  bilingue: boolean;
  orden: Orden;
  municipios: Municipio[];
  distritos: string[];
  tipos: string[];
  resultados: number;
  onTexto: (v: string) => void;
  onMunicipio: (v: string) => void;
  onDistrito: (v: string) => void;
  onTipo: (v: string) => void;
  onBilingue: (v: boolean) => void;
  onOrden: (v: Orden) => void;
  onLimpiar: () => void;
};

export function Filtros({
  texto,
  municipio,
  distrito,
  tipo,
  bilingue,
  orden,
  municipios,
  distritos,
  tipos,
  resultados,
  onTexto,
  onMunicipio,
  onDistrito,
  onTipo,
  onBilingue,
  onOrden,
  onLimpiar,
}: Props) {
  const hayFiltros = Boolean(texto || municipio || distrito || tipo || bilingue);
  const mostrarDistrito = municipio === "Madrid" && distritos.length > 0;

  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<SearchIndexItem[]>([]);
  const [fuseInstance, setFuseInstance] = useState<Fuse<SearchIndexItem> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing = getSearchIndexSync();
    if (existing) {
      setFuseInstance(existing);
    } else {
      loadSearchIndex().then((fuse) => setFuseInstance(fuse));
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAutocompleteOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleTextoChange = (v: string) => {
    onTexto(v);
    if (fuseInstance && v.trim()) {
      const results = fuseInstance.search(v.trim(), { limit: 8 }).map((r) => r.item);
      setAutocompleteItems(results);
      setAutocompleteOpen(true);
    } else {
      setAutocompleteOpen(false);
    }
  };

  const handleSelectAutocomplete = (nombre: string) => {
    onTexto(nombre);
    setAutocompleteOpen(false);
  };

  const activeChips: Array<{ label: string; onClear: () => void }> = [];
  if (texto) activeChips.push({ label: `Texto: "${texto}"`, onClear: () => onTexto("") });
  if (municipio) activeChips.push({ label: `Municipio: ${municipio}`, onClear: () => onMunicipio("") });
  if (distrito) activeChips.push({ label: `Distrito: ${distrito}`, onClear: () => onDistrito("") });
  if (tipo) activeChips.push({ label: `Tipo: ${tipo}`, onClear: () => onTipo("") });
  if (bilingue) activeChips.push({ label: "Bilingüe", onClear: () => onBilingue(false) });

  return (
    <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-soft">
      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-4 relative" ref={containerRef}>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Buscar centro o código
          </label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              ref={inputRef}
              type="search"
              value={texto}
              onChange={(e) => handleTextoChange(e.target.value)}
              onFocus={() => {
                if (fuseInstance && texto.trim()) {
                  const results = fuseInstance.search(texto.trim(), { limit: 8 }).map((r) => r.item);
                  setAutocompleteItems(results);
                  setAutocompleteOpen(true);
                }
              }}
              placeholder="Ej. CEIP Antonio de Nebrija o 28000054"
              className="w-full rounded-lg border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-ink-400 focus:border-madrid-600 focus:outline-none focus:ring-4 focus:ring-madrid-600/15"
            />
            {autocompleteOpen && autocompleteItems.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-ink-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {autocompleteItems.map((item) => (
                  <button
                    key={item.codigo}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-madrid-50 transition-colors"
                    onClick={() => handleSelectAutocomplete(item.nombre)}
                  >
                    <div className="font-medium text-ink-900">{item.nombre}</div>
                    <div className="text-xs text-ink-500">
                      {item.municipio}{item.distrito ? ` · ${item.distrito}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
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

      {mostrarDistrito && (
        <div className="mt-3 grid gap-4 md:grid-cols-12">
          <div className="md:col-span-4 md:col-start-5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              Distrito de Madrid
            </label>
            <div className="relative mt-1">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <select
                value={distrito}
                onChange={(e) => onDistrito(e.target.value)}
                className="w-full appearance-none rounded-lg border border-ink-200 bg-white py-2.5 pl-9 pr-8 text-sm focus:border-madrid-600 focus:outline-none focus:ring-4 focus:ring-madrid-600/15"
              >
                <option value="">Todos ({distritos.length})</option>
                {distritos.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeChips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-madrid-50 border border-madrid-200 px-2.5 py-1 text-xs font-medium text-madrid-700"
            >
              {chip.label}
              <button
                onClick={chip.onClear}
                className="ml-0.5 text-madrid-500 hover:text-madrid-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

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
