"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin, X } from "lucide-react";
import type { Municipio } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { getSearchIndexSync, loadSearchIndex, type SearchIndexItem } from "@/lib/searchIndex";
import Fuse from "fuse.js";
import { FiltroProximidad, type Origen } from "./FiltroProximidad";

export type Orden =
  | "totalDesc"
  | "totalAsc"
  | "centroAsc"
  | "localidadAsc"
  | "v2526Desc"
  | "distAsc";

type Props = {
  texto: string;
  municipio: string;
  distrito: string;
  tipo: string;
  jornada: string;
  bilingue: boolean;
  excelencia: boolean;
  orden: Orden;
  origen: Origen | null;
  radio: number;
  municipios: Municipio[];
  distritos: string[];
  tipos: string[];
  jornadas: string[];
  resultados: number;
  onTexto: (v: string) => void;
  onMunicipio: (v: string) => void;
  onDistrito: (v: string) => void;
  onTipo: (v: string) => void;
  onJornada: (v: string) => void;
  onBilingue: (v: boolean) => void;
  onExcelencia: (v: boolean) => void;
  onOrden: (v: Orden) => void;
  onOrigen: (o: Origen | null) => void;
  onRadio: (km: number) => void;
  onLimpiar: () => void;
};

const ordenLabels: Record<Orden, string> = {
  totalDesc: "Total ↓",
  totalAsc: "Total ↑",
  v2526Desc: "25/26 ↓",
  centroAsc: "A→Z",
  localidadAsc: "Muni A→Z",
  distAsc: "Distancia ↑",
};

function formatJornada(j: string) {
  return j.charAt(0).toUpperCase() + j.slice(1);
}

export function Filtros({
  texto,
  municipio,
  distrito,
  tipo,
  jornada,
  bilingue,
  excelencia,
  orden,
  origen,
  radio,
  municipios,
  distritos,
  tipos,
  jornadas,
  resultados,
  onTexto,
  onMunicipio,
  onDistrito,
  onTipo,
  onJornada,
  onBilingue,
  onExcelencia,
  onOrden,
  onOrigen,
  onRadio,
  onLimpiar,
}: Props) {
  const hayFiltros = Boolean(
    texto || municipio || distrito || tipo || jornada || bilingue || excelencia || origen
  );
  const mostrarDistrito = municipio === "Madrid" && distritos.length > 0;

  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<SearchIndexItem[]>([]);
  const [fuseInstance, setFuseInstance] = useState<Fuse<SearchIndexItem> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        {/* Búsqueda */}
        <Campo label="Buscar">
          <div className="relative" ref={containerRef}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              ref={inputRef}
              type="search"
              value={texto}
              onChange={(e) => handleTextoChange(e.target.value)}
              onFocus={() => {
                if (fuseInstance && texto.trim()) {
                  const results = fuseInstance
                    .search(texto.trim(), { limit: 8 })
                    .map((r) => r.item);
                  setAutocompleteItems(results);
                  setAutocompleteOpen(true);
                }
              }}
              placeholder="Centro, código o municipio…"
              className="w-full rounded-lg border border-ink-200 bg-white py-1.5 pl-8 pr-2.5 text-sm placeholder:text-ink-400 focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
            />
            {autocompleteOpen && autocompleteItems.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-ink-200 bg-white shadow-lg">
                {autocompleteItems.map((item) => (
                  <button
                    key={item.codigo}
                    className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-madrid-50"
                    onClick={() => handleSelectAutocomplete(item.nombre)}
                  >
                    <div className="font-medium text-ink-900">{item.nombre}</div>
                    <div className="text-xs text-ink-500">
                      {item.municipio}
                      {item.distrito ? ` · ${item.distrito}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Campo>

        {/* Cercanía */}
        <Campo label="Cercanía">
          <FiltroProximidad
            key={origen?.label ?? "vacio"}
            origen={origen}
            radio={radio}
            onOrigen={onOrigen}
            onRadio={onRadio}
          />
        </Campo>
      </div>

      <div className="grid gap-3 border-t border-ink-100 p-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        {/* Municipio */}
        <Campo label="Municipio">
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <select
              value={municipio}
              onChange={(e) => onMunicipio(e.target.value)}
              className="w-full appearance-none rounded-lg border border-ink-200 bg-white py-1.5 pl-8 pr-6 text-sm focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
            >
              <option value="">Todos</option>
              {municipios.map((m) => (
                <option key={m.nombre} value={m.nombre}>
                  {m.nombre} ({m.centros})
                </option>
              ))}
            </select>
          </div>
        </Campo>

        {/* Distrito (solo Madrid) */}
        {mostrarDistrito && (
          <Campo label="Distrito">
            <select
              value={distrito}
              onChange={(e) => onDistrito(e.target.value)}
              className="w-full appearance-none rounded-lg border border-ink-200 bg-white py-1.5 px-2.5 text-sm focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
            >
              <option value="">Todos</option>
              {distritos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Campo>
        )}

        {/* Tipo */}
        <Campo label="Tipo">
          <select
            value={tipo}
            onChange={(e) => onTipo(e.target.value)}
            className="w-full appearance-none rounded-lg border border-ink-200 bg-white py-1.5 px-2.5 text-sm focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Campo>

        {/* Jornada */}
        <Campo label="Jornada">
          <select
            value={jornada}
            onChange={(e) => onJornada(e.target.value)}
            className="w-full appearance-none rounded-lg border border-ink-200 bg-white py-1.5 px-2.5 text-sm focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
          >
            <option value="">Todas</option>
            {jornadas.map((j) => (
              <option key={j} value={j}>
                {formatJornada(j)}
              </option>
            ))}
          </select>
        </Campo>

        {/* Toggles + orden */}
        <Campo label="Más filtros">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onBilingue(!bilingue)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                bilingue
                  ? "border-madrid-600 bg-madrid-600 text-white"
                  : "border-ink-200 bg-white text-ink-600 hover:border-madrid-400"
              )}
            >
              Bilingüe
            </button>
            <button
              type="button"
              onClick={() => onExcelencia(!excelencia)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                excelencia
                  ? "border-madrid-600 bg-madrid-600 text-white"
                  : "border-ink-200 bg-white text-ink-600 hover:border-madrid-400"
              )}
            >
              Excelencia
            </button>
          </div>
        </Campo>

        <Campo label="Ordenar por">
          <select
            value={orden}
            onChange={(e) => onOrden(e.target.value as Orden)}
            className="w-full appearance-none rounded-lg border border-ink-200 bg-white py-1.5 px-2.5 text-sm focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
          >
            {(Object.entries(ordenLabels) as [Orden, string][])
              .filter(([k]) => k !== "distAsc" || origen)
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
        </Campo>
      </div>

      {/* Chips de filtros activos + limpiar + resultados */}
      <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 px-4 py-2.5">
        {hayFiltros && (
          <>
            {texto && (
              <Chip onRemove={() => onTexto("")}>“{texto}”</Chip>
            )}
            {municipio && (
              <Chip onRemove={() => onMunicipio("")}>{municipio}</Chip>
            )}
            {distrito && (
              <Chip onRemove={() => onDistrito("")}>{distrito}</Chip>
            )}
            {tipo && <Chip onRemove={() => onTipo("")}>{tipo}</Chip>}
            {jornada && (
              <Chip onRemove={() => onJornada("")}>Jornada: {formatJornada(jornada)}</Chip>
            )}
            {bilingue && <Chip onRemove={() => onBilingue(false)}>Bilingüe</Chip>}
            {excelencia && <Chip onRemove={() => onExcelencia(false)}>Excelencia</Chip>}
            {origen && (
              <Chip onRemove={() => onOrigen(null)}>
                A {radio} km de {origen.label}
              </Chip>
            )}
            <button
              type="button"
              onClick={onLimpiar}
              className="ml-auto inline-flex items-center gap-1 rounded-lg p-1.5 text-xs font-medium text-ink-500 hover:bg-madrid-50 hover:text-madrid-600"
              aria-label="Limpiar todos los filtros"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar todo
            </button>
          </>
        )}
        <p className={cn("text-xs text-ink-600", hayFiltros ? "" : "ml-auto")}>
          <span className="font-semibold text-ink-900">{formatNumber(resultados)}</span>{" "}
          centros
        </p>
      </div>
    </section>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-madrid-50 px-2.5 py-1 text-xs font-medium text-madrid-700 ring-1 ring-madrid-200">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-madrid-100"
        aria-label="Quitar filtro"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
