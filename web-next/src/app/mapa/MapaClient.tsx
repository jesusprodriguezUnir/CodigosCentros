"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import type { Centro } from "@/lib/types";
import { normalizar } from "@/lib/utils";

// Leaflet no funciona en SSR
const MapaLeaflet = dynamic(() => import("./MapaLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center bg-ink-50 text-sm text-ink-500">
      Cargando mapa…
    </div>
  ),
});

interface Props {
  centros: Centro[];
}

export function MapaClient({ centros }: Props) {
  const [texto, setTexto] = useState("");
  const [dat, setDat] = useState("");

  const dats = useMemo(
    () =>
      Array.from(new Set(centros.map((c) => c.dat).filter(Boolean) as string[])).sort(),
    [centros]
  );

  const filtrados = useMemo(() => {
    const t = normalizar(texto.trim());
    return centros.filter((c) => {
      if (c.lat == null || c.lng == null) return false;
      if (dat && c.dat !== dat) return false;
      if (
        t &&
        !normalizar(c.centro).includes(t) &&
        !normalizar(c.localidad ?? "").includes(t)
      )
        return false;
      return true;
    });
  }, [centros, texto, dat]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white border-b border-ink-200 shrink-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar centro o municipio…"
            className="rounded-lg border border-ink-200 py-1.5 pl-8 pr-3 text-sm focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15 w-64"
          />
        </div>
        <select
          value={dat}
          onChange={(e) => setDat(e.target.value)}
          className="rounded-lg border border-ink-200 bg-white py-1.5 px-3 text-sm focus:border-madrid-600 focus:outline-none"
        >
          <option value="">Todas las DAT</option>
          {dats.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-500 ml-auto">
          {filtrados.length.toLocaleString("es-ES")} centros con coordenadas
        </p>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        <MapaLeaflet centros={filtrados} />
      </div>
    </div>
  );
}
