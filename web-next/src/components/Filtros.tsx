"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin, X } from "lucide-react";
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

const ordenLabels: Record<Orden, string> = {
  totalDesc: "Total ↓",
  totalAsc: "Total ↑",
  v2526Desc: "25/26 ↓",
  centroAsc: "A→Z",
  localidadAsc: "Muni A→Z",
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
    // Carga del índice (síncrona si ya está en memoria, async si no).
    const existing = getSearchIndexSync();
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return (
    <section className="rounded-xl border border-ink-200 bg-white shadow-soft">
      <div className="flex flex-wrap items-center gap-2 p-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]" ref={containerRef}>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
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
            placeholder="Buscar centro o código…"
            className="w-full rounded-lg border border-ink-200 bg-white py-1.5 pl-8 pr-2.5 text-sm placeholder:text-ink-400 focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
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

        {/* Municipio */}
        <div className="relative min-w-[140px]">
          <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <select
            value={municipio}
            onChange={(e) => onMunicipio(e.target.value)}
            className="w-full appearance-none rounded-lg border border-ink-200 bg-white py-1.5 pl-8 pr-6 text-sm focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
          >
            <option value="">Municipio</option>
            {municipios.map((m) => (
              <option key={m.nombre} value={m.nombre}>
                {m.nombre} ({m.centros})
              </option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <select
          value={tipo}
          onChange={(e) => onTipo(e.target.value)}
          className="min-w-[100px] appearance-none rounded-lg border border-ink-200 bg-white py-1.5 px-2.5 text-sm focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
        >
          <option value="">Tipo</option>
          {tipos.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Bilingüe toggle */}
        <button
          type="button"
          onClick={() => onBilingue(!bilingue)}
          className={cn(
            "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
            bilingue
              ? "bg-madrid-600 text-white border-madrid-600"
              : "bg-white text-ink-600 border-ink-200 hover:border-madrid-400"
          )}
        >
          Bilingüe
        </button>

        {/* Orden */}
        <select
          value={orden}
          onChange={(e) => onOrden(e.target.value as Orden)}
          className="min-w-[80px] appearance-none rounded-lg border border-ink-200 bg-white py-1.5 px-2.5 text-sm focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
        >
          {Object.entries(ordenLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Limpiar */}
        {hayFiltros && (
          <button
            type="button"
            onClick={onLimpiar}
            className="inline-flex items-center gap-1 rounded-lg p-1.5 text-ink-400 hover:text-madrid-600 hover:bg-madrid-50 transition-colors"
            aria-label="Limpiar filtros"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Distrito (Madrid) */}
      {mostrarDistrito && (
        <div className="px-3 pb-3">
          <select
            value={distrito}
            onChange={(e) => onDistrito(e.target.value)}
            className="w-full appearance-none rounded-lg border border-ink-200 bg-white py-1.5 px-2.5 text-sm focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
          >
            <option value="">Distrito de Madrid</option>
            {distritos.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {/* Resultados */}
      <div className="border-t border-ink-100 px-3 py-2 flex items-center justify-between">
        <p className="text-xs text-ink-600">
          <span className="font-semibold text-ink-900">{formatNumber(resultados)}</span> centros encontrados
        </p>
      </div>
    </section>
  );
}
